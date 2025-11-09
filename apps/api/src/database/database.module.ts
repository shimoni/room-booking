/**
 * Database module for configuring TypeORM with MySQL in a NestJS application.
 *
 * Uses asynchronous configuration to load database connection settings from environment variables via ConfigService.
 * Migrations are used instead of synchronize for schema management.
 */
import { Env } from '@/common/utils';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

/**
 * DatabaseModule class that imports TypeOrmModule with async configuration.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => ({
        type: 'mysql',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 3306),
        username: config.get('DB_USERNAME'),
        password: config.get('DB_PASSWORD'),
        database: config.get('DB_NAME'),
        entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
        migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
        synchronize: false, // Never use synchronize - use migrations instead
        migrationsRun: false, // Run migrations manually
        logging:
          config.get('NODE_ENV') === 'development'
            ? ['query', 'error']
            : ['error'],
        timezone: '+00:00', // Use UTC
        charset: 'utf8mb4',
        extra: {
          connectionLimit: 20,
          acquireTimeout: 60000,
          timeout: 60000,
        },
      }),
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
