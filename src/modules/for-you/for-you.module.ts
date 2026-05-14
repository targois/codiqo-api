import { Module } from '@nestjs/common';
import { ForYouController } from './for-you.controller';
import { ForYouService } from './for-you.service';

@Module({
  controllers: [ForYouController],
  providers: [ForYouService],
})
export class ForYouModule {}
