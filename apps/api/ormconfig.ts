import * as dotenv from 'dotenv';
import { join } from 'path';
import { DataSource } from 'typeorm';

dotenv.config();

export default new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'booking_user',
  password: process.env.DB_PASSWORD || 'booking_password',
  database: process.env.DB_NAME || 'room_booking',
  entities: [join(__dirname, 'src', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'src', 'migrations', '*.{ts,js}')],
  timezone: '+00:00',
  charset: 'utf8mb4',
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  migrationsTableName: 'typeorm_migrations',
});
