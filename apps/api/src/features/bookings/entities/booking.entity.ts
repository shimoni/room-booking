import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';
import { User } from '../../users/entities/user.entity';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

@Entity('bookings')
@Index(['room_id', 'check_in', 'check_out'])
export class Booking {
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
    if (typeof this.user_id === 'string') {
      this.user_id = parseInt(this.user_id, 10);
    }
    if (typeof this.room_id === 'string') {
      this.room_id = parseInt(this.room_id, 10);
    }
    // Convert numeric fields
    if (typeof this.guests === 'string') {
      this.guests = parseInt(this.guests, 10);
    }
    if (typeof this.total_price === 'string') {
      this.total_price = parseFloat(this.total_price);
    }
  }

  @Column({ type: 'bigint' })
  @Index()
  user_id: number;

  @Column({ type: 'bigint' })
  room_id: number;

  @Column({ type: 'date' })
  check_in: Date;

  @Column({ type: 'date' })
  check_out: Date;

  @Column({ type: 'int' })
  guests: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  @Index()
  status: BookingStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_price: number;

  @Column({ type: 'varchar', length: 255, unique: true })
  idempotency_key: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  payment_intent_id: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Room, (room) => room.bookings)
  @JoinColumn({ name: 'room_id' })
  room: Room;
}
