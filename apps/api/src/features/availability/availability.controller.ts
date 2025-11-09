import { Public } from '@/common/decorators';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AvailabilityService } from './availability.service';

class CheckAvailabilityDto {
  roomId: number;
  checkIn: string;
  checkOut: string;
}

@ApiTags('availability')
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @Public()
  @Get('check')
  @ApiOperation({
    summary: 'Check if dates are available for a room',
  })
  async checkAvailability(@Query() dto: CheckAvailabilityDto) {
    const available = await this.availabilityService.checkAvailability(
      dto.roomId,
      dto.checkIn,
      dto.checkOut,
    );

    return {
      available,
      roomId: dto.roomId,
      checkIn: dto.checkIn,
      checkOut: dto.checkOut,
    };
  }
}
