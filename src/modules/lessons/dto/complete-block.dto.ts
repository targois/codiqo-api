import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class CompleteBlockDto {
  // Required only for QUIZ blocks: zero-based index into payload.answers.
  @ApiPropertyOptional({ description: 'Quiz answer index (0-based)', example: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  answer?: number;
}
