import {
  Availability,
  AvailabilityStatus,
} from '@/features/availability/entities/availability.entity';
import {
  Booking,
  BookingStatus,
} from '@/features/bookings/entities/booking.entity';
import { Room } from '@/features/rooms/entities/room.entity';
import { User } from '@/features/users/entities/user.entity';
import * as argon2 from 'argon2';
import { DataSource } from 'typeorm';

export class DbHelper {
  constructor(private dataSource: DataSource) {}

  /**
   * Delete all data from database tables
   */
  async deleteDbData(): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Disable foreign key checks
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 0');

      // Delete in order of dependencies
      await queryRunner.query('DELETE FROM bookings');
      await queryRunner.query('DELETE FROM availability');
      await queryRunner.query('DELETE FROM rooms');
      await queryRunner.query('DELETE FROM users');

      // Re-enable foreign key checks
      await queryRunner.query('SET FOREIGN_KEY_CHECKS = 1');
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Seed database with test data
   */
  async seedDb(): Promise<{
    users: User[];
    rooms: Room[];
    availability: Availability[];
  }> {
    // Create test users
    const users = await this.createTestUsers();

    // Create test rooms
    const rooms = await this.createTestRooms();

    // Create availability for next 30 days
    const availability = await this.createAvailability(rooms);

    return { users, rooms, availability };
  }

  /**
   * Create test users
   */
  async createTestUsers(): Promise<User[]> {
    const userRepo = this.dataSource.getRepository(User);
    const hashedPassword = await argon2.hash('Test123!');

    const users = await userRepo.save([
      {
        email: 'test1@example.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User1',
      },
      {
        email: 'test2@example.com',
        password_hash: hashedPassword,
        first_name: 'Test',
        last_name: 'User2',
      },
    ]);

    return users;
  }

  /**
   * Create test rooms
   */
  async createTestRooms(): Promise<Room[]> {
    const roomRepo = this.dataSource.getRepository(Room);

    const rooms = await roomRepo.save([
      {
        title: 'Deluxe Ocean View Suite',
        description: 'Luxury suite with ocean view',
        location: { city: 'Miami', country: 'USA', address: '123 Beach Blvd' },
        price: 250.0,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'Ocean View', 'Balcony'],
        images: ['room1.jpg', 'room1-2.jpg'],
      },
      {
        title: 'Standard City Room',
        description: 'Comfortable city room',
        location: { city: 'New York', country: 'USA', address: '456 Main St' },
        price: 150.0,
        capacity: 2,
        amenities: ['WiFi', 'TV', 'City View'],
        images: ['room2.jpg'],
      },
      {
        title: 'Family Suite',
        description: 'Spacious suite for families',
        location: { city: 'Miami', country: 'USA', address: '789 Family Ave' },
        price: 300.0,
        capacity: 4,
        amenities: ['WiFi', 'TV', 'Kitchen', 'Two Bedrooms'],
        images: ['room3.jpg', 'room3-2.jpg'],
      },
    ]);

    return rooms;
  }

  /**
   * Create availability for rooms
   */
  async createAvailability(rooms: Room[]): Promise<Availability[]> {
    const availabilityRepo = this.dataSource.getRepository(Availability);
    const availability: Availability[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Create 30 days of availability for each room
    for (const room of rooms) {
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);

        const avail = availabilityRepo.create({
          room_id: room.id,
          date,
          status: AvailabilityStatus.AVAILABLE,
          version: 0,
        });
        availability.push(avail);
      }
    }

    return await availabilityRepo.save(availability);
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const userRepo = this.dataSource.getRepository(User);
    return userRepo.findOne({ where: { email } });
  }

  /**
   * Create a booking for testing
   */
  async createTestBooking(data: {
    userId: number;
    roomId: number;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    status?: BookingStatus;
  }): Promise<Booking> {
    const bookingRepo = this.dataSource.getRepository(Booking);
    return bookingRepo.save({
      user_id: data.userId,
      room_id: data.roomId,
      check_in: data.checkIn,
      check_out: data.checkOut,
      guests: data.guests,
      status: data.status || BookingStatus.PENDING,
      total_price: 100.0,
      idempotency_key: `test-${Date.now()}-${Math.random()}`,
      payment_intent_id: `pi_test_${Date.now()}`,
    });
  }
}
