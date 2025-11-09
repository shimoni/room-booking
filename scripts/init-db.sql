-- Initialize database for room booking platform
-- Only create database, TypeORM migrations will handle table creation

CREATE DATABASE IF NOT EXISTS room_booking;
GRANT ALL PRIVILEGES ON room_booking.* TO 'booking_user'@'%';
FLUSH PRIVILEGES;
