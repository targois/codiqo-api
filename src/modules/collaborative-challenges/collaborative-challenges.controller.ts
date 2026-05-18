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
import { CollaborativeChallengesService } from './collaborative-challenges.service';
import {
  CreateCollabChallengeDto,
  JoinCollabChallengeDto,
} from './dto/collaborative-challenge.dto';

@ApiTags('Collaborative Challenges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class CollaborativeChallengesController {
  constructor(private readonly service: CollaborativeChallengesService) {}

  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a collaborative XP-goal challenge. Creator auto-joins.' })
  create(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: CreateCollabChallengeDto,
  ) {
    return this.service.create(user.id, dto);
  }

  @Post('join')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an existing, not-yet-expired challenge.' })
  join(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: JoinCollabChallengeDto,
  ) {
    return this.service.join(user.id, dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Every collaborative challenge this user participates in, with per-user contributions and aggregate progress.',
  })
  async list(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    const challenges = await this.service.listForUser(user.id);
    return { challenges };
  }
}
