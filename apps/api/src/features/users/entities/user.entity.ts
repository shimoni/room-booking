import { hashString } from '@/common/utils';
import {
  AfterInsert,
  AfterLoad,
  AfterUpdate,
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';

/**
 * Entity representing a user account for the booking platform.
 */
@Entity('users')
export class User {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @AfterLoad()
  @AfterInsert()
  @AfterUpdate()
  convertBigIntToNumber() {
    if (typeof this.id === 'string') {
      this.id = parseInt(this.id, 10);
    }
  }

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password_hash: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany('Booking', 'user')
  bookings: Booking[];

  /**
   * Hashes password before inserting a new user.
   */
  @BeforeInsert()
  async hashPassword(): Promise<void> {
    if (this.password_hash && !this.password_hash.startsWith('$argon2')) {
      this.password_hash = await hashString(this.password_hash);
    }
  }
}
