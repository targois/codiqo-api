import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { SkillMasteryModule } from '../skill-mastery/skill-mastery.module';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { XpService } from './xp.service';

@Module({
  imports: [SkillMasteryModule, BadgesModule],
  controllers: [LessonsController],
  providers: [LessonsService, XpService],
  exports: [LessonsService, XpService],
})
export class LessonsModule {}
