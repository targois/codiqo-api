import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadgesService, NewBadgeBrief } from '../badges/badges.service';
import { SkillMasteryService } from '../skill-mastery/skill-mastery.service';
import { CompleteLessonDto } from './dto/complete-lesson.dto';
import { XpService } from './xp.service';

const DEFAULT_XP_REWARD = 10;

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export interface CompleteLessonResult {
  success: boolean;
  alreadyCompleted: boolean;
  earnedXp: number;
  totalXp: number;
  level: number;
  streak: number;
  newBadges: NewBadgeBrief[];
}

@Injectable()
export class LessonsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
    private readonly skillMasteryService: SkillMasteryService,
    private readonly badgesService: BadgesService,
  ) {}

  // POST /api/lessons/:id/complete
  //
  // Frontend owns lesson content & validation. Backend trusts the client
  // that the lesson was actually finished and only persists progression
  // state: completion, XP, streak, daily activity, and (if `skillTags` is
  // supplied) a coarse-grained `correct` attempt per tagged skill.
  async complete(
    lessonId: string,
    userId: string,
    dto: CompleteLessonDto,
  ): Promise<CompleteLessonResult> {
    const xpReward = dto.xpReward ?? DEFAULT_XP_REWARD;
    const skillTags = dto.skillTags ?? [];

    const existing = await this.prisma.userLessonProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
    });
    const alreadyCompleted = existing?.isCompleted ?? false;

    if (alreadyCompleted) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { xp: true, level: true, streak: true },
      });
      return {
        success: true,
        alreadyCompleted: true,
        earnedXp: 0,
        totalXp: user.xp,
        level: user.level,
        streak: user.streak,
        newBadges: [],
      };
    }

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const todayUTC = startOfDayUTC(new Date());
    let newStreak = user.streak;
    let updateStreak = false;

    if (!user.lastActivityDate) {
      newStreak = 1;
      updateStreak = true;
    } else {
      const lastDay = startOfDayUTC(user.lastActivityDate);
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

    const newXp = user.xp + xpReward;
    const newLevel = XpService.level(newXp);

    await this.prisma.$transaction(async (tx) => {
      await tx.userLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId } },
        create: {
          userId,
          lessonId,
          isCompleted: true,
          xpEarned: xpReward,
          completedAt: new Date(),
        },
        update: {
          isCompleted: true,
          xpEarned: xpReward,
          completedAt: new Date(),
        },
      });

      await this.xpService.awardInTx(tx, {
        userId,
        amount: xpReward,
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

      // Mark each tagged skill as one `correct` attempt for BKT. Per-quiz
      // accuracy lands via POST /api/skills/record; this is the coarser
      // "the user finished a lesson exercising these skills" signal.
      await this.skillMasteryService.recordBatch(
        userId,
        skillTags.map((skillTag) => ({ skillTag, correct: true })),
        tx,
      );
    });

    // Badge unlock check runs after the transaction commits — it needs to
    // see the new xp, mastery rows, etc. Newly unlocked badges piggy-back
    // on the completion response.
    const newBadges = await this.badgesService.checkAndUnlock(userId);

    return {
      success: true,
      alreadyCompleted: false,
      earnedXp: xpReward,
      totalXp: newXp,
      level: newLevel,
      streak: newStreak,
      newBadges,
    };
  }
}
