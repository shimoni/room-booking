import { Env } from '@/common/utils';
import { User } from '@/features/users/entities/user.entity';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';

export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

// Fastify Response type with cookie methods
interface FastifyResponseWithCookies {
  cookie(name: string, value: string, options?: Record<string, unknown>): void;
  clearCookie(name: string, options?: Record<string, unknown>): void;
}

@Injectable()
export class AuthServiceSimple {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService<Env>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async signIn(
    identifier: string,
    password: string,
  ): Promise<{ user: User; tokens: TokenPair }> {
    // identifier is the email address
    const user = await this.userRepository.findOne({
      where: { email: identifier },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!(await argon2.verify(user.password_hash, password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    return { user, tokens };
  }

  async signUp(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
  ): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await argon2.hash(password);

    const user = this.userRepository.create({
      email,
      password_hash: hashedPassword,
      first_name: firstName,
      last_name: lastName,
    });

    return this.userRepository.save(user);
  }

  async refreshTokens(refreshToken: string): Promise<TokenPair> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: decoded.sub },
      });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getUserById(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  private async generateTokens(user: User): Promise<TokenPair> {
    // Use userId instead of sub to match AuthenticatedUser interface
    const payload = { userId: user.id, email: user.email };

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: this.config.get('ACCESS_TOKEN_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('REFRESH_TOKEN_EXPIRATION'),
      }),
    ]);

    return { access_token, refresh_token };
  }

  /**
   * Set authentication cookies in the response
   */
  setAuthCookies(
    response: FastifyResponseWithCookies,
    tokens: TokenPair,
  ): void {
    const isProduction = this.config.get('NODE_ENV') === 'production';

    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      path: '/',
    };

    // Access token - short lived (15 minutes)
    void response.cookie('access_token', tokens.access_token, {
      ...cookieOptions,
      maxAge: 15 * 60, // 15 minutes in seconds
    });

    // Refresh token - longer lived (7 days)
    void response.cookie('refresh_token', tokens.refresh_token, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });
  }

  /**
   * Clear authentication cookies
   */
  clearAuthCookies(response: FastifyResponseWithCookies): void {
    void response.clearCookie('access_token', { path: '/' });
    void response.clearCookie('refresh_token', { path: '/' });
  }
}
