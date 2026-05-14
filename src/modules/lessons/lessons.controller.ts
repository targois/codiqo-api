import { Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LessonsService } from './lessons.service';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a published lesson with content and user progress' })
  @ApiResponse({ status: 200, description: 'Lesson with theory, quiz, tasks and progress' })
  @ApiResponse({ status: 404, description: 'Lesson not found or not published' })
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    return this.lessonsService.findById(id, user.id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark lesson as completed — awards XP and updates streak' })
  @ApiResponse({ status: 200, description: 'Returns earned XP, total XP, streak, level' })
  @ApiResponse({ status: 404, description: 'Lesson not found or not published' })
  complete(
    @Param('id') id: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ) {
    return this.lessonsService.complete(id, user.id);
  }
}
