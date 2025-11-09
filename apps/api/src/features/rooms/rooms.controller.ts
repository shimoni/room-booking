import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { SearchRoomsDto } from './dto/search-rooms.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@Controller('rooms')
@ApiBearerAuth() // All room endpoints now require authentication
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  // Autocomplete endpoint for location suggestions
  @Get('autocomplete/locations')
  @ApiOperation({ summary: 'Get unique locations for autocomplete' })
  @ApiResponse({
    status: 200,
    description: 'Returns list of unique locations',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['New York, USA', 'London, UK', 'Tokyo, Japan'],
    },
  })
  async getLocations() {
    return this.roomsService.getUniqueLocations();
  }

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

  @Get(':id')
  @ApiOperation({ summary: 'Get room details by ID' })
  @ApiResponse({ status: 200, description: 'Returns room details' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomById(@Param('id', ParseIntPipe) id: number) {
    return this.roomsService.getRoomById(id);
  }
}
