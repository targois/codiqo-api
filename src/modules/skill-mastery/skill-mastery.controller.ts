import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { BadgesService } from '../badges/badges.service';
import { RecordAttemptDto } from './dto/record-attempt.dto';
import { SkillMasteryService } from './skill-mastery.service';

@ApiTags('Skills')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('skills')
export class SkillMasteryController {
  constructor(
    private readonly skillMasteryService: SkillMasteryService,
    private readonly badgesService: BadgesService,
  ) {}

  @Get('mastery')
  @ApiOperation({
    summary:
      'Per-skill mastery snapshot — BKT mastery score, confidence, correct/incorrect counts.',
  })
  getMastery(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.skillMasteryService.getSummary(user.id);
  }

  @Post('record')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Record one attempt against a skill. Updates BKT posterior. Frontend calls this on every quiz answer or code-task verdict.',
  })
  async record(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: RecordAttemptDto,
  ) {
    const result = await this.skillMasteryService.recordAttempt(
      user.id,
      dto.skillTag,
      dto.correct,
    );
    const newBadges = await this.badgesService.checkAndUnlock(user.id);
    return { mastery: result, newBadges };
  }
}
