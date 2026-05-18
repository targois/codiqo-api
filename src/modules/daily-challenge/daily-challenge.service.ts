import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DailyChallenge } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BadgesService, NewBadgeBrief } from '../badges/badges.service';
import { XpService } from '../lessons/xp.service';
import { validate } from './challenge-validator';
import { SubmitChallengeDto } from './dto/submit-challenge.dto';

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Day index used by the deterministic rotation. UTC midnight epoch / 86_400s.
function dayIndexUTC(date: Date): number {
  return Math.floor(startOfDayUTC(date).getTime() / 86_400_000);
}

export interface GetDailyChallengeResult {
  id: string;
  slug: string;
  title: string;
  description: string;
  difficulty: string;
  estimatedMinutes: number;
  xpReward: number;
  language: string;
  starterCode: string;
  expectedOutput: string;
  hint: string | null;
  completed: boolean;
}

export type SubmitChallengeResult =
  | {
      correct: true;
      earnedXp: number;
      streak: number;
      totalXp: number;
      level: number;
      xpToday: number;
      newBadges: NewBadgeBrief[];
      message: string;
    }
  | {
      correct: false;
      message: string;
      hint: string | null;
    };

@Injectable()
export class DailyChallengeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: XpService,
    private readonly badgesService: BadgesService,
  ) {}

  // GET /api/daily-challenge
  async getToday(userId: string): Promise<GetDailyChallengeResult> {
    const challenge = await this.pickTodaysChallenge();
    const userRow = await this.prisma.userDailyChallenge.findUnique({
      where: { userId_challengeId: { userId, challengeId: challenge.id } },
      select: { isCompleted: true },
    });

    return {
      id: challenge.id,
      slug: challenge.slug,
      title: challenge.title,
      description: challenge.description,
      difficulty: challenge.difficulty,
      estimatedMinutes: challenge.estimatedMinutes,
      xpReward: challenge.xpReward,
      language: challenge.language,
      starterCode: challenge.starterCode,
      expectedOutput: challenge.expectedOutput,
      hint: challenge.hint,
      completed: userRow?.isCompleted ?? false,
    };
  }

  // POST /api/daily-challenge/:id/submit
  async submit(
    userId: string,
    challengeId: string,
    dto: SubmitChallengeDto,
  ): Promise<SubmitChallengeResult> {
    const challenge = await this.prisma.dailyChallenge.findUnique({
      where: { id: challengeId },
    });
    if (!challenge) throw new NotFoundException('Daily challenge not found');

    if (!challenge.expectedSolution) {
      throw new BadRequestException(
        'Challenge has no expected solution configured',
      );
    }

    const existingState = await this.prisma.userDailyChallenge.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });

    // Already completed — idempotent: no XP, no streak change, just report state.
    if (existingState?.isCompleted) {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { xp: true, level: true, streak: true },
      });
      const xpToday = await this.sumXpToday(userId);
      return {
        correct: true,
        earnedXp: 0,
        streak: user.streak,
        totalXp: user.xp,
        level: user.level,
        xpToday,
        newBadges: [],
        message: 'Challenge already completed',
      };
    }

    const outcome = validate(
      challenge.validationType,
      dto.code,
      challenge.expectedSolution,
    );

    if (!outcome.correct) {
      // Record the latest attempt so the editor can rehydrate it.
      await this.prisma.userDailyChallenge.upsert({
        where: { userId_challengeId: { userId, challengeId } },
        create: { userId, challengeId, submittedCode: dto.code, isCompleted: false },
        update: { submittedCode: dto.code },
      });
      return {
        correct: false,
        message: 'Solution is not correct yet.',
        hint: challenge.hint,
      };
    }

    // ── First correct submission ─────────────────────────────────────────────
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

    const newXp = user.xp + challenge.xpReward;
    const newLevel = XpService.level(newXp);

    await this.prisma.$transaction(async (tx) => {
      await tx.userDailyChallenge.upsert({
        where: { userId_challengeId: { userId, challengeId } },
        create: {
          userId,
          challengeId,
          submittedCode: dto.code,
          isCompleted: true,
          completedAt: new Date(),
        },
        update: {
          submittedCode: dto.code,
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      await this.xpService.awardInTx(tx, {
        userId,
        amount: challenge.xpReward,
        reason: 'daily_challenge_complete',
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
    });

    // xpToday is computed AFTER the transaction commits so it includes the
    // award we just made plus any prior XPTransactions for today.
    const xpToday = await this.sumXpToday(userId);
    const newBadges = await this.badgesService.checkAndUnlock(userId);

    return {
      correct: true,
      earnedXp: challenge.xpReward,
      streak: newStreak,
      totalXp: newXp,
      level: newLevel,
      xpToday,
      newBadges,
      message: 'Challenge completed!',
    };
  }

  // Sum of every XPTransaction this user earned since today's UTC midnight.
  // Shared with /api/progress (same `(userId, createdAt)` index).
  private async sumXpToday(userId: string): Promise<number> {
    const todayUTC = startOfDayUTC(new Date());
    const agg = await this.prisma.xPTransaction.aggregate({
      where: { userId, createdAt: { gte: todayUTC } },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  // Deterministic rotation: dayIndex(UTC) % published count.
  // Same challenge for everyone on a given day. No per-user shuffle.
  private async pickTodaysChallenge(): Promise<DailyChallenge> {
    const published = await this.prisma.dailyChallenge.findMany({
      orderBy: { createdAt: 'asc' },
    });
    if (published.length === 0) {
      throw new NotFoundException('No daily challenges configured');
    }
    const idx = dayIndexUTC(new Date()) % published.length;
    return published[idx];
  }
}
