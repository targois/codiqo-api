import { Injectable, NotFoundException } from '@nestjs/common';
import { ProgrammingLanguage } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface TrackLessonView {
  id: string;
  title: string;
  isCompleted: boolean;
  isLocked: boolean;
}

export interface TrackSectionView {
  id: string;
  title: string;
  lessons: TrackLessonView[];
}

export interface TrackView {
  id: string;
  title: string;
  description: string;
  progressPercent: number;
  sections: TrackSectionView[];
}

interface SequencedLesson {
  id: string;
  isCompleted: boolean;
}

@Injectable()
export class TracksService {
  constructor(private readonly prisma: PrismaService) {}

  // Single source of truth for course → sections → lessons + per-user lock/complete state.
  // Used by both GET /api/tracks/:language and the lesson-page sidebar.
  async getTrackView(userId: string, language: ProgrammingLanguage): Promise<TrackView> {
    const course = await this.prisma.course.findFirst({
      where: { language, isPublished: true },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              select: { id: true, title: true, order: true },
            },
          },
        },
      },
    });

    if (!course) throw new NotFoundException('Track not found');

    const allLessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const completedSet = await this.completedLessonIds(userId, allLessonIds);

    // Sequential order across the whole course: section.order ASC, then lesson.order ASC.
    // (sections + lessons already arrived sorted from the query above.)
    const sequencedLessons: SequencedLesson[] = course.sections.flatMap((s) =>
      s.lessons.map((l) => ({ id: l.id, isCompleted: completedSet.has(l.id) })),
    );

    const lockMap = this.computeLockMap(sequencedLessons);

    const sections: TrackSectionView[] = course.sections.map((section) => ({
      id: section.id,
      title: section.title,
      lessons: section.lessons.map((l) => ({
        id: l.id,
        title: l.title,
        isCompleted: completedSet.has(l.id),
        isLocked: lockMap.get(l.id) ?? true,
      })),
    }));

    const totalCount = allLessonIds.length;
    const completedCount = completedSet.size;
    const progressPercent =
      totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      id: course.id,
      title: course.title,
      description: course.description,
      progressPercent,
      sections,
    };
  }

  // MVP unlock rule: lesson N unlocks once lesson N-1 in the course-wide sequence is completed.
  // First lesson in the course is always unlocked. Completed lessons remain unlocked.
  computeLockMap(lessons: SequencedLesson[]): Map<string, boolean> {
    const map = new Map<string, boolean>();
    let previousCompleted = true;
    for (const lesson of lessons) {
      const locked = !lesson.isCompleted && !previousCompleted;
      map.set(lesson.id, locked);
      previousCompleted = lesson.isCompleted;
    }
    return map;
  }

  async isLessonUnlocked(userId: string, lessonId: string): Promise<boolean> {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { section: { select: { courseId: true } } },
    });
    if (!lesson) return false;

    const sections = await this.prisma.courseSection.findMany({
      where: { courseId: lesson.section.courseId },
      orderBy: { order: 'asc' },
      include: {
        lessons: {
          where: { isPublished: true },
          orderBy: { order: 'asc' },
          select: { id: true },
        },
      },
    });

    const ids = sections.flatMap((s) => s.lessons.map((l) => l.id));
    const completedSet = await this.completedLessonIds(userId, ids);
    const sequenced: SequencedLesson[] = ids.map((id) => ({
      id,
      isCompleted: completedSet.has(id),
    }));
    const lockMap = this.computeLockMap(sequenced);
    return !(lockMap.get(lessonId) ?? true);
  }

  private async completedLessonIds(
    userId: string,
    lessonIds: string[],
  ): Promise<Set<string>> {
    if (lessonIds.length === 0) return new Set();
    const records = await this.prisma.userLessonProgress.findMany({
      where: { userId, lessonId: { in: lessonIds }, isCompleted: true },
      select: { lessonId: true },
    });
    return new Set(records.map((r) => r.lessonId));
  }
}
