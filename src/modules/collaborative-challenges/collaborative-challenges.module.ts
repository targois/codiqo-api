import { Module } from '@nestjs/common';
import { CollaborativeChallengesController } from './collaborative-challenges.controller';
import { CollaborativeChallengesService } from './collaborative-challenges.service';

@Module({
  controllers: [CollaborativeChallengesController],
  providers: [CollaborativeChallengesService],
})
export class CollaborativeChallengesModule {}
