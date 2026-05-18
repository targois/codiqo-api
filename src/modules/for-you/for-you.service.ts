import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { computeCurrentLessonId } from '../../curriculum/registry';

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ForYouService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/for-you
  //
  // Homepage aggregator. Backend returns user state + completion state +
  // adaptive currentLessonId. Frontend owns the curriculum and renders
  // recommended/next lessons from its local registry.
  async getForYou(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { onboarding: true },
    });

    const completed = await this.prisma.userLessonProgress.findMany({
      where: { userId, isCompleted: true },
      select: { lessonId: true },
    });

    const todayUTC = startOfDayUTC(new Date());
    const todayActivity = await this.prisma.dailyActivity.findUnique({
      where: { userId_date: { userId, date: todayUTC } },
    });

    const completedLessons = completed.map((r) => r.lessonId);
    const completedSet = new Set(completedLessons);

    const currentLessonId = user.onboarding
      ? computeCurrentLessonId(
          user.onboarding.selectedLanguage,
          user.onboarding.startingLessonId,
          completedSet,
        )
      : null;

    return {
      user: {
        xp: user.xp,
        streak: user.streak,
        level: user.level,
        username: user.username,
        displayName: user.displayName,
      },
      onboarding: user.onboarding
        ? {
            selectedLanguage: user.onboarding.selectedLanguage,
            currentLevel: user.onboarding.currentLevel,
            startingLessonId: user.onboarding.startingLessonId,
          }
        : null,
      currentLessonId,
      completedLessons,
      dailyProgress: {
        completedLessons: todayActivity?.lessonsCompleted ?? 0,
      },
    };
  }
}
