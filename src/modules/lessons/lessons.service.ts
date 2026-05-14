import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        theoryBlocks: { orderBy: { order: 'asc' } },
        quizQuestions: {
          orderBy: { order: 'asc' },
          include: { answers: true },
        },
        codeTasks: { orderBy: { order: 'asc' } },
      },
    });

    if (!lesson || !lesson.isPublished) {
      throw new NotFoundException('Lesson not found');
    }

    const progress = await this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });

    return {
      ...lesson,
      userProgress: {
        completed: progress?.isCompleted ?? false,
        progressPercent: progress?.progressPercent ?? 0,
      },
    };
  }

  async complete(lessonId: string, userId: string) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson || !lesson.isPublished) {
      throw new NotFoundException('Lesson not found');
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const existing = await this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const alreadyCompleted = existing?.isCompleted ?? false;

    const earnedXp = alreadyCompleted ? 0 : lesson.xpReward;
    const totalXp = user.xp + earnedXp;
    const newLevel = Math.floor(totalXp / 100) + 1;

    // ── Streak logic ─────────────────────────────────────────────────────────
    const todayUTC = startOfDayUTC(new Date());
    const lastActivity = user.lastActivityDate;
    let newStreak = user.streak;
    let updateActivity = false;

    if (!alreadyCompleted) {
      if (!lastActivity) {
        newStreak = 1;
        updateActivity = true;
      } else {
        const lastDay = startOfDayUTC(lastActivity);
        const diffDays = Math.floor(
          (todayUTC.getTime() - lastDay.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (diffDays === 0) {
          // Already had activity today — streak unchanged
        } else if (diffDays === 1) {
          newStreak = user.streak + 1;
          updateActivity = true;
        } else {
          newStreak = 1;
          updateActivity = true;
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    await this.prisma.$transaction(async (tx) => {
      await tx.userLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          isCompleted: true,
          progressPercent: 100,
          xpEarned: earnedXp,
          completedAt: new Date(),
          lastOpenedAt: new Date(),
        },
        update: {
          isCompleted: true,
          progressPercent: 100,
          lastOpenedAt: new Date(),
          ...(!alreadyCompleted && {
            xpEarned: earnedXp,
            completedAt: new Date(),
          }),
        },
      });

      if (!alreadyCompleted) {
        await tx.user.update({
          where: { id: userId },
          data: {
            xp: { increment: earnedXp },
            level: newLevel,
            ...(updateActivity && {
              streak: newStreak,
              lastActivityDate: new Date(),
            }),
          },
        });

        await tx.dailyActivity.upsert({
          where: { userId_date: { userId, date: todayUTC } },
          create: { userId, date: todayUTC, lessonsCompleted: 1 },
          update: { lessonsCompleted: { increment: 1 } },
        });
      }
    });

    return {
      success: true,
      earnedXp,
      totalXp,
      streak: newStreak,
      level: newLevel,
    };
  }
}
