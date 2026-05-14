import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ForYouModule } from './modules/for-you/for-you.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { ProgressModule } from './modules/progress/progress.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    UsersModule,
    AuthModule,
    OnboardingModule,
    LessonsModule,
    ForYouModule,
    ProgressModule,
  ],
})
export class AppModule {}
