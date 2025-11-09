import { JwtAuthGuard } from '@/common/guards';
import type { RequestWithUser } from '@/common/interfaces/auth.interface';
import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@ApiTags('bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new booking' })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    description: 'Idempotency key to prevent duplicate bookings',
    required: false,
  })
  async createBooking(
    @Request() req: RequestWithUser,
    @Body() dto: CreateBookingDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const userId = req.user.userId;
    return this.bookingsService.createBooking(
      userId,
      dto,
      idempotencyKey || dto.idempotencyKey,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get booking details by ID' })
  async getBooking(
    @Request() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const userId = req.user.userId;
    return this.bookingsService.getBooking(id, userId);
  }
}
