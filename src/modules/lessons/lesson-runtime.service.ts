import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LessonBlockType, LessonProgressStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { TracksService } from '../tracks/tracks.service';
import { CompleteBlockDto } from './dto/complete-block.dto';
import { XpService } from './xp.service';

interface QuizPayload {
  question: string;
  answers: string[];
  correctAnswer: number;
  explanation?: string;
}

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class LessonRuntimeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tracksService: TracksService,
    private readonly xpService: XpService,
  ) {}

  // ── POST /lessons/:id/start ────────────────────────────────────────────────

  async start(lessonId: string, userId: string) {
    await this.requireUnlockedLesson(lessonId, userId);

    const now = new Date();
    const existing = await this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    // Promote NOT_STARTED → IN_PROGRESS on start; never downgrade COMPLETED.
    const nextStatus =
      !existing || existing.status === LessonProgressStatus.NOT_STARTED
        ? LessonProgressStatus.IN_PROGRESS
        : existing.status;

    const progress = existing
      ? await this.prisma.userLessonProgress.update({
          where: { userId_lessonId: { userId, lessonId } },
          data: { lastOpenedAt: now, status: nextStatus },
        })
      : await this.prisma.userLessonProgress.create({
          data: { userId, lessonId, status: nextStatus, lastOpenedAt: now },
        });

    return {
      lessonId,
      started: true,
      progress: {
        status: progress.status,
        progressPercent: progress.progressPercent,
        isCompleted: progress.isCompleted,
      },
    };
  }

  // ── POST /lessons/:lessonId/blocks/:blockId/complete ───────────────────────

  async completeBlock(
    lessonId: string,
    blockId: string,
    userId: string,
    dto: CompleteBlockDto,
  ) {
    await this.requireUnlockedLesson(lessonId, userId);

    const block = await this.prisma.lessonBlock.findUnique({ where: { id: blockId } });
    if (!block || block.lessonId !== lessonId) {
      throw new NotFoundException('Block not found');
    }

    let correct: boolean | undefined;

    if (block.type === LessonBlockType.QUIZ) {
      const payload = block.payload as unknown as QuizPayload;
      if (dto.answer === undefined) {
        throw new BadRequestException('Quiz blocks require an answer');
      }
      correct = dto.answer === payload.correctAnswer;
    }

    // Mark complete iff:
    //   - non-quiz block (always completable on submit)
    //   - quiz block with correct answer
    const blockCompleted = block.type !== LessonBlockType.QUIZ || correct === true;

    if (blockCompleted) {
      await this.prisma.userLessonBlockProgress.upsert({
        where: { userId_blockId: { userId, blockId } },
        create: { userId, blockId, isCompleted: true, completedAt: new Date() },
        update: { isCompleted: true, completedAt: new Date() },
      });
      await this.recomputeLessonProgress(lessonId, userId);
    }

    return block.type === LessonBlockType.QUIZ
      ? { correct: correct === true, blockCompleted }
      : { blockCompleted };
  }

  // ── POST /lessons/:id/complete ─────────────────────────────────────────────

  async complete(lessonId: string, userId: string) {
    await this.requireUnlockedLesson(lessonId, userId);

    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { blocks: { select: { id: true } } },
    });
    if (!lesson || !lesson.isPublished) {
      throw new NotFoundException('Lesson not found');
    }

    const existing = await this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const alreadyCompleted = existing?.isCompleted ?? false;

    // Gate: every block must have a UserLessonBlockProgress with isCompleted=true.
    if (!alreadyCompleted && lesson.blocks.length > 0) {
      const completedBlockCount = await this.prisma.userLessonBlockProgress.count({
        where: {
          userId,
          blockId: { in: lesson.blocks.map((b) => b.id) },
          isCompleted: true,
        },
      });
      if (completedBlockCount < lesson.blocks.length) {
        throw new BadRequestException('Lesson requirements are not completed');
      }
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    // ── Streak ─────────────────────────────────────────────────────────────
    const todayUTC = startOfDayUTC(new Date());
    const lastActivity = user.lastActivityDate;
    let newStreak = user.streak;
    let updateStreak = false;

    if (!alreadyCompleted) {
      if (!lastActivity) {
        newStreak = 1;
        updateStreak = true;
      } else {
        const lastDay = startOfDayUTC(lastActivity);
        const diffDays = Math.floor(
          (todayUTC.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24),
        );
        if (diffDays === 1) {
          newStreak = user.streak + 1;
          updateStreak = true;
        } else if (diffDays > 1) {
          newStreak = 1;
          updateStreak = true;
        }
      }
    }

    const earnedXp = alreadyCompleted ? 0 : lesson.xpReward;
    const newXp = user.xp + earnedXp;
    const newLevel = XpService.level(newXp);

    await this.prisma.$transaction(async (tx) => {
      await tx.userLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          status: LessonProgressStatus.COMPLETED,
          isCompleted: true,
          progressPercent: 100,
          xpEarned: earnedXp,
          completedAt: new Date(),
          lastOpenedAt: new Date(),
        },
        update: {
          status: LessonProgressStatus.COMPLETED,
          isCompleted: true,
          progressPercent: 100,
          lastOpenedAt: new Date(),
          ...(!alreadyCompleted && { xpEarned: earnedXp, completedAt: new Date() }),
        },
      });

      if (!alreadyCompleted) {
        await this.xpService.awardInTx(tx, {
          userId,
          amount: earnedXp,
          reason: 'lesson_complete',
          lessonId,
          currentXp: user.xp,
        });

        if (updateStreak) {
          await tx.user.update({
            where: { id: userId },
            data: { streak: newStreak, lastActivityDate: new Date() },
          });
        }

        await tx.dailyActivity.upsert({
          where: { userId_date: { userId, date: todayUTC } },
          create: { userId, date: todayUTC, lessonsCompleted: 1 },
          update: { lessonsCompleted: { increment: 1 } },
        });
      }
    });

    return { success: true, earnedXp, totalXp: newXp, streak: newStreak, level: newLevel };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async requireUnlockedLesson(lessonId: string, userId: string): Promise<void> {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || !lesson.isPublished) {
      throw new NotFoundException('Lesson not found');
    }
    const unlocked = await this.tracksService.isLessonUnlocked(userId, lessonId);
    if (!unlocked) {
      throw new ForbiddenException('Lesson is locked');
    }
  }

  // Lesson.progressPercent = completed blocks / total blocks * 100 (rounded).
  // Called after every block completion to keep the percentage accurate.
  private async recomputeLessonProgress(lessonId: string, userId: string): Promise<void> {
    const blocks = await this.prisma.lessonBlock.findMany({
      where: { lessonId },
      select: { id: true },
    });
    const total = blocks.length;
    if (total === 0) return;

    const completed = await this.prisma.userLessonBlockProgress.count({
      where: { userId, blockId: { in: blocks.map((b) => b.id) }, isCompleted: true },
    });
    const percent = Math.round((completed / total) * 100);

    await this.prisma.userLessonProgress.upsert({
      where: { userId_lessonId: { userId, lessonId } },
      create: {
        userId,
        lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        progressPercent: percent,
      },
      update: {
        progressPercent: percent,
        // Promote NOT_STARTED → IN_PROGRESS once any block is completed.
        // Don't downgrade COMPLETED back to IN_PROGRESS.
      },
    });

    // Separate update for status transition — Prisma can't conditionally set in upsert.update.
    await this.prisma.userLessonProgress.updateMany({
      where: { userId, lessonId, status: LessonProgressStatus.NOT_STARTED },
      data: { status: LessonProgressStatus.IN_PROGRESS },
    });
  }
}
