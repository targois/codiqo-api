import { Module } from '@nestjs/common';
import { BadgesModule } from '../badges/badges.module';
import { SkillMasteryController } from './skill-mastery.controller';
import { SkillMasteryService } from './skill-mastery.service';

@Module({
  imports: [BadgesModule],
  controllers: [SkillMasteryController],
  providers: [SkillMasteryService],
  exports: [SkillMasteryService],
})
export class SkillMasteryModule {}
