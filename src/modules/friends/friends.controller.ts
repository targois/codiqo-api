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
import { FriendshipStatus, User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateFriendRequestDto,
  RespondFriendRequestDto,
} from './dto/friend-request.dto';
import { FriendsService } from './friends.service';

@ApiTags('Friends')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a friend request by username.' })
  request(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: CreateFriendRequestDto,
  ) {
    return this.friendsService.sendRequest(user.id, dto.username);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a pending friend request you received.' })
  accept(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respond(
      user.id,
      dto.friendshipId,
      FriendshipStatus.ACCEPTED,
    );
  }

  @Post('reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending friend request you received.' })
  reject(
    @CurrentUser() user: Omit<User, 'passwordHash'>,
    @Body() dto: RespondFriendRequestDto,
  ) {
    return this.friendsService.respond(
      user.id,
      dto.friendshipId,
      FriendshipStatus.REJECTED,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Accepted friendships.' })
  list(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.friendsService.list(user.id, FriendshipStatus.ACCEPTED);
  }

  @Get('pending')
  @ApiOperation({
    summary:
      'Pending requests involving this user (both received and sent), with a `direction` field.',
  })
  pending(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return this.friendsService.list(user.id, FriendshipStatus.PENDING);
  }

  @Get('progress')
  @ApiOperation({ summary: 'Friend progression overview (xp, streak, league).' })
  async progress(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    const friends = await this.friendsService.progress(user.id);
    return { friends };
  }
}
