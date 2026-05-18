import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgressService } from './progress.service';

@ApiTags('Progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @ApiOperation({
    summary:
      'User progression summary — completed lesson IDs, xp, level, streak. Frontend derives curriculum state from this.',
  })
  @ApiResponse({
    status: 200,
    description: '{ completedLessons, xp, level, streak, completedLessonsCount }',
  })
  getSummary(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.progressService.getSummary(user.id);
  }
}
