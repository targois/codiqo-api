import { Injectable } from '@nestjs/common';
import { Prisma, SkillTag } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BKT, bktUpdate, confidenceLevel, irtInitialMastery } from '../../adaptive/bkt';

export interface SkillMasterySummary {
  skillTag: SkillTag;
  masteryScore: number;
  confidenceLevel: number;
  correctAnswers: number;
  incorrectAnswers: number;
  totalAttempts: number;
}

@Injectable()
export class SkillMasteryService {
  constructor(private readonly prisma: PrismaService) {}

  // Apply a single attempt to the user's mastery state for one skill.
  // Used by:
  //   - POST /api/skills/record         (frontend per-attempt event)
  //   - lesson complete + challenge submit (coarse-grained `correct: true`)
  //
  // Accepts an optional Prisma transaction client so callers can fold this
  // into the same transaction that awards XP / records DailyActivity, etc.
  async recordAttempt(
    userId: string,
    skillTag: SkillTag,
    correct: boolean,
    tx?: Prisma.TransactionClient,
  ): Promise<SkillMasterySummary> {
    const client = tx ?? this.prisma;

    const existing = await client.userSkillMastery.findUnique({
      where: { userId_skillTag: { userId, skillTag } },
    });

    // Seed mastery from the user's onboarding level if this is the first
    // attempt for this skill. We pull onboarding lazily — once.
    let prior = existing?.masteryScore;
    if (prior === undefined) {
      const onboarding = await client.onboarding.findUnique({
        where: { userId },
        select: { currentLevel: true },
      });
      prior = onboarding ? irtInitialMastery(onboarding.currentLevel) : BKT.PRIOR;
    }

    const posterior = bktUpdate({ prior, correct });
    const totalAttempts = (existing?.totalAttempts ?? 0) + 1;
    const correctAnswers = (existing?.correctAnswers ?? 0) + (correct ? 1 : 0);
    const incorrectAnswers = (existing?.incorrectAnswers ?? 0) + (correct ? 0 : 1);
    const confidence = confidenceLevel(totalAttempts);

    const row = await client.userSkillMastery.upsert({
      where: { userId_skillTag: { userId, skillTag } },
      create: {
        userId,
        skillTag,
        masteryScore: posterior,
        correctAnswers,
        incorrectAnswers,
        totalAttempts,
        confidenceLevel: confidence,
      },
      update: {
        masteryScore: posterior,
        correctAnswers,
        incorrectAnswers,
        totalAttempts,
        confidenceLevel: confidence,
      },
    });

    return {
      skillTag: row.skillTag,
      masteryScore: row.masteryScore,
      confidenceLevel: row.confidenceLevel,
      correctAnswers: row.correctAnswers,
      incorrectAnswers: row.incorrectAnswers,
      totalAttempts: row.totalAttempts,
    };
  }

  // Convenience: record a batch of attempts in one transaction. Used by the
  // lesson-complete handler when a single lesson exercises multiple skills.
  async recordBatch(
    userId: string,
    attempts: { skillTag: SkillTag; correct: boolean }[],
    tx?: Prisma.TransactionClient,
  ): Promise<SkillMasterySummary[]> {
    if (attempts.length === 0) return [];
    const run = async (client: Prisma.TransactionClient) => {
      const out: SkillMasterySummary[] = [];
      for (const a of attempts) {
        out.push(await this.recordAttempt(userId, a.skillTag, a.correct, client));
      }
      return out;
    };
    return tx ? run(tx) : this.prisma.$transaction(run);
  }

  // Full mastery map across every skill the user has touched.
  async getSummary(userId: string): Promise<SkillMasterySummary[]> {
    const rows = await this.prisma.userSkillMastery.findMany({
      where: { userId },
      orderBy: { skillTag: 'asc' },
    });
    return rows.map((r) => ({
      skillTag: r.skillTag,
      masteryScore: r.masteryScore,
      confidenceLevel: r.confidenceLevel,
      correctAnswers: r.correctAnswers,
      incorrectAnswers: r.incorrectAnswers,
      totalAttempts: r.totalAttempts,
    }));
  }
}
