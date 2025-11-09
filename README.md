# 🏨 Room Booking Platform

A scalable and fault-tolerant room booking platform built with modern technologies. This project implements user registration, room search with advanced filtering, and booking functionality with automatic payment processing.

## 📋 Overview

This platform demonstrates a production-ready microservices architecture with:

- **2 Microservices**: Separate UI and Backend services
- **Database Locking**: Prevents double-booking with row-level MySQL locks
- **Redis Caching**: Optimizes search and availability checks
- **Idempotency**: Prevents duplicate bookings
- **Comprehensive Testing**: 25+ E2E tests for core features

## ✨ Features

### Core Features (As Per Requirements)

- ✅ **User Registration** - Email/password authentication with JWT tokens
- ✅ **Room Search** - Advanced filtering by location, price, capacity, and dates
- ✅ **Booking Creation** - Automatic payment processing with availability management

### Technical Features

- `NestJS (v11)` backend with TypeScript
- `NextJS (v15)` frontend with React 19 and App Router
- `MySQL 8.0` database with TypeORM
- `Redis 7` for high-performance caching
- `JWT` Access Token & Refresh Token Authentication
- `Docker Compose` for infrastructure
- `SWC` for fast TypeScript transpilation
- `pnpm` for efficient dependency management
- Database transaction locking for concurrency control
- Idempotency keys for duplicate prevention
- Comprehensive E2E test coverage

## 📑 Table of Contents

