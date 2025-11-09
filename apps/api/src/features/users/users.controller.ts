import { Public } from '@/common/decorators';
import { UserResponse } from '@/common/interfaces/auth.interface';
import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

/**
 * Controller for managing user-related operations.
 *
 * Provides endpoints to fetch all users and fetch a single user by identifier.
 */
@Controller('users')
export class UsersController {
  /**
   * Creates an instance of UsersController.
   *
   * @param {UsersService} usersService - Service for user-related operations.
   */
  constructor(private readonly usersService: UsersService) {}

  /**
   * Fetches all users.
   *
   * @returns {Promise<{ message: string; data: UserResponse[] }>} An object containing a message and an array of user data without passwords.
   */
  @Public()
  @Get()
  async findAll(): Promise<{ message: string; data: UserResponse[] }> {
    const users = await this.usersService.findAll();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const data = users.map(({ password_hash, ...user }) => ({
      ...user,
    }));
    return { message: 'Users fetched successfully', data };
  }

  /**
   * Fetches a single user by identifier.
   *
   * @param {string} identifier - The identifier of the user (e.g., ID or username).
   * @returns {Promise<{ message: string; data: UserResponse }>} An object containing a message and the user data without password.
   */
  @Public()
  @Get(':identifier')
  async findOne(
    @Param('identifier') identifier: string,
  ): Promise<{ message: string; data: UserResponse }> {
    const user = await this.usersService.findOne(identifier);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...data } = user;
    return { message: 'User fetched successfully', data };
  }
}
