import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { LessonProgressStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracksService: TracksService,
  ) {}

  async findById(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        blocks: { orderBy: { order: 'asc' } },
        section: { include: { course: { select: { language: true } } } },
      },
    });

    if (!lesson || !lesson.isPublished) {
      throw new NotFoundException('Lesson not found');
    }

    const unlocked = await this.tracksService.isLessonUnlocked(userId, lessonId);
    if (!unlocked) {
      throw new ForbiddenException('Lesson is locked');
    }

    const progress = await this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    const trackView = await this.tracksService.getTrackView(
      userId,
      lesson.section.course.language,
    );

    return {
      lesson: {
        id: lesson.id,
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        estimatedMinutes: lesson.estimatedMinutes,
        xpReward: lesson.xpReward,
        difficulty: lesson.difficulty,
        progress: {
          status: progress?.status ?? LessonProgressStatus.NOT_STARTED,
          progressPercent: progress?.progressPercent ?? 0,
          isCompleted: progress?.isCompleted ?? false,
        },
        blocks: lesson.blocks.map((b) => ({
          id: b.id,
          type: b.type,
          order: b.order,
          payload: b.payload,
        })),
      },
      sidebar: {
        currentTrack: {
          title: trackView.title,
          progressPercent: trackView.progressPercent,
        },
        sections: trackView.sections,
      },
    };
  }
}
