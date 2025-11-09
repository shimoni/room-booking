import { Availability } from '@/features/availability/entities/availability.entity';
import { Room } from '@/features/rooms/entities/room.entity';
import { User } from '@/features/users/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeederService } from './seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Room, Availability])],
  providers: [SeederService],
  exports: [SeederService],
})
export class SeederModule {}
