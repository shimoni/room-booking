import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SearchRoomsDto {
  @IsOptional()
  @IsString()
  location?: string; // City or country search

  @IsOptional()
  @IsDateString()
  checkIn?: string; // ISO date string

  @IsOptional()
  @IsDateString()
  checkOut?: string; // ISO date string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  capacity?: number; // Minimum capacity

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10; // Default 10 results per page

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  cursor?: number; // Room ID to start from (for cursor pagination)
}
