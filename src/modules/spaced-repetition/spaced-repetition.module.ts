import { Module } from '@nestjs/common';
import { SpacedRepetitionController } from './spaced-repetition.controller';
import { SpacedRepetitionService } from './spaced-repetition.service';

@Module({
  controllers: [SpacedRepetitionController],
  providers: [SpacedRepetitionService],
  exports: [SpacedRepetitionService],
})
export class SpacedRepetitionModule {}
