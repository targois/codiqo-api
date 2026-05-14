import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ForYouService } from './for-you.service';

@ApiTags('For You')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('for-you')
export class ForYouController {
  constructor(private readonly forYouService: ForYouService) {}

  @Get()
  @ApiOperation({ summary: 'Aggregated homepage feed — user stats, recommendation, next lessons' })
  @ApiResponse({ status: 200, description: 'Personalized learning feed' })
  getForYou(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.forYouService.getForYou(user.id);
  }
}
