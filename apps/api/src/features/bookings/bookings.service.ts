import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AvailabilityService } from '../availability/availability.service';
import { PaymentsService, PaymentStatus } from '../payments/payments.service';
import { RoomsService } from '../rooms/rooms.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { Booking, BookingStatus } from './entities/booking.entity';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    private availabilityService: AvailabilityService,
    private roomsService: RoomsService,
    private paymentsService: PaymentsService,
  ) {}

  /**
   * Create booking with idempotency, availability locking, and payment simulation
   */
  async createBooking(
    userId: number,
    dto: CreateBookingDto,
    idempotencyKey?: string,
  ): Promise<Booking> {
    const { roomId, checkIn, checkOut, guests } = dto;

    this.logger.debug(
      `Creating booking for user ${userId}, room ${roomId}, ${checkIn} to ${checkOut}`,
    );

    // Step 1: Check for idempotency - if same key exists, return existing booking
    if (idempotencyKey) {
      const existingBooking = await this.bookingRepository.findOne({
        where: { idempotency_key: idempotencyKey },
      });

      if (existingBooking) {
        this.logger.log(
          `Idempotent request detected, returning existing booking ${existingBooking.id}`,
        );
        return existingBooking;
      }
    }

    // Step 2: Validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    if (checkInDate >= checkOutDate) {
      throw new BadRequestException('Check-out must be after check-in');
    }

    if (checkInDate < new Date()) {
      throw new BadRequestException('Check-in date must be in the future');
    }

    // Step 3: Get room and calculate total price
    const room = await this.roomsService.getRoomById(roomId);

    if (guests > room.capacity) {
      throw new BadRequestException(
        `Room capacity (${room.capacity}) exceeded`,
      );
    }

    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    const totalPrice = room.price * nights;

    // Step 4: Hold availability with row-level locking (5 minute hold)
    const holdResult = await this.availabilityService.holdDatesWithLocking(
      roomId,
      checkIn,
      checkOut,
      5, // 5 minute hold
    );

    if (!holdResult.success) {
      throw new ConflictException(holdResult.message);
    }

    // Step 5: Create booking in PENDING state
    const booking = this.bookingRepository.create({
      user_id: userId,
      room_id: roomId,
      check_in: checkIn,
      check_out: checkOut,
      guests,
      total_price: totalPrice,
      status: BookingStatus.PENDING,
      idempotency_key: idempotencyKey,
    });

    await this.bookingRepository.save(booking);
    this.logger.log(`Created booking ${booking.id} in PENDING state`);

    // Step 6: Process payment (simulated)
    try {
      const paymentResult = await this.paymentsService.processPayment(
        totalPrice,
        booking.id,
        userId,
      );

      if (paymentResult.status === PaymentStatus.SUCCESS) {
        // Payment succeeded - confirm booking
        booking.status = BookingStatus.CONFIRMED;
        booking.payment_intent_id = paymentResult.transactionId;
        await this.bookingRepository.save(booking);

        // Confirm availability (change from held to booked)
        await this.availabilityService.confirmBooking(
          roomId,
          checkIn,
          checkOut,
        );

        this.logger.log(`Booking ${booking.id} confirmed with payment`);
      } else {
        // Payment failed - cancel booking and release hold
        booking.status = BookingStatus.CANCELLED;
        await this.bookingRepository.save(booking);

        await this.availabilityService.releaseHold(roomId, checkIn, checkOut);

        this.logger.warn(
          `Booking ${booking.id} cancelled due to payment failure: ${paymentResult.errorMessage}`,
        );

        throw new BadRequestException(
          `Payment failed: ${paymentResult.errorMessage}`,
        );
      }

      return booking;
    } catch (error) {
      // On any error, release the hold
      await this.availabilityService.releaseHold(roomId, checkIn, checkOut);
      throw error;
    }
  }

  /**
   * Get booking by ID
   */
  async getBooking(bookingId: number, userId?: number): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['room', 'user'],
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    // If userId provided, ensure booking belongs to user
    if (userId !== undefined && booking.user_id !== userId) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    return booking;
  }
}
