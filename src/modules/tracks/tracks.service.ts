import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgrammingLanguage } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  computeCurrentLessonId,
  computeUnlockedLessons,
  findModule,
  getTrack,
  resolveLanguageSlug,
  trackLessonSequence,
} from '../../curriculum/registry';

export interface TrackProgressResult {
  language: string;
  iconKey: string;
  accentColor: string;
  currentLessonId: string | null;
  completedLessons: string[];
  unlockedLessons: string[];
  progressPercent: number;
  completedLessonsCount: number;
  totalLessonsCount: number;
  currentModule: { id: string; title: string } | null;
  xp: number;
  streak: number;
}

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  resolveLanguage(slug: string): ProgrammingLanguage {
    const lang = resolveLanguageSlug(slug);
    if (!lang) throw new NotFoundException('Unknown language');
    return lang;
  }

  // GET /api/tracks/:language/progress
  //
  // Full per-language progression aggregation. Frontend uses this to render
  // the track page, highlight the current module/lesson, and restore
  // progression state.
  async getProgress(
    userId: string,
    language: ProgrammingLanguage,
  ): Promise<TrackProgressResult> {
    const track = getTrack(language);
    const sequence = trackLessonSequence(language);

    const [user, completedRecords] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          xp: true,
          streak: true,
          onboarding: {
            select: { selectedLanguage: true, startingLessonId: true },
          },
        },
      }),
      this.prisma.userLessonProgress.findMany({
        where: {
          userId,
          isCompleted: true,
          lessonId: { startsWith: `${track.slug}-` },
        },
        select: { lessonId: true },
      }),
    ]);

    const completedLessons = completedRecords.map((r) => r.lessonId);
    const completedSet = new Set(completedLessons);

    // Adaptive start only applies to the user's onboarded language.
    const startingLessonId =
      user.onboarding && user.onboarding.selectedLanguage === language
        ? user.onboarding.startingLessonId
        : null;

    const unlockedLessons = computeUnlockedLessons(
      language,
      startingLessonId,
      completedSet,
    );
    const currentLessonId = computeCurrentLessonId(
      language,
      startingLessonId,
      completedSet,
    );
    const moduleSpec = findModule(language, currentLessonId);

    const totalLessonsCount = sequence.length;
    const inTrackCompleted = completedLessons.filter((id) => sequence.includes(id));
    const progressPercent =
      totalLessonsCount > 0
        ? Math.min(100, Math.round((inTrackCompleted.length / totalLessonsCount) * 100))
        : 0;

    return {
      language: track.slug,
      iconKey: track.iconKey,
      accentColor: track.accentColor,
      currentLessonId,
      completedLessons,
      unlockedLessons,
      progressPercent,
      completedLessonsCount: inTrackCompleted.length,
      totalLessonsCount,
      currentModule: moduleSpec ? { id: moduleSpec.id, title: moduleSpec.title } : null,
      xp: user.xp,
      streak: user.streak,
    };
  }
}
