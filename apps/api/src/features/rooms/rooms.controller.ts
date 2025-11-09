import { Public } from '@/common/decorators';
import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SearchRoomsDto } from './dto/search-rooms.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@Controller('rooms')
@Public() // Room search is public, no authentication required
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search rooms with filters and cursor pagination',
  })
  @ApiResponse({ status: 200, description: 'Returns matching rooms' })
  async searchRooms(
    @Query(new ValidationPipe({ transform: true })) dto: SearchRoomsDto,
  ) {
    return this.roomsService.searchRooms(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get room details by ID' })
  @ApiResponse({ status: 200, description: 'Returns room details' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.getRoomById(id);
  }

  @Get(':id/availability')
  @ApiOperation({ summary: 'Check room availability for given dates' })
  @ApiResponse({
    status: 200,
    description: 'Returns availability status',
    schema: {
      type: 'object',
      properties: {
        roomId: { type: 'number' },
        checkIn: { type: 'string' },
        checkOut: { type: 'string' },
        available: { type: 'boolean' },
      },
    },
  })
  async checkAvailability(
    @Param('id', ParseIntPipe) id: number,
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
  ) {
    const available = await this.roomsService.checkRoomAvailability(
      id,
      checkIn,
      checkOut,
    );

    return {
      roomId: id,
      checkIn,
      checkOut,
      available,
    };
  }
}
