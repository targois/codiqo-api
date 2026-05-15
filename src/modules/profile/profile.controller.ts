import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';

@ApiTags('Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile with stats and progress' })
  @ApiResponse({ status: 200, description: 'User profile' })
  getMe(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.profileService.getMe(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profile — displayName, username, avatarUrl' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  @ApiResponse({ status: 409, description: 'Username already taken' })
  update(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.update(user.id, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout — client removes the JWT token' })
  @ApiResponse({ status: 200, description: '{ success: true }' })
  logout() {
    return this.profileService.logout();
  }
}
