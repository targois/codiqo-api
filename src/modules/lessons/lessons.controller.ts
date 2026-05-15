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
import { CompleteBlockDto } from './dto/complete-block.dto';
import { LessonRuntimeService } from './lesson-runtime.service';
import { LessonsService } from './lessons.service';

@ApiTags('Lessons')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly runtimeService: LessonRuntimeService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get a published lesson — content + sidebar (track view)' })
  @ApiResponse({ status: 200, description: 'Lesson with blocks, progress, sidebar' })
  @ApiResponse({ status: 403, description: 'Lesson is locked' })
  @ApiResponse({ status: 404, description: 'Lesson not found or not published' })
  findOne(@Param('id') id: string, @CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.lessonsService.findById(id, user.id);
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start or resume a lesson session' })
  @ApiResponse({ status: 200, description: 'Lesson started, returns current progress' })
  @ApiResponse({ status: 403, description: 'Lesson is locked' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  start(@Param('id') id: string, @CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.runtimeService.start(id, user.id);
  }

  @Post(':lessonId/blocks/:blockId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Complete a block — for QUIZ blocks pass { answer: index } in body; non-quiz blocks just mark complete',
  })
  @ApiResponse({ status: 200, description: '{ blockCompleted } or { correct, blockCompleted }' })
  @ApiResponse({ status: 400, description: 'Quiz block submitted without answer' })
  @ApiResponse({ status: 403, description: 'Lesson is locked' })
  @ApiResponse({ status: 404, description: 'Lesson or block not found' })
  completeBlock(
    @Param('lessonId') lessonId: string,
    @Param('blockId') blockId: string,
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: CompleteBlockDto,
  ) {
    return this.runtimeService.completeBlock(lessonId, blockId, user.id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Finalize a lesson — gated on all blocks completed; awards XP and updates streak',
  })
  @ApiResponse({ status: 200, description: '{ success, earnedXp, totalXp, streak, level }' })
  @ApiResponse({ status: 400, description: 'Lesson requirements are not completed' })
  @ApiResponse({ status: 403, description: 'Lesson is locked' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  complete(@Param('id') id: string, @CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.runtimeService.complete(id, user.id);
  }
}
