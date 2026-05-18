import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TracksService } from './tracks.service';

@ApiTags('Tracks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tracks')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @Get(':language/progress')
  @ApiOperation({
    summary:
      'Per-language progression — current lesson + module, unlock list, completion, icon metadata.',
  })
  @ApiResponse({
    status: 200,
    description:
      '{ language, iconKey, accentColor, currentLessonId, completedLessons, unlockedLessons, progressPercent, completedLessonsCount, totalLessonsCount, currentModule, xp, streak }',
  })
  @ApiResponse({ status: 404, description: 'Unknown language slug' })
  getProgress(
    @Param('language') language: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    const enumValue = this.tracksService.resolveLanguage(language);
    return this.tracksService.getProgress(user.id, enumValue);
  }
}
