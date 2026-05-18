import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateFriendRequestDto {
  @ApiProperty({
    description: 'Username of the user to befriend.',
    example: 'alex_dev',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  username!: string;
}

export class RespondFriendRequestDto {
  @ApiProperty({ description: 'Friendship id to accept or reject.' })
  @IsUUID()
  friendshipId!: string;
}
