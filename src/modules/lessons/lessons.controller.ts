import {
  Body,
  Controller,
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
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { LessonsService } from './lessons.service';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Persist lesson completion — awards XP, updates streak, and increments today\'s activity.',
  })
  @ApiResponse({
    status: 200,
    description: '{ success, alreadyCompleted, earnedXp, totalXp, level, streak }',
  })
  complete(
    @Param('id') id: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: CompleteLessonDto,
  ) {
    return this.lessonsService.complete(id, user.id, dto);
  }
}
