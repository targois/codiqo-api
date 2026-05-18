import { Injectable } from '@nestjs/common';
import { ProgrammingLanguage, UserLessonProgress } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  computeCurrentLessonId,
  computeUnlockedLessons,
} from '../../curriculum/registry';

export interface ProgressSummary {
  xp: number;
  level: number;
  streak: number;
  xpToday: number;
  completedLessonsCount: number;
  unlockedLessons: string[];
  completedLessons: string[];
  currentLessonId: string | null;
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ProgressService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/progress
  //
  // Aggregated progression state. `unlockedLessons` and `currentLessonId`
  // are computed against the user's selected language from onboarding —
  // they are empty / null if the user hasn't onboarded yet.
  async getSummary(userId: string): Promise<ProgressSummary> {
    const todayUTC = startOfDayUTC(new Date());

    const [user, completedRecords, xpTodayAgg] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          xp: true,
          level: true,
          streak: true,
          onboarding: {
            select: { selectedLanguage: true, startingLessonId: true },
          },
        },
      }),
      this.prisma.userLessonProgress.findMany({
        where: { userId, isCompleted: true },
        select: { lessonId: true },
      }),
      this.prisma.xPTransaction.aggregate({
        where: { userId, createdAt: { gte: todayUTC } },
        _sum: { amount: true },
      }),
    ]);

    const completedLessons = completedRecords.map((r) => r.lessonId);
    const completedSet = new Set(completedLessons);

    let unlockedLessons: string[] = [];
    let currentLessonId: string | null = null;

    if (user.onboarding) {
      const language: ProgrammingLanguage = user.onboarding.selectedLanguage;
      const start = user.onboarding.startingLessonId;
      unlockedLessons = computeUnlockedLessons(language, start, completedSet);
      currentLessonId = computeCurrentLessonId(language, start, completedSet);
    }

    return {
      xp: user.xp,
      level: user.level,
      streak: user.streak,
      xpToday: xpTodayAgg._sum.amount ?? 0,
      completedLessonsCount: completedLessons.length,
      unlockedLessons,
      completedLessons,
      currentLessonId,
    };
  }

  findAllForUser(userId: string): Promise<UserLessonProgress[]> {
    return this.prisma.userLessonProgress.findMany({ where: { userId } });
  }

  findForLesson(userId: string, lessonId: string): Promise<UserLessonProgress | null> {
    return this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
  }
}
