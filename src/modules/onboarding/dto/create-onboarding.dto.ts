import { ApiProperty } from '@nestjs/swagger';
import {
  DailyLearningTime,
  LearningGoal,
  PreferredLearningFormat,
  ProgrammingLanguage,
  UserLearningLevel,
} from '@prisma/client';
import { IsEnum } from 'class-validator';

export class CreateOnboardingDto {
  @ApiProperty({ enum: ProgrammingLanguage, example: ProgrammingLanguage.TYPESCRIPT })
  @IsEnum(ProgrammingLanguage)
  selectedLanguage: ProgrammingLanguage;

  @ApiProperty({ enum: UserLearningLevel, example: UserLearningLevel.BEGINNER })
  @IsEnum(UserLearningLevel)
  currentLevel: UserLearningLevel;

  @ApiProperty({ enum: LearningGoal, example: LearningGoal.CAREER })
  @IsEnum(LearningGoal)
  learningGoal: LearningGoal;

  @ApiProperty({ enum: DailyLearningTime, example: DailyLearningTime.TEN_MIN })
  @IsEnum(DailyLearningTime)
  dailyTime: DailyLearningTime;

  @ApiProperty({ enum: PreferredLearningFormat, example: PreferredLearningFormat.MIXED })
  @IsEnum(PreferredLearningFormat)
  preferredFormat: PreferredLearningFormat;
}
