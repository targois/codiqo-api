import { Module } from '@nestjs/common';
import { TracksModule } from '../tracks/tracks.module';
import { LessonRuntimeService } from './lesson-runtime.service';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { XpService } from './xp.service';

@Module({
  imports: [TracksModule],
  controllers: [LessonsController],
  providers: [LessonsService, LessonRuntimeService, XpService],
  exports: [LessonsService],
})
export class LessonsModule {}
