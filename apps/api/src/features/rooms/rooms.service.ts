import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { Repository } from 'typeorm';
import { AvailabilityService } from '../availability/availability.service';
import { SearchRoomsDto } from './dto/search-rooms.dto';
import { Room } from './entities/room.entity';

@Injectable()
export class RoomsService {
  private readonly logger = new Logger(RoomsService.name);

  constructor(
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    private availabilityService: AvailabilityService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Search rooms with filters and cursor-based pagination
   * Cached in Redis with 5-minute TTL
   */
  async searchRooms(dto: SearchRoomsDto) {
    const {
      location,
      checkIn,
      checkOut,
      minPrice,
      maxPrice,
      capacity,
      limit = 10,
      cursor,
    } = dto;

    // Generate cache key from search parameters
    const cacheKey = `rooms:search:${JSON.stringify(dto)}`;

    // Try to get from cache (5 min TTL)
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search: ${cacheKey}`);
      return cached;
    }

    this.logger.debug(`Searching rooms with filters: ${JSON.stringify(dto)}`);

    // Build query
    const queryBuilder = this.roomRepository.createQueryBuilder('room');

    // Location filter (search in city, country, or address) - case insensitive
    // Supports both "City, Country" format and single search terms
    if (location) {
      // Check if location is in "City, Country" format
      const parts = location.split(',').map((part) => part.trim());

      if (parts.length === 2) {
        // Format: "City, Country" - search for city AND country
        const [city, country] = parts;
        queryBuilder.andWhere(
          `(
            LOWER(JSON_UNQUOTE(JSON_EXTRACT(room.location, '$.city'))) LIKE LOWER(:city) AND
            LOWER(JSON_UNQUOTE(JSON_EXTRACT(room.location, '$.country'))) LIKE LOWER(:country)
          )`,
          { city: `%${city}%`, country: `%${country}%` },
        );
      } else {
        // Single term - search across city, country, or address
        queryBuilder.andWhere(
          `(
            LOWER(JSON_UNQUOTE(JSON_EXTRACT(room.location, '$.city'))) LIKE LOWER(:location) OR
            LOWER(JSON_UNQUOTE(JSON_EXTRACT(room.location, '$.country'))) LIKE LOWER(:location) OR
            LOWER(JSON_UNQUOTE(JSON_EXTRACT(room.location, '$.address'))) LIKE LOWER(:location)
          )`,
          { location: `%${location}%` },
        );
      }
    }

    // Price range filters
    if (minPrice !== undefined) {
      queryBuilder.andWhere('room.price >= :minPrice', { minPrice });
    }
    if (maxPrice !== undefined) {
      queryBuilder.andWhere('room.price <= :maxPrice', { maxPrice });
    }

    // Capacity filter
    if (capacity !== undefined) {
      queryBuilder.andWhere('room.capacity >= :capacity', { capacity });
    }

    // Cursor pagination
    if (cursor !== undefined) {
      queryBuilder.andWhere('room.id > :cursor', { cursor });
    }

    // Order and limit
    queryBuilder.orderBy('room.id', 'ASC').take(limit + 1); // Fetch 1 extra to check if there are more results

    const rooms = await queryBuilder.getMany();

    // Check if there are more results
    const hasMore = rooms.length > limit;
    if (hasMore) {
      rooms.pop(); // Remove the extra result
    }

    // If date range is provided, filter out unavailable rooms
    let availableRooms = rooms;
    if (checkIn && checkOut) {
      // Both dates provided - check availability for the date range
      const availabilityChecks = await Promise.all(
        rooms.map(async (room) => {
          const isAvailable = await this.availabilityService.checkAvailability(
            room.id,
            checkIn,
            checkOut,
          );
          return { room, isAvailable };
        }),
      );

      availableRooms = availabilityChecks
        .filter((check) => check.isAvailable)
        .map((check) => check.room);
    } else if (checkIn) {
      // Only checkIn provided - check if available starting from that date
      // We'll check availability for a 1-night stay starting from checkIn
      const nextDay = new Date(checkIn);
      nextDay.setDate(nextDay.getDate() + 1);
      const tempCheckOut = nextDay.toISOString().split('T')[0];

      const availabilityChecks = await Promise.all(
        rooms.map(async (room) => {
          const isAvailable = await this.availabilityService.checkAvailability(
            room.id,
            checkIn,
            tempCheckOut,
          );
          return { room, isAvailable };
        }),
      );

      availableRooms = availabilityChecks
        .filter((check) => check.isAvailable)
        .map((check) => check.room);
    } else if (checkOut) {
      // Only checkOut provided - check if available until that date
      // We'll check availability for a 1-night stay ending on checkOut
      const prevDay = new Date(checkOut);
      prevDay.setDate(prevDay.getDate() - 1);
      const tempCheckIn = prevDay.toISOString().split('T')[0];

      const availabilityChecks = await Promise.all(
        rooms.map(async (room) => {
          const isAvailable = await this.availabilityService.checkAvailability(
            room.id,
            tempCheckIn,
            checkOut,
          );
          return { room, isAvailable };
        }),
      );

      availableRooms = availabilityChecks
        .filter((check) => check.isAvailable)
        .map((check) => check.room);
    }

    // Next cursor is the last room's ID
    const nextCursor =
      hasMore && availableRooms.length > 0
        ? availableRooms[availableRooms.length - 1].id
        : null;

    const result = {
      rooms: availableRooms,
      pagination: {
        limit,
        nextCursor,
        hasMore,
      },
    };

    // Cache result for 5 minutes (300 seconds)
    await this.cacheManager.set(cacheKey, result, 300 * 1000);

    return result;
  }

  /**
   * Get room by ID
   * Cached in Redis with 30-minute TTL
   */
  async getRoomById(id: number): Promise<Room> {
    // Try cache first (30 min TTL)
    const cacheKey = `room:${id}`;
    const cached = await this.cacheManager.get<Room>(cacheKey);

    if (cached) {
      this.logger.debug(`Cache hit for room ${id}`);
      return cached;
    }

    const room = await this.roomRepository.findOne({ where: { id } });

    if (!room) {
      throw new NotFoundException(`Room with ID ${id} not found`);
    }

    // Cache for 30 minutes (1800 seconds)
    await this.cacheManager.set(cacheKey, room, 1800 * 1000);

    return room;
  }

  /**
   * Check if room is available for given dates
   */
  async checkRoomAvailability(
    roomId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<boolean> {
    // First check if room exists
    await this.getRoomById(roomId);

    // Check availability
    return this.availabilityService.checkAvailability(
      roomId,
      checkIn,
      checkOut,
    );
  }

  /**
   * Get unique locations for autocomplete
   * Returns unique city, country combinations
   */
  async getUniqueLocations(): Promise<string[]> {
    const cacheKey = 'rooms:locations';

    // Try cache first (1 hour TTL)
    const cached = await this.cacheManager.get<string[]>(cacheKey);
    if (cached) {
      this.logger.debug('Cache hit for locations');
      return cached;
    }

    const rooms = await this.roomRepository.find({
      select: ['location'],
    });

    // Extract unique location strings
    const locationSet = new Set<string>();
    rooms.forEach((room) => {
      if (room.location) {
        const { city, country } = room.location;
        if (city && country) {
          locationSet.add(`${city}, ${country}`);
        }
      }
    });

    const locations = Array.from(locationSet).sort();

    // Cache for 1 hour (3600 seconds)
    await this.cacheManager.set(cacheKey, locations, 3600 * 1000);

    return locations;
  }
}
