import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  // Export UsersService so the AuthModule can use it later (to look up users by email)
  exports: [UsersService],
})
export class UsersModule {}
