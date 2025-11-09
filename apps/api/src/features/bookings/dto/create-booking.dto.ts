import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateBookingDto {
  @IsInt()
  @Min(1)
  roomId: number;

  @IsDateString()
  checkIn: string; // ISO date string

  @IsDateString()
  checkOut: string; // ISO date string

  @IsInt()
  @Min(1)
  @Max(20)
  guests: number;

  @IsOptional()
  @IsString()
  idempotencyKey?: string; // Optional, can also come from header
}
