import { ApiProperty } from '@nestjs/swagger';
import { SkillTag } from '@prisma/client';
import { IsEnum, IsInt, Max, Min } from 'class-validator';

export class RateReviewDto {
  @ApiProperty({ enum: SkillTag })
  @IsEnum(SkillTag)
  skillTag!: SkillTag;

  @ApiProperty({
    description:
      'Recall quality on the SM-2 scale (0..5). <3 = forgot, ≥3 = recalled. 5 = perfect.',
    minimum: 0,
    maximum: 5,
    example: 4,
  })
  @IsInt()
  @Min(0)
  @Max(5)
  quality!: number;
}
