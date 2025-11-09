import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Room } from '../../rooms/entities/room.entity';

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  HELD = 'held',
  BOOKED = 'booked',
}

@Entity('availability')
export class Availability {
  @PrimaryColumn({ type: 'bigint' })
  room_id: number;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  convertBigIntToNumber() {
    // Convert BigInt fields
    if (typeof this.room_id === 'string') {
      this.room_id = parseInt(this.room_id, 10);
    }
    // Convert numeric fields
    if (typeof this.version === 'string') {
      this.version = parseInt(this.version, 10);
    }
  }

  @PrimaryColumn({ type: 'date' })
  @Index()
  date: Date;

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.AVAILABLE,
  })
  @Index()
  status: AvailabilityStatus;

  @Column({ type: 'datetime', nullable: true })
  @Index()
  hold_expires_at: Date;

  @Column({ type: 'int', default: 0 })
  version: number;

  @ManyToOne(() => Room, (room) => room.availability, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;
}
