import { JwtAuthGuard } from '@/common/guards';
import { ReqLogInterceptor } from '@/common/interceptors';
import { CacheModule, LoggerModule, ThrottleModule } from '@/common/modules';
import { validateEnv } from '@/common/utils';
import { DatabaseModule, SeederModule } from '@/database';
import { UsersModule } from '@/features/users/users.module';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './features/auth/auth.module';
import { AvailabilityModule } from './features/availability/availability.module';
import { BookingsModule } from './features/bookings/bookings.module';
import { HealthModule } from './features/health/health.module';
import { PaymentsModule } from './features/payments/payments.module';
import { RoomsModule } from './features/rooms/rooms.module';

/**
 * The root module of the application.
 *
 * Configures global guards, environment validation, and imports all feature modules.
 */
@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ReqLogInterceptor,
    },
  ],
  imports: [
    JwtModule.register({
      global: true,
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    CacheModule,
    LoggerModule,
    ThrottleModule,
    DatabaseModule,
    SeederModule,
    UsersModule,
    AuthModule,
    HealthModule,
    AvailabilityModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
