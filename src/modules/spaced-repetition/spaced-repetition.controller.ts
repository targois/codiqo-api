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
import { RateReviewDto } from './dto/rate-review.dto';
import { SpacedRepetitionService } from './spaced-repetition.service';

@ApiTags('Spaced Repetition')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class SpacedRepetitionController {
  constructor(private readonly service: SpacedRepetitionService) {}

  @Post('rate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Apply SM-2 with a 0..5 recall-quality rating. Returns the new schedule (interval, ease, next review).',
  })
  rate(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: RateReviewDto,
  ) {
    return this.service.rate(user.id, dto);
  }

  @Get('due')
  @ApiOperation({
    summary:
      'Skills whose next review is due (nextReviewAt <= now), with a recommended review lesson.',
  })
  async due(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    const reviews = await this.service.listDue(user.id);
    return { reviews };
  }
}
