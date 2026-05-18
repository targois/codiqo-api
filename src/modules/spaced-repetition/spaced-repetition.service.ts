import { Injectable } from '@nestjs/common';
import { SkillTag } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { sm2InitialState, sm2Update } from '../../adaptive/sm2';
import { SKILL_REVIEW_LESSON } from '../../curriculum/skill-tags';
import { RateReviewDto } from './dto/rate-review.dto';

export interface DueReviewView {
  skillTag: SkillTag;
  nextReviewAt: Date;
  intervalDays: number;
  repetitionCount: number;
  recommendedLessonId: string | null;
}

@Injectable()
export class SpacedRepetitionService {
  constructor(private readonly prisma: PrismaService) {}

  // POST /api/reviews/rate
  //
  // Apply one SM-2 step to the user's review schedule for this skill. Creates
  // the schedule row on first rating with the default ease factor.
  async rate(userId: string, dto: RateReviewDto) {
    const existing = await this.prisma.userSkillReview.findUnique({
      where: { userId_skillTag: { userId, skillTag: dto.skillTag } },
    });

    const now = new Date();
    const prev = existing
      ? {
          intervalDays: existing.intervalDays,
          easeFactor: existing.easeFactor,
          repetitionCount: existing.repetitionCount,
        }
      : { intervalDays: 1, easeFactor: 2.5, repetitionCount: 0 };

    const next = sm2Update(prev, dto.quality, now);

    const row = await this.prisma.userSkillReview.upsert({
      where: { userId_skillTag: { userId, skillTag: dto.skillTag } },
      create: {
        userId,
        skillTag: dto.skillTag,
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        repetitionCount: next.repetitionCount,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: now,
      },
      update: {
        intervalDays: next.intervalDays,
        easeFactor: next.easeFactor,
        repetitionCount: next.repetitionCount,
        nextReviewAt: next.nextReviewAt,
        lastReviewedAt: now,
      },
    });

    return {
      skillTag: row.skillTag,
      intervalDays: row.intervalDays,
      easeFactor: row.easeFactor,
      repetitionCount: row.repetitionCount,
      nextReviewAt: row.nextReviewAt,
    };
  }

  // GET /api/reviews/due
  //
  // Every skill review whose `nextReviewAt` is in the past or now. Sorted by
  // oldest-due first so the UI surfaces the most-forgotten skills first.
  async listDue(userId: string): Promise<DueReviewView[]> {
    const rows = await this.prisma.userSkillReview.findMany({
      where: { userId, nextReviewAt: { lte: new Date() } },
      orderBy: { nextReviewAt: 'asc' },
    });
    return rows.map((r) => ({
      skillTag: r.skillTag,
      nextReviewAt: r.nextReviewAt,
      intervalDays: r.intervalDays,
      repetitionCount: r.repetitionCount,
      recommendedLessonId: SKILL_REVIEW_LESSON[r.skillTag] ?? null,
    }));
  }

  // Helper for tests / future tooling: seed an initial review row for a skill
  // the user has never rated. Not currently wired to an endpoint — onboarding
  // could call this to schedule the first review of each beginner skill.
  async ensureInitialSchedule(userId: string, skillTag: SkillTag) {
    const existing = await this.prisma.userSkillReview.findUnique({
      where: { userId_skillTag: { userId, skillTag } },
    });
    if (existing) return existing;
    const init = sm2InitialState();
    return this.prisma.userSkillReview.create({
      data: {
        userId,
        skillTag,
        intervalDays: init.intervalDays,
        easeFactor: init.easeFactor,
        repetitionCount: init.repetitionCount,
        nextReviewAt: init.nextReviewAt,
      },
    });
  }
}
