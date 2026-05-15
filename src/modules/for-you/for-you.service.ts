import { Injectable } from '@nestjs/common';
import { ProgrammingLanguage } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Lesson row joined with its course's language — Lesson no longer holds language directly.
interface LessonWithLanguage {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  xpReward: number;
  difficulty: import('@prisma/client').LessonDifficulty;
  order: number;
  sectionId: string;
  language: ProgrammingLanguage;
  sectionOrder: number;
}

@Injectable()
export class ForYouService {
  constructor(private readonly prisma: PrismaService) {}

  async getForYou(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { onboarding: true },
    });

    // Pull every published lesson with its course language attached.
    // Sequence = section.order ASC, then lesson.order ASC.
    const lessonRows = await this.prisma.lesson.findMany({
      where: { isPublished: true, section: { course: { isPublished: true } } },
      include: { section: { include: { course: { select: { language: true } } } } },
      orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    });

    const allLessons: LessonWithLanguage[] = lessonRows.map((l) => ({
      id: l.id,
      title: l.title,
      description: l.description,
      estimatedMinutes: l.estimatedMinutes,
      xpReward: l.xpReward,
      difficulty: l.difficulty,
      order: l.order,
      sectionId: l.sectionId,
      language: l.section.course.language,
      sectionOrder: l.section.order,
    }));

    const progressRecords = await this.prisma.userLessonProgress.findMany({
      where: { userId },
    });
    const completedIds = new Set(
      progressRecords.filter((p) => p.isCompleted).map((p) => p.lessonId),
    );

    const todayUTC = startOfDayUTC(new Date());
    const todayActivity = await this.prisma.dailyActivity.findUnique({
      where: { userId_date: { userId, date: todayUTC } },
    });

    // ── Language scope ───────────────────────────────────────────────────────
    const selectedLanguage = user.onboarding?.selectedLanguage ?? null;
    const langLessons = selectedLanguage
      ? allLessons.filter((l) => l.language === selectedLanguage)
      : allLessons;

    const totalLessons = langLessons.length;
    const completedInLang = langLessons.filter((l) => completedIds.has(l.id)).length;
    const progressPercent =
      totalLessons > 0 ? Math.floor((completedInLang / totalLessons) * 100) : 0;

    // ── Recommendation ───────────────────────────────────────────────────────
    const unfinished = langLessons.filter((l) => !completedIds.has(l.id));

    let recommendedLesson: LessonWithLanguage | null = null;

    if (completedInLang === 0) {
      recommendedLesson = langLessons[0] ?? null;
    } else if (unfinished.length > 0) {
      recommendedLesson = unfinished[0];
    } else {
      const completedInLangLessons = langLessons.filter((l) => completedIds.has(l.id));
      recommendedLesson =
        completedInLangLessons[completedInLangLessons.length - 1] ?? langLessons[0] ?? null;
    }

    // ── Next lessons queue (5 from recommended) ──────────────────────────────
    const startIndex = recommendedLesson
      ? langLessons.findIndex((l) => l.id === recommendedLesson!.id)
      : 0;

    const nextLessons = langLessons.slice(startIndex, startIndex + 5).map((lesson) => {
      const isCompleted = completedIds.has(lesson.id);
      return {
        id: lesson.id,
        title: lesson.title,
        isCompleted,
        isLocked: !isCompleted && lesson.id !== recommendedLesson?.id,
        language: lesson.language,
        difficulty: lesson.difficulty,
      };
    });

    // ── Tracks per language ──────────────────────────────────────────────────
    const languageMap = new Map<ProgrammingLanguage, LessonWithLanguage[]>();
    for (const lesson of allLessons) {
      if (!languageMap.has(lesson.language)) languageMap.set(lesson.language, []);
      languageMap.get(lesson.language)!.push(lesson);
    }

    const tracks = Array.from(languageMap.entries()).map(([language, lessons]) => {
      const completedCount = lessons.filter((l) => completedIds.has(l.id)).length;
      const total = lessons.length;
      return {
        language,
        progressPercent: total > 0 ? Math.round((completedCount / total) * 100) : 0,
        completedLessons: completedCount,
        totalLessons: total,
      };
    });

    if (selectedLanguage) {
      tracks.sort((a, b) => {
        if (a.language === selectedLanguage) return -1;
        if (b.language === selectedLanguage) return 1;
        return 0;
      });
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    const totalMinutesLearned = allLessons
      .filter((l) => completedIds.has(l.id))
      .reduce((acc, l) => acc + l.estimatedMinutes, 0);

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
          }
        : null,
      dailyProgress: {
        completedLessons: todayActivity?.lessonsCompleted ?? 0,
        totalLessons: langLessons.length,
      },
      recommendedLesson: recommendedLesson
        ? {
            id: recommendedLesson.id,
            title: recommendedLesson.title,
            description: recommendedLesson.description,
            estimatedMinutes: recommendedLesson.estimatedMinutes,
            xpReward: recommendedLesson.xpReward,
            difficulty: recommendedLesson.difficulty,
            language: recommendedLesson.language,
            progressPercent,
            completedLessons: completedInLang,
            totalLessons,
          }
        : null,
      nextLessons,
      tracks,
      stats: {
        completedLessons: completedIds.size,
        totalMinutesLearned,
      },
    };
  }
}
