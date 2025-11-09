import { JwtStrategy } from '@/common/strategies/jwt.strategy';
import { TransactionService } from '@/database';
import { User } from '@/features/users/entities/user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthSimpleController } from './auth-simple.controller';
import { AuthServiceSimple } from './auth-simple.service';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthSimpleController],
  providers: [AuthServiceSimple, TransactionService, JwtStrategy],
  exports: [AuthServiceSimple],
})
export class AuthModule {}
