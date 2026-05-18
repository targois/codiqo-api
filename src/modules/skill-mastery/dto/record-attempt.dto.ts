import { ApiProperty } from '@nestjs/swagger';
import { SkillTag } from '@prisma/client';
import { IsBoolean, IsEnum } from 'class-validator';

export class RecordAttemptDto {
  @ApiProperty({ enum: SkillTag, example: SkillTag.LOOPS })
  @IsEnum(SkillTag)
  skillTag!: SkillTag;

  @ApiProperty({ description: 'Whether the user got this attempt right.' })
  @IsBoolean()
  correct!: boolean;
}
