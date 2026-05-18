import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SkillTag } from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CompleteLessonDto {
  @ApiPropertyOptional({
    description:
      'XP to award on first completion. Defaults to 10. Capped at 200 to bound abuse.',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(200)
  xpReward?: number;

  @ApiPropertyOptional({
    description:
      'Skills this lesson exercised. Each entry is recorded as a `correct` attempt in the BKT mastery model.',
    enum: SkillTag,
    isArray: true,
    example: [SkillTag.VARIABLES, SkillTag.LOOPS],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SkillTag, { each: true })
  skillTags?: SkillTag[];
}

export class CompleteLessonParams {
  @ApiProperty({
    description:
      'Stable frontend-owned lesson identifier (e.g. "python-print-first-output").',
    example: 'python-print-first-output',
  })
  @IsString()
  id!: string;
}
