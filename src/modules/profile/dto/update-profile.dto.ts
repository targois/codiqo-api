import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsString()
  @IsOptional()
  displayName?: string;

  @ApiPropertyOptional({ example: 'jane_dev' })
  @IsString()
  @MinLength(3)
  @IsOptional()
  username?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsUrl()
  @IsOptional()
  avatarUrl?: string;
}
