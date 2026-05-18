import {
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
import { BadgesService } from './badges.service';

@ApiTags('Badges')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get('badges/me')
  @ApiOperation({ summary: 'All badges this user has unlocked.' })
  list(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.badgesService.listForUser(user.id);
  }

  @Get('profile/badge-notifications')
  @ApiOperation({
    summary:
      'Badges unlocked since the user last acknowledged them. Frontend polls / fetches on focus, then POSTs /seen.',
  })
  async unseen(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    const newBadges = await this.badgesService.listUnseen(user.id);
    return { newBadges };
  }

  @Post('profile/badge-notifications/seen')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark every unseen badge as seen for this user.' })
  markSeen(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.badgesService.markAllSeen(user.id);
  }
}
