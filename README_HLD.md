# 🏨 Room Booking Platform — High Level Design (HLD)

## 1. Overview

This document describes a **multi-region, fault-tolerant Room Booking Platform**.  
The platform supports:

- User registration and authentication
- Room discovery and filtered search
- Booking & cancellation flows
- Viewing booking history

The system is designed for:

- **Global availability consistency** (no double bookings)
- **Low-latency user experience** (EU & US hosting)
- **Operational resilience and scalability**

---

## 2. High-Level Architecture

### Key Principles

- **One global domain**: `my-booking.com`
- **Users are served from their region** (EU or US)
- **Room availability is global**, ensuring a **single source of truth**
- **User data and bookings follow data residency rules** (stored per-region)

### Component Overview

| Layer            | Technology                                      | Purpose                                                            |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| CDN & Routing    | CloudFront + Lambda@Edge                        | Determines user’s region and routes requests accordingly           |
| Frontend         | Next.js (SSR + CSR)                             | SEO-friendly room listings, fast UX, hydration for dynamic pages   |
| Backend Services | Node.js on EKS                                  | Booking, Rooms, Auth, Notification, Search                         |
| Regional DBs     | Aurora MySQL (EU + US)                          | User accounts & booking records (regional)                         |
| Global DB        | Aurora Global MySQL                             | Room catalog & availability (single source of truth)               |
| Cache            | **Global Redis (ElastiCache Global Datastore)** | Cached views for availability & search                             |
| Search           | OpenSearch                                      | Scalable search index for room discovery                           |
| Messaging        | SNS + SQS                                       | Decoupled async propagation (cache invalidation, indexing, emails) |
| Payments         | **Simplified Payment Service**                  | Tokenized card handling                                            |

### Architecture Diagram

![Architecture](./room_booking_architecture.png)

```mermaid
flowchart TB

%% ENTRY & EDGE LAYER
U[User Browser] --> CF[CloudFront]
CF --> WAF["AWS WAF\nLayer 7 Filtering"]
WAF --> LE["Lambda@Edge\nRead JWT.claim(region)\nChoose Region"]
CF -->|Static & Room Images| S3[S3 Bucket\nRoom Images]

%% REGION ROUTING
LE -->|region = EU| ALB_EU["ALB (EU Region)"]
LE -->|region = US| ALB_US["ALB (US Region)"]

%% REGIONAL COMPUTE (same services in each region)
subgraph REGIONAL["Per-Region Services (Replicated in EU & US)"]
  EKS_RG["EKS Cluster\n(Deployment Unit)"]
  AUTH[Auth Service]
  BOOKING[Booking Service]
  INVENTORY[Availability/Inventory Service]
  SEARCH[Search Service]
  NOTIFY[Notification Service]
  DB_REG[(Aurora MySQL\nusers + bookings per-region)]
end

ALB_EU --> EKS_RG
ALB_US --> EKS_RG

%% SERVICE RELATIONSHIPS WITH REGIONAL DB
AUTH --> DB_REG
BOOKING --> DB_REG

%% GLOBAL SHARED COMPONENTS (single logical source of truth)
subgraph GLOBAL["Global Shared Services (Not Region-Specific)"]
  ROOMS[(Aurora Global MySQL\nrooms + availability)]
  REDIS[(Redis Global Datastore)]
  OS[(OpenSearch Index)]
  SNS[(SNS Topics)]
  Q_INV[Cache Invalidation SQS]
  Q_EMAIL[Email Notification SQS]
end

%% SERVICES THAT READ/WRITE GLOBAL DATA
INVENTORY --> ROOMS
BOOKING --> ROOMS

%% CACHING
INVENTORY --> REDIS
BOOKING --> REDIS
SEARCH --> REDIS
SEARCH --> OS

%% IMAGES STORAGE
INVENTORY --> S3

%% EVENTS
BOOKING --> SNS
INVENTORY --> SNS

SNS --> Q_INV
SNS --> Q_EMAIL

Q_INV --> INVENTORY
Q_EMAIL --> NOTIFY

```

---

## 3. Why SSR (Next.js) + Region Routing

| Requirement                             | Why SSR Helps                             |
| --------------------------------------- | ----------------------------------------- |
| **SEO for public room pages**           | HTML is fully rendered server-side        |
| **Fast first page load**                | No initial SPA "loading spinner"          |
| **Authentication via HttpOnly cookies** | SSR layer can read session state securely |
| **Multi-region hosting**                | Rendering happens close to the user       |

**Rendering Strategy**
| Page Type | Render Mode | Reason |
|----------|-------------|--------|
| Room page `/rooms/:id` | **SSR / Server Components** | SEO + fast render |
| Search results | **SSR for initial load + CSR hydration** | Performance + interactivity |
| Booking flow | **Client-side only** | Payment UI and PCI compliance |
| User dashboard | **SSR + cookie auth** | Fast & secure account views |

---

## 4. Authentication

Uses **HttpOnly, Secure, SameSite=Lax cookies** for access + refresh tokens.  
Works seamlessly with **SSR** and prevents XSS session theft.

---

## 5. Database Schema

### Users

