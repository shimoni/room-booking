import { Public } from '@/common/decorators/public.decorator';
import { RequestWithUser } from '@/common/interfaces/auth.interface';
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthServiceSimple } from './auth-simple.service';

// Fastify Response type with cookie methods
interface FastifyResponseWithCookies {
  cookie(name: string, value: string, options?: Record<string, unknown>): void;
  clearCookie(name: string, options?: Record<string, unknown>): void;
}

@Controller('auth')
export class AuthSimpleController {
  constructor(private authService: AuthServiceSimple) {}

  @Public()
  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  async signIn(
    @Body() body: { email: string; password: string },
    @Res({ passthrough: true }) response: FastifyResponseWithCookies,
  ) {
    const { user, tokens } = await this.authService.signIn(
      body.email,
      body.password,
    );

    // Set httpOnly cookies
    this.authService.setAuthCookies(response, tokens);

    return { user };
  }

  @Public()
  @Post('sign-up')
  async signUp(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
  ) {
    const user = await this.authService.signUp(
      body.email,
      body.password,
      body.firstName,
      body.lastName,
    );

    return {
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: RequestWithUser & { cookies?: Record<string, string> },
    @Res({ passthrough: true }) response: FastifyResponseWithCookies,
  ) {
    const refreshToken = request.cookies?.refresh_token;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);
    this.authService.setAuthCookies(response, tokens);

    return { message: 'Tokens refreshed successfully' };
  }

  @Post('sign-out')
  @HttpCode(HttpStatus.OK)
  async signOut(
    @Res({ passthrough: true }) response: FastifyResponseWithCookies,
  ) {
    this.authService.clearAuthCookies(response);
    return { message: 'Successfully logged out' };
  }
}
