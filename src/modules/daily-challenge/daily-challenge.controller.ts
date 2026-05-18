import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DailyChallengeService } from './daily-challenge.service';
import { SubmitChallengeDto } from './dto/submit-challenge.dto';

@ApiTags('Daily Challenge')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('daily-challenge')
export class DailyChallengeController {
  constructor(private readonly dailyChallengeService: DailyChallengeService) {}

  @Get()
  @ApiOperation({ summary: "Today's daily challenge + this user's completion state" })
  @ApiResponse({
    status: 200,
    description:
      '{ id, slug, title, description, difficulty, estimatedMinutes, xpReward, language, starterCode, expectedOutput, hint, completed }',
  })
  @ApiResponse({ status: 404, description: 'No challenges configured' })
  getToday(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.dailyChallengeService.getToday(user.id);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Submit a solution. Backend validates by normalized-string comparison (no code execution).',
  })
  @ApiResponse({
    status: 200,
    description:
      'On success: { correct: true, earnedXp, streak, totalXp, level, message }. On wrong answer: { correct: false, message, hint }.',
  })
  @ApiResponse({ status: 404, description: 'Challenge not found' })
  submit(
    @Param('id') id: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: SubmitChallengeDto,
  ) {
    return this.dailyChallengeService.submit(user.id, id, dto);
  }
}
