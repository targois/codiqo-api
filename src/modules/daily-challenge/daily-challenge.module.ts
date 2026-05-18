import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { LessonsModule } from '../lessons/lessons.module';
import { DailyChallengeController } from './daily-challenge.controller';
import { DailyChallengeService } from './daily-challenge.service';

@Module({
  imports: [LessonsModule, BadgesModule],
  controllers: [DailyChallengeController],
  providers: [DailyChallengeService],
})
export class DailyChallengeModule {}
