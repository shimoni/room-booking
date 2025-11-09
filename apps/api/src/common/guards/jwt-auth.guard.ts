import { IS_PUBLIC_KEY } from '@/common/decorators';
import { Env } from '@/common/utils';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

/**
 * JWT Authentication Guard for protecting routes in a NestJS application.
 * Implements JWT-based authentication by validating access tokens in the Authorization header.
 * Supports public routes through the @Public() decorator and automatically attaches the decoded user payload to the request object.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  /**
   * Creates an instance of JwtAuthGuard.
   *
   * @param jwtService - Service for JWT token operations (verify, decode)
   * @param reflector - NestJS utility for reading metadata from decorators
   * @param configService - Configuration service for accessing environment variables
   */
  constructor(
    private jwtService: JwtService,
    private reflector: Reflector,
    private configService: ConfigService<Env>,
  ) {}

  /**
   * Determines if the current request should be allowed to proceed.
   * Performs authentication by checking for public routes, extracting JWT tokens,
   * verifying tokens, and attaching user payload to the request object.
   *
   * @param context - The execution context containing request/response information
   * @returns Promise resolving to true if authentication succeeds
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeaderOrCookie(request);
    if (!token) {
      throw new UnauthorizedException();
    }
    try {
      request.user = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get('JWT_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid Access Token');
    }
    return true;
  }

  /**
   * Extracts the JWT token from the Authorization header or HttpOnly cookie.
   * First checks for cookie, then falls back to Authorization header.
   *
   * @param request - The Express request object containing headers and cookies
   * @returns The JWT token string if found and valid, undefined otherwise
   */
  private extractTokenFromHeaderOrCookie(request: Request): string | undefined {
    // First try to get token from HttpOnly cookie
    const cookieToken = request.cookies?.access_token;
    if (cookieToken) {
      return cookieToken;
    }

    // Fall back to Authorization header for API clients
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
