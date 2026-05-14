import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Onboarding, User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateOnboardingDto } from './dto/create-onboarding.dto';
import { UpdateOnboardingDto } from './dto/update-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@ApiTags('Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Submit onboarding quiz answers' })
  @ApiResponse({ status: 201, description: 'Onboarding created, user marked as onboarded' })
  @ApiResponse({ status: 409, description: 'Onboarding already completed' })
  create(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: CreateOnboardingDto,
  ): Promise<Onboarding> {
    return this.onboardingService.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user onboarding data' })
  @ApiResponse({ status: 200, description: 'Onboarding data, or null if not yet completed' })
  findMine(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
  ): Promise<Onboarding | null> {
    return this.onboardingService.findByUser(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user onboarding data' })
  @ApiResponse({ status: 200, description: 'Updated onboarding data' })
  @ApiResponse({ status: 404, description: 'Onboarding not found' })
  update(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: UpdateOnboardingDto,
  ): Promise<Onboarding> {
    return this.onboardingService.update(user.id, dto);
  }
}
