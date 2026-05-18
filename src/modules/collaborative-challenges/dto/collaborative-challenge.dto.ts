import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinDate,
  MinLength,
} from 'class-validator';

const tomorrow = new Date();
tomorrow.setUTCHours(tomorrow.getUTCHours() + 1);

export class CreateCollabChallengeDto {
  @ApiProperty({ example: 'Sprint to 100 XP' })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  title!: string;

  @ApiProperty({ example: 100 })
  @IsInt()
  @Min(10)
  @Max(5000)
  xpGoal!: number;

  @ApiProperty({
    description: 'ISO timestamp when the challenge expires. Must be in the future.',
    example: tomorrow.toISOString(),
  })
  @Type(() => Date)
  @IsDate()
  @MinDate(new Date(Date.now() - 1000))
  expiresAt!: Date;
}

export class JoinCollabChallengeDto {
  @ApiProperty({ description: 'Challenge id to join.' })
  @IsUUID()
  challengeId!: string;
}
