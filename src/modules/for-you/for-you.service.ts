import { Injectable } from '@nestjs/common';
import { LessonDifficulty } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ForYouService {
  constructor(private readonly prisma: PrismaService) {}

  async getForYou(userId: string) {
    // Single round-trip for user + onboarding
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { onboarding: true },
    });

    // All published lessons ordered by progression
    const lessons = await this.prisma.lesson.findMany({
      where: { isPublished: true },
      orderBy: { order: 'asc' },
    });

    // All user progress — one query, no N+1
    const progressRecords = await this.prisma.userLessonProgress.findMany({
      where: { userId },
    });
    const progressMap = new Map(progressRecords.map((p) => [p.lessonId, p]));

    // Today's activity
    const todayUTC = startOfDayUTC(new Date());
    const todayActivity = await this.prisma.dailyActivity.findUnique({
      where: { userId_date: { userId, date: todayUTC } },
    });

    // ── Completed lesson stats ───────────────────────────────────────────────
    const completedIds = new Set(
      progressRecords.filter((p) => p.isCompleted).map((p) => p.lessonId),
    );
    const completedLessons = lessons.filter((l) => completedIds.has(l.id));
    const totalMinutesLearned = completedLessons.reduce(
      (acc, l) => acc + l.estimatedMinutes,
      0,
    );

    // ── Recommendation logic ─────────────────────────────────────────────────
    const unfinished = lessons.filter((l) => !completedIds.has(l.id));

    let recommendedLesson = unfinished[0] ?? null; // default: first unfinished by order

    if (completedIds.size === 0 && user.onboarding) {
      // New user: prefer a BEGINNER lesson in their chosen language
      const match = unfinished.find(
        (l) =>
          l.language === user.onboarding!.selectedLanguage &&
          l.difficulty === LessonDifficulty.BEGINNER,
      );
      if (match) recommendedLesson = match;
    }

    // ── Next lessons queue (5 lessons from current position) ─────────────────
    const startIndex = recommendedLesson
      ? lessons.findIndex((l) => l.id === recommendedLesson!.id)
      : 0;

    const nextLessons = lessons.slice(startIndex, startIndex + 5).map((lesson) => {
      const isCompleted = completedIds.has(lesson.id);
      // Completed lessons are always visible; recommended (next) lesson is unlocked;
      // everything further in the queue is locked until the user progresses.
      const isLocked = !isCompleted && lesson.id !== recommendedLesson?.id;
      return {
        id: lesson.id,
        title: lesson.title,
        isCompleted,
        isLocked,
      };
    });

    return {
      user: {
        xp: user.xp,
        streak: user.streak,
        level: user.level,
      },
      onboarding: user.onboarding
        ? {
            selectedLanguage: user.onboarding.selectedLanguage,
            currentLevel: user.onboarding.currentLevel,
          }
        : null,
      dailyProgress: {
        completedLessons: todayActivity?.lessonsCompleted ?? 0,
        totalLessons: lessons.length,
      },
      recommendedLesson: recommendedLesson
        ? {
            id: recommendedLesson.id,
            title: recommendedLesson.title,
            description: recommendedLesson.description,
            estimatedMinutes: recommendedLesson.estimatedMinutes,
            xpReward: recommendedLesson.xpReward,
            difficulty: recommendedLesson.difficulty,
          }
        : null,
      nextLessons,
      stats: {
        completedLessons: completedIds.size,
        totalMinutesLearned,
      },
    };
  }
}
