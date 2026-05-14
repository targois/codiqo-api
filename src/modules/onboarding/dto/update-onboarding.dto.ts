import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DailyLearningTime,
  LearningGoal,
  PreferredLearningFormat,
  ProgrammingLanguage,
  UserLearningLevel,
} from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateOnboardingDto {
  @ApiPropertyOptional({ enum: ProgrammingLanguage })
  @IsEnum(ProgrammingLanguage)
  @IsOptional()
  selectedLanguage?: ProgrammingLanguage;

  @ApiPropertyOptional({ enum: UserLearningLevel })
  @IsEnum(UserLearningLevel)
  @IsOptional()
  currentLevel?: UserLearningLevel;

  @ApiPropertyOptional({ enum: LearningGoal })
  @IsEnum(LearningGoal)
  @IsOptional()
  learningGoal?: LearningGoal;

  @ApiPropertyOptional({ enum: DailyLearningTime })
  @IsEnum(DailyLearningTime)
  @IsOptional()
  dailyTime?: DailyLearningTime;

  @ApiPropertyOptional({ enum: PreferredLearningFormat })
  @IsEnum(PreferredLearningFormat)
  @IsOptional()
  preferredFormat?: PreferredLearningFormat;
}
