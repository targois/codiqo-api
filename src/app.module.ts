import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { BadgesModule } from './modules/badges/badges.module';
import { CollaborativeChallengesModule } from './modules/collaborative-challenges/collaborative-challenges.module';
import { DailyChallengeModule } from './modules/daily-challenge/daily-challenge.module';
import { ForYouModule } from './modules/for-you/for-you.module';
import { FriendsModule } from './modules/friends/friends.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ProfileModule } from './modules/profile/profile.module';
import { ProgressModule } from './modules/progress/progress.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { SkillMasteryModule } from './modules/skill-mastery/skill-mastery.module';
import { SpacedRepetitionModule } from './modules/spaced-repetition/spaced-repetition.module';
import { TracksModule } from './modules/tracks/tracks.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OnboardingModule,
    BadgesModule,
    SkillMasteryModule,
    LessonsModule,
    TracksModule,
    ForYouModule,
    ProgressModule,
    ProfileModule,
    DailyChallengeModule,
    RecommendationsModule,
    FriendsModule,
    LeaderboardModule,
    CollaborativeChallengesModule,
    SpacedRepetitionModule,
  ],
})
export class AppModule {}