- [Quick Start](#-quick-start)
- [Architecture](#%EF%B8%8F-architecture)
- [API Endpoints](#-api-endpoints)
- [Project Structure](#-project-structure)
- [Available Scripts](#%EF%B8%8F-available-scripts)
- [Testing](#-testing)
- [Design Documents](#-design-documents)
- [Implementation Notes](#-implementation-notes)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and pnpm
- Docker and Docker Compose

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/shimoni/room-booking.git
cd turborepo
```

2. **Install dependencies:**

```bash
pnpm install
```

3. **Start infrastructure (MySQL + Redis):**

```bash
docker-compose up -d
```

4. **Setup database:**

```bash
cd apps/api
pnpm db:migrate
pnpm seed
```

5. **Start development servers:**

```bash
# From root directory
pnpm dev
```

The services will be available at:

- **Frontend (UI)**: http://localhost:3000
- **Backend (API)**: http://localhost:3001
- **API Documentation (Swagger)**: http://localhost:3001/api

## 🏗️ Architecture

### Microservices

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend UI   │────────▶│   Backend API   │
│   (Next.js)     │   HTTP  │   (NestJS)      │
│   Port: 3000    │         │   Port: 3001    │
└─────────────────┘         └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │  MySQL   │    │  Redis   │    │   JWT    │
              │  Port:   │    │  Port:   │    │  Tokens  │
              │  3306    │    │  6379    │    └──────────┘
              └──────────┘    └──────────┘
```

### Key Architectural Decisions

**1. Concurrency Control**

- Database row-level locking (`SELECT ... FOR UPDATE`)
- Optimistic locking with version fields
- Idempotency keys for duplicate prevention

**2. Caching Strategy (Redis)**

- Room details: 30-minute TTL
- Search results: 5-minute TTL
- Availability: 60-second TTL with cache invalidation

**3. Authentication**

- JWT access tokens (15 min expiry)
- Refresh tokens (7 days expiry)
- HttpOnly secure cookies

## 🔌 API Endpoints

### Authentication (Public)

- `POST /auth/sign-up` - Register new user
- `POST /auth/sign-in` - Login with credentials
- `POST /auth/refresh` - Refresh access token
- `POST /auth/sign-out` - Logout and clear tokens
- `GET /auth/me` - Get current user profile

### Rooms (Public)

- `GET /rooms/search` - Search rooms with filters
  - Query params: `location`, `checkIn`, `checkOut`, `minPrice`, `maxPrice`, `capacity`, `limit`, `cursor`
- `GET /rooms/:id` - Get room details
- `GET /rooms/:id/availability` - Check room availability

### Bookings (Protected - JWT Required)

- `POST /bookings` - Create new booking with automatic payment
  - Headers: `X-Idempotency-Key` (optional)
- `GET /bookings/:id` - Get booking details

### Health

- `GET /health` - Health check endpoint

## 📁 Project Structure

```
turborepo/
├── apps/
│   ├── api/                          # NestJS Backend
│   │   ├── src/
│   │   │   ├── features/
│   │   │   │   ├── auth/            # Authentication module
│   │   │   │   ├── rooms/           # Room search & details
│   │   │   │   ├── bookings/        # Booking creation & management
│   │   │   │   ├── availability/    # Availability management
│   │   │   │   ├── payments/        # Payment processing (simulated)
│   │   │   │   └── users/           # User management
│   │   │   ├── common/              # Shared utilities
│   │   │   │   ├── decorators/      # Custom decorators (@Public)
│   │   │   │   ├── guards/          # JWT auth guard
│   │   │   │   ├── interceptors/    # Logging, response transform
│   │   │   │   └── modules/         # Cache, Logger, Throttle
│   │   │   ├── database/            # TypeORM config & migrations
│   │   │   └── test/                # E2E test helpers
│   │   ├── scripts/                 # Database seeding scripts
│   │   ├── docker-compose.yml       # MySQL + Redis infrastructure
│   │   └── package.json
│   │
│   └── web/                          # Next.js Frontend
│       ├── app/                      # App Router pages
│       ├── components/               # React components
│       ├── lib/
│       │   ├── api/                  # API client
│       │   └── auth/                 # Auth utilities
│       ├── server/                   # Server-side utilities
│       ├── types/                    # TypeScript types
│       └── package.json
│
├── packages/
│   ├── constants/                    # Shared constants
│   ├── eslint-config/                # Shared ESLint configs
│   ├── shadcn/                       # UI component library
│   ├── ts-config/                    # Shared TypeScript configs
│   └── utils/                        # Shared utility functions
│
├── scripts/
│   └── init-db.sql                   # Database initialization
│
├── docker-compose.yml                # Infrastructure setup
├── turbo.json                        # Turborepo configuration
├── README.md                         # This file
├── README_HLD.md                     # High-Level Design document
├── REDIS_IMPLEMENTATION.md           # Redis caching details
└── TESTING_IMPLEMENTATION.md         # Testing strategy
```

## 🛠️ Available Scripts

### Root Level

```bash
pnpm install              # Install all dependencies
pnpm build                # Build all apps and packages
pnpm dev                  # Start all apps in development mode
pnpm dev:api              # Start only API in development mode
pnpm dev:web              # Start only web app in development mode
pnpm lint                 # Lint all apps and packages
pnpm format               # Format code with Prettier
pnpm format:check         # Check code formatting without modifying
pnpm test                 # Run all tests using TurboRepo
pnpm commit               # Interactive commit with Commitizen
pnpm changeset            # Create version changeset

# Database
pnpm db:migrate           # Run database migrations
pnpm db:revert            # Revert last migration
pnpm db:generate          # Generate new migration
pnpm db:reset             # Reset database
pnpm seed                 # Seed database with test data
pnpm seed:clear           # Clear all seeded data

# Cache
pnpm cache:clear          # Clear Redis cache (FLUSHALL)
```

### API (Backend)

```bash
pnpm run dev -w api               # Start API in development mode
pnpm run build -w api             # Build API for production
pnpm run start:prod -w api        # Start API in production mode
pnpm run migration:generate -w api # Generate new migration
pnpm run migration:run -w api     # Run pending migrations
pnpm run seed -w api              # Seed database with test data
pnpm run test -w api              # Run E2E tests
pnpm run test:cov -w api          # Run tests with coverage
pnpm add:api <package>            # Add package to API workspace
```

### Web (Frontend)

```bash
pnpm run dev -w web       # Start Next.js in development mode
pnpm run build -w web     # Build Next.js for production
pnpm run start -w web     # Start Next.js in production mode
pnpm run lint -w web      # Lint frontend code
pnpm add:web <package>    # Add package to Web workspace
```

## 🧪 Testing

```bash
# Run all tests
pnpm run test -w api

# Run specific test suite
pnpm run test -w api -- auth.controller.e2e-spec
pnpm run test -w api -- rooms.controller.e2e-spec
pnpm run test -w api -- availability.controller.e2e-spec
pnpm run test -w api -- bookings.controller.e2e-spec

# Run with coverage
pnpm run test:cov -w api
```

### Test Environment

Tests automatically:

- Spin up test database and Redis instances
- Seed test data (users, rooms, availability)
- Clean up after each test suite
- Verify Redis caching behavior

## 📚 Design Documents

For detailed architecture and implementation information, see:

- **[High-Level Design](README_HLD.md)** - System architecture, component design, database schema

## 📝 Implementation Notes

### Features Implemented (Per Requirements)

✅ User registration and authentication  
✅ Room search with filters (location, dates, price, capacity)  
✅ Room availability checking  
✅ Booking creation with automatic payment  
✅ Idempotency for booking requests  
✅ Concurrency control (database locking)  
✅ Redis caching for search and availability
