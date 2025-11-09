import {
  Availability,
  AvailabilityStatus,
} from '@/features/availability/entities/availability.entity';
import { Room } from '@/features/rooms/entities/room.entity';
import { User } from '@/features/users/entities/user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class SeederService {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Room)
    private roomRepository: Repository<Room>,
    @InjectRepository(Availability)
    private availabilityRepository: Repository<Availability>,
    @InjectDataSource()
    private dataSource: DataSource,
  ) {}

  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');
    await this.seedUsers();
    await this.seedRooms();
    await this.seedAvailability();
    this.logger.log('✅ Database seeding completed successfully!');
  }

  async clearAll(): Promise<void> {
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');
    await this.availabilityRepository.clear();
    await this.roomRepository.clear();
    await this.userRepository.clear();
    await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    this.logger.log('✅ Database cleared successfully!');
  }

  async seedUsers(): Promise<User[]> {
    const existingUsers = await this.userRepository.count();
    if (existingUsers > 0) {
      this.logger.log('👤 Users already seeded, skipping...');
      return this.userRepository.find();
    }

    const users = [
      {
        email: 'john.doe@example.com',
        password_hash: await argon2.hash('password123'),
        first_name: 'John',
        last_name: 'Doe',
      },
      {
        email: 'jane.smith@example.com',
        password_hash: await argon2.hash('password123'),
        first_name: 'Jane',
        last_name: 'Smith',
      },
      {
        email: 'admin@booking.com',
        password_hash: await argon2.hash('admin123'),
        first_name: 'Admin',
        last_name: 'User',
      },
    ];

    const savedUsers = await this.userRepository.save(users);
    this.logger.log(`✅ Seeded ${savedUsers.length} users`);
    return savedUsers;
  }

  async seedRooms(): Promise<Room[]> {
    const existingRooms = await this.roomRepository.count();
    if (existingRooms > 0) {
      this.logger.log('🏨 Rooms already seeded, skipping...');
      return this.roomRepository.find();
    }

    const rooms = [
      {
        title: 'Luxury Downtown Apartment',
        description:
          'Beautiful apartment in the heart of the city with stunning skyline views. Perfect for business travelers and couples.',
        location: {
          city: 'New York',
          country: 'USA',
          address: '123 Broadway, Manhattan',
          coordinates: { lat: 40.7128, lng: -74.006 },
        },
        price: 299.99,
        capacity: 4,
        amenities: [
          'WiFi',
          'Kitchen',
          'Air Conditioning',
          'Balcony',
          'City View',
          'Elevator',
        ],
        images: [
          'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
          'https://images.unsplash.com/photo-1484101403633-562f891dc89a',
        ],
      },
      {
        title: 'Cozy Beach House',
        description:
          'Relaxing beachfront property with direct ocean access and private beach area. Wake up to the sound of waves.',
        location: {
          city: 'Miami',
          country: 'USA',
          address: '456 Ocean Drive, South Beach',
          coordinates: { lat: 25.7617, lng: -80.1918 },
        },
        price: 199.99,
        capacity: 6,
        amenities: [
          'WiFi',
          'Beach Access',
          'Pool',
          'Parking',
          'BBQ Grill',
          'Beach Chairs',
        ],
        images: [
          'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
          'https://images.unsplash.com/photo-1512917774080-9991f1c4c750',
        ],
      },
      {
        title: 'Mountain Cabin Retreat',
        description:
          'Peaceful cabin surrounded by nature with hiking trails nearby. Perfect for a digital detox weekend.',
        location: {
          city: 'Aspen',
          country: 'USA',
          address: '789 Pine Trail, Colorado',
          coordinates: { lat: 39.1911, lng: -106.8175 },
        },
        price: 159.99,
        capacity: 8,
        amenities: [
          'Fireplace',
          'Hot Tub',
          'Hiking Trails',
          'Mountain View',
          'Game Room',
          'Pet Friendly',
        ],
        images: [
          'https://images.unsplash.com/photo-1449824913935-59a10b8d2000',
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4',
        ],
      },
      {
        title: 'Historic City Loft',
        description:
          'Charming loft in the historic district with exposed brick walls and modern amenities.',
        location: {
          city: 'San Francisco',
          country: 'USA',
          address: '321 Union Street',
          coordinates: { lat: 37.7749, lng: -122.4194 },
        },
        price: 249.99,
        capacity: 3,
        amenities: [
          'WiFi',
          'Kitchen',
          'Workspace',
          'Historic Area',
          'Public Transport',
        ],
        images: [
          'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
          'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e',
        ],
      },
    ];

    const savedRooms = await this.roomRepository.save(rooms);
    this.logger.log(`✅ Seeded ${savedRooms.length} rooms`);
    return savedRooms;
  }

  async seedAvailability(): Promise<void> {
    const existingAvailability = await this.availabilityRepository.count();
    if (existingAvailability > 0) {
      this.logger.log('📅 Availability already seeded, skipping...');
      return;
    }

    const rooms = await this.roomRepository.find();
    if (rooms.length === 0) {
      throw new Error('No rooms found to seed availability');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availabilityRecords: Partial<Availability>[] = [];

    this.logger.log('📅 Generating availability for next 365 days...');

    for (const room of rooms) {
      for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + dayOffset);

        // Randomly make some dates unavailable (10% booked, 5% held)
        let status = AvailabilityStatus.AVAILABLE;
        let hold_expires_at: Date | undefined = undefined;
        const random = Math.random();

        if (random < 0.1) {
          status = AvailabilityStatus.BOOKED;
        } else if (random < 0.15) {
          status = AvailabilityStatus.HELD;
          // Set hold expiry to 2 hours in the future for testing
          hold_expires_at = new Date(Date.now() + 2 * 60 * 60 * 1000);
        }

        availabilityRecords.push({
          room_id: room.id,
          date,
          status,
          hold_expires_at,
          version: 0,
        });
      }
    }

    // Insert in batches to avoid memory issues
    const batchSize = 1000;
    for (let i = 0; i < availabilityRecords.length; i += batchSize) {
      const batch = availabilityRecords.slice(i, i + batchSize);
      await this.availabilityRepository.save(batch);

      const progress = Math.min(
        ((i + batchSize) / availabilityRecords.length) * 100,
        100,
      );
      this.logger.log(
        `   Progress: ${progress.toFixed(0)}% (${i + batchSize}/${availabilityRecords.length})`,
      );
    }

    this.logger.log(
      `✅ Seeded availability for ${rooms.length} rooms over 365 days (${availabilityRecords.length} records)`,
    );
  }

  /**
   * Helper method for tests - seeds minimal data
   */
  async seedMinimal(): Promise<{ users: User[]; rooms: Room[] }> {
    this.logger.log('Seeding minimal test data...');
    const users = await this.seedUsers();
    const rooms = await this.seedRooms();

    // Only seed 30 days of availability for testing
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const availabilityRecords: Partial<Availability>[] = [];

    for (const room of rooms) {
      for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
        const date = new Date(today);
        date.setDate(today.getDate() + dayOffset);

        availabilityRecords.push({
          room_id: room.id,
          date,
          status: AvailabilityStatus.AVAILABLE,
          version: 0,
        });
      }
    }

    await this.availabilityRepository.save(availabilityRecords);
    this.logger.log('✅ Minimal seeding completed for testing');

    return { users, rooms };
  }
}