```sql
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### Rooms

```sql
CREATE TABLE rooms (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  location JSON NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  capacity INT NOT NULL,
  amenities JSON,
  images JSON,
  INDEX idx_price (price),
  INDEX idx_capacity (capacity)
);
```

### Availability (Global)

```sql
CREATE TABLE availability (
  room_id BIGINT NOT NULL,
  date DATE NOT NULL,
  status ENUM('available','held','booked') NOT NULL DEFAULT 'available',
  hold_expires_at DATETIME NULL,
  version INT DEFAULT 0,
  PRIMARY KEY (room_id, date)
);
```

### Bookings (Regional)

```sql
CREATE TABLE bookings (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  room_id BIGINT NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  guests INT NOT NULL,
  status ENUM('PENDING','CONFIRMED','CANCELLED','EXPIRED') DEFAULT 'PENDING',
  total_price DECIMAL(10,2) NOT NULL,
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  payment_intent_id VARCHAR(255),
  INDEX idx_user (user_id),
  INDEX idx_room_dates (room_id, check_in, check_out)
);
```

---

## 6. Concurrency Handling

```sql
SELECT * FROM availability
 WHERE room_id=?
 AND date BETWEEN ? AND ?
 FOR UPDATE;
```

- If all dates available → mark `held`
- Payment succeeds → mark `booked`
- Payment fails or times out → release hold

---

## 7. Caching Strategy

| Key                             | TTL     | Purpose                  |
| ------------------------------- | ------- | ------------------------ |
| `availability:{roomId}:{range}` | 30–120s | Fast calendar updates    |
| `room:{roomId}:details`         | 5–30m   | Faster SSR               |
| `search:{queryHash}`            | 30–300s | Faster repeated searches |

Invalidation triggered via SNS events.

---

## 8. Event-Driven Messaging (SNS → SQS)

| Event                  | Purpose                        |
| ---------------------- | ------------------------------ |
| `booking.created`      | Confirmation email + analytics |
| `booking.cancelled`    | Release availability + notify  |
| `availability.updated` | Cache invalidation             |
| `room.updated`         | Reindex in search              |

---

## 9. Payments (Simplified)

- Booking request triggers **immediate simulated payment**.
- No secondary confirmation step required.
- Booking changes state:

```
PENDING → CONFIRMED   or   PENDING → CANCELLED
```

---

## 10. Scalability & Fault-Tolerance

| Layer           | Scaling Strategy                                  |
| --------------- | ------------------------------------------------- |
| API Services    | EKS + HPA autoscaling                             |
| Searches        | OpenSearch shards / replicas                      |
| Cache           | Redis Global Datastore                            |
| DB              | Aurora Global DB with regional replicas           |
| Traffic Routing | CloudFront + Lambda@Edge for region-aware routing |

---

## 11. User Flows

### Search Flow

![Search Flow](./search-flow.png)

```mermaid
sequenceDiagram
  autonumber
  participant U as User (Browser)
  participant CF as CloudFront
  participant LE as Lambda@Edge (Region Routing + Auth)
  participant SSR as Next.js SSR Server (Region)
  participant SEARCH as Search Service
  participant OS as OpenSearch Index
  participant REDIS as Redis (Global Availability Cache)
  participant ROOM as Global DB (Room Details)

  U ->> U: User opens /search?location=X&dates=Y
  U ->> CF: Request GET /search
  CF ->> LE: Forward request
  LE ->> SSR: Route to nearest region (based on JWT.claim(region))

  %% SSR PHASE
  SSR ->> SEARCH: searchRooms(query params)

  %% Search Query Normalization
  SEARCH ->> SEARCH: Normalize filters (price, capacity, date_range)

  %% Primary Search Index Query
  SEARCH ->> OS: Query rooms by filters (location, dates, attributes)
  OS -->> SEARCH: Room ID list + metadata

  %% Availability Overlay
  SEARCH ->> REDIS: GET availability overlay (room_ids, date_range)

  alt Cache HIT
    REDIS -->> SEARCH: availability states
  else Cache MISS
    SEARCH ->> ROOM: SELECT availability from Global DB
    ROOM -->> SEARCH: raw availability
    SEARCH ->> REDIS: SET availability overlay (short TTL)
  end

  %% Merge Search + Availability
  SEARCH ->> SEARCH: Filter out unavailable rooms
  SEARCH -->> SSR: Search result list + availability summaries

  %% SSR Response
  SSR -->> U: Rendered HTML + hydrated JSON data

```

### Booking Flow

![Booking Flow](./booking-flow.png)

```mermaid
sequenceDiagram
  autonumber
  participant U as User (UI)
  participant B as Booking Service
  participant INV as Inventory Service
  participant REDIS as Redis (Global Cache)
  participant GDB as Global DB (Rooms + Availability)
  participant RDB as Regional DB (Users + Bookings)
  participant PAY as Payment Service (Simulated)
  participant SNS as SNS (Events)

  U ->> B: POST /bookings (Idempotency-Key + JWT)
  B ->> RDB: Validate user & check existing PENDING duplicate
  B ->> REDIS: Check cached availability
  alt Cache says "available"
    B ->> INV: Proceed to lock availability
  else Cache says "unknown or stale"
    B ->> INV: Force availability check
  end

  INV ->> GDB: SELECT availability FOR UPDATE (date range)
  alt All rows are available
    INV ->> GDB: UPDATE status='held', hold_expires_at=now()+X
  else Some rows not available
    INV -->> B: "Not Available"
    B -->> U: Error (Room Unavailable)
  end

  B ->> PAY: Simulate payment authorization
  alt Payment success
    INV ->> GDB: UPDATE status='booked', clear hold_expires_at
    B ->> RDB: INSERT booking status=CONFIRMED
    B ->> SNS: Publish `booking.confirmed`
    B -->> U: Booking CONFIRMED (200)
  else Payment failure
    INV ->> GDB: UPDATE status='available', clear hold
    B ->> RDB: INSERT booking status=CANCELLED
    B -->> U: Payment Failed (402)
  end

```

---

## 12. Future Enhancements

- Dynamic pricing
- Waitlists
- Personalized recommendations

---
