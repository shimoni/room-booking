import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import type { Cache } from 'cache-manager';
import { EntityManager, Repository } from 'typeorm';
import {
  Availability,
  AvailabilityStatus,
} from './entities/availability.entity';

interface AvailabilityRow {
  room_id: number;
  date: string;
  status: AvailabilityStatus;
  hold_expires_at: Date | null;
  version: number;
}

@Injectable()
export class AvailabilityService {
  private readonly logger = new Logger(AvailabilityService.name);

  constructor(
    @InjectRepository(Availability)
    private availabilityRepository: Repository<Availability>,
    @InjectEntityManager()
    private entityManager: EntityManager,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  /**
   * Hold room dates with row-level locking (MySQL FOR UPDATE)
   * This is the critical method that prevents double booking
   */
  async holdDatesWithLocking(
    roomId: number,
    checkIn: string,
    checkOut: string,
    holdMinutes: number = 5,
  ): Promise<{ success: boolean; message: string }> {
    return await this.entityManager.transaction(async (transactionManager) => {
      try {
        this.logger.debug(
          `Attempting to hold dates for room ${roomId} from ${checkIn} to ${checkOut}`,
        );

        // Calculate check-out minus 1 day for MySQL date range
        const checkOutMinusOne = new Date(checkOut);
        checkOutMinusOne.setDate(checkOutMinusOne.getDate() - 1);
        const endDate = checkOutMinusOne.toISOString().split('T')[0];

        // Step 1: Lock all relevant availability rows with SELECT ... FOR UPDATE
        const lockedRows = await transactionManager.query<AvailabilityRow[]>(
          `
          SELECT room_id, date, status, hold_expires_at, version
          FROM availability 
          WHERE room_id = ? 
            AND date BETWEEN ? AND ? 
          FOR UPDATE
        `,
          [roomId, checkIn, endDate],
        );

        this.logger.debug(`Locked ${lockedRows.length} availability rows`);

        // Step 2: Check if all dates are available
        const unavailableDates = lockedRows.filter((row: AvailabilityRow) => {
          if (row.status === 'booked') {
            return true; // Definitely unavailable
          }
          if (row.status === 'held') {
            // Check if hold has expired
            const holdExpiry = new Date(row.hold_expires_at!);
            const now = new Date();
            return holdExpiry > now; // Still held if expiry is in the future
          }
          return false; // Available
        });

        if (unavailableDates.length > 0) {
          this.logger.warn(
            `Some dates are unavailable: ${unavailableDates.map((d: AvailabilityRow) => d.date).join(', ')}`,
          );
          return {
            success: false,
            message: `Some dates are already booked or held: ${unavailableDates.map((d: AvailabilityRow) => d.date).join(', ')}`,
          };
        }

        // Step 3: Update all rows to 'held' status
        const holdExpiresAt = new Date();
        holdExpiresAt.setMinutes(holdExpiresAt.getMinutes() + holdMinutes);

        await transactionManager.query(
          `
          UPDATE availability 
          SET status = 'held', 
              hold_expires_at = ?, 
              version = version + 1 
          WHERE room_id = ? 
            AND date BETWEEN ? AND ?
        `,
          [holdExpiresAt, roomId, checkIn, endDate],
        );

        this.logger.log(
          `Successfully held dates for room ${roomId} from ${checkIn} to ${checkOut} until ${holdExpiresAt}`,
        );

        return {
          success: true,
          message: `Dates held successfully until ${holdExpiresAt.toISOString()}`,
        };
      } catch (error) {
        const err = error as Error;
        this.logger.error(`Error holding dates: ${err.message}`, err.stack);
        throw error;
      }
    });
  }

  /**
   * Confirm booking - change held dates to booked
   * Also invalidates the cache for this room
   */
  async confirmBooking(
    roomId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    await this.entityManager.transaction(async (transactionManager) => {
      const checkOutMinusOne = new Date(checkOut);
      checkOutMinusOne.setDate(checkOutMinusOne.getDate() - 1);
      const endDate = checkOutMinusOne.toISOString().split('T')[0];

      await transactionManager.query(
        `
        UPDATE availability 
        SET status = 'booked', 
            hold_expires_at = NULL, 
            version = version + 1 
        WHERE room_id = ? 
          AND date BETWEEN ? AND ? 
          AND status = 'held'
      `,
        [roomId, checkIn, endDate],
      );

      this.logger.log(
        `Confirmed booking for room ${roomId} from ${checkIn} to ${checkOut}`,
      );
    });

    // Invalidate cache after booking confirmation
    await this.invalidateAvailabilityCache(roomId, checkIn, checkOut);
  }

  /**
   * Release hold - change held dates back to available
   * Also invalidates the cache for this room
   */
  async releaseHold(
    roomId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    await this.entityManager.transaction(async (transactionManager) => {
      const checkOutMinusOne = new Date(checkOut);
      checkOutMinusOne.setDate(checkOutMinusOne.getDate() - 1);
      const endDate = checkOutMinusOne.toISOString().split('T')[0];

      await transactionManager.query(
        `
        UPDATE availability 
        SET status = 'available', 
            hold_expires_at = NULL, 
            version = version + 1 
        WHERE room_id = ? 
          AND date BETWEEN ? AND ? 
          AND status = 'held'
      `,
        [roomId, checkIn, endDate],
      );

      this.logger.log(
        `Released hold for room ${roomId} from ${checkIn} to ${checkOut}`,
      );
    });

    // Invalidate cache after releasing hold
    await this.invalidateAvailabilityCache(roomId, checkIn, checkOut);
  }

  /**
   * Check if dates are available (read-only, uses Redis cache)
   * Cached with 60 second TTL as per HLD (30-120s range)
   */
  async checkAvailability(
    roomId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<boolean> {
    // Generate cache key for this availability check
    const cacheKey = `availability:${roomId}:${checkIn}:${checkOut}`;

    // Try to get from cache first
    const cached = await this.cacheManager.get<boolean>(cacheKey);
    if (cached !== undefined && cached !== null) {
      this.logger.debug(`Cache hit for availability check: ${cacheKey}`);
      return cached;
    }

    const checkOutMinusOne = new Date(checkOut);
    checkOutMinusOne.setDate(checkOutMinusOne.getDate() - 1);
    const endDate = checkOutMinusOne.toISOString().split('T')[0];

    const unavailableCount = await this.availabilityRepository
      .createQueryBuilder('a')
      .where('a.room_id = :roomId', { roomId })
      .andWhere('a.date BETWEEN :checkIn AND :endDate', { checkIn, endDate })
      .andWhere(
        `(
        a.status = 'booked' OR 
        (a.status = 'held' AND a.hold_expires_at > NOW())
      )`,
      )
      .getCount();

    const isAvailable = unavailableCount === 0;

    // Cache result for 60 seconds (as per HLD: 30-120s)
    await this.cacheManager.set(cacheKey, isAvailable, 60 * 1000);

    return isAvailable;
  }

  /**
   * Invalidate availability cache for a room and date range
   * Called when availability changes (booking confirmed, hold released)
   */
  private async invalidateAvailabilityCache(
    roomId: number,
    checkIn: string,
    checkOut: string,
  ): Promise<void> {
    // Generate the cache key pattern
    const cacheKey = `availability:${roomId}:${checkIn}:${checkOut}`;
    await this.cacheManager.del(cacheKey);

    this.logger.debug(
      `Invalidated availability cache for room ${roomId} from ${checkIn} to ${checkOut}`,
    );
  }

  /**
   * Background job to clean up expired holds
   */
  async cleanupExpiredHolds(): Promise<number> {
    const result = await this.availabilityRepository
      .createQueryBuilder()
      .update(Availability)
      .set({
        status: AvailabilityStatus.AVAILABLE,
        hold_expires_at: undefined,
        version: () => 'version + 1',
      })
      .where("status = 'held'")
      .andWhere('hold_expires_at < NOW()')
      .execute();

    if (result.affected && result.affected > 0) {
      this.logger.log(`Cleaned up ${result.affected} expired holds`);
    }

    return result.affected || 0;
  }
}
