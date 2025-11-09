import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Availability } from '../../availability/entities/availability.entity';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('rooms')
export class Room {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  convertBigIntToNumber() {
    // Convert BigInt fields
    if (typeof this.id === 'string') {
      this.id = parseInt(this.id, 10);
    }
    // Convert numeric fields
    if (typeof this.price === 'string') {
      this.price = parseFloat(this.price);
    }
    if (typeof this.capacity === 'string') {
      this.capacity = parseInt(this.capacity, 10);
    }
  }

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'json' })
  location: {
    city: string;
    country: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  @Index()
  price: number;

  @Column({ type: 'int' })
  @Index()
  capacity: number;

  @Column({ type: 'json', nullable: true })
  amenities: string[];

  @Column({ type: 'json', nullable: true })
  images: string[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany('Availability', 'room', { cascade: true })
  availability: Availability[];

  @OneToMany('Booking', 'room')
  bookings: Booking[];
}
