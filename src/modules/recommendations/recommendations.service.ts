import { Injectable } from '@nestjs/common';
import { SkillTag } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { SKILL_REVIEW_LESSON } from '../../curriculum/skill-tags';

const WEAK_MASTERY_THRESHOLD = 0.6;
const MIN_ATTEMPTS_TO_TRUST = 3;
const MAX_RECOMMENDATIONS = 3;

export interface WeakSkill {
  skill: SkillTag;
  masteryScore: number;
}

export interface Recommendation {
  type: 'REVIEW';
  lessonId: string;
  skill: SkillTag;
  reason: string;
}

export interface RecommendationsResult {
  weakSkills: WeakSkill[];
  recommendations: Recommendation[];
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/recommendations
  //
  // MVP rule: a skill is "weak" iff masteryScore < 0.6 AND totalAttempts >= 3.
  // The minimum-attempts gate prevents false positives — a single wrong quiz
  // answer shouldn't recommend a review lesson.
  //
  // Each weak skill maps to a canonical review lesson from
  // `curriculum/skill-tags.ts`. Skills with no mapped lesson are listed in
  // `weakSkills` (so the UI can still warn) but skipped in `recommendations`.
  async getRecommendations(userId: string): Promise<RecommendationsResult> {
    const masteries = await this.prisma.userSkillMastery.findMany({
      where: { userId },
      orderBy: { masteryScore: 'asc' },
    });

    const weak = masteries.filter(
      (m) =>
        m.masteryScore < WEAK_MASTERY_THRESHOLD &&
        m.totalAttempts >= MIN_ATTEMPTS_TO_TRUST,
    );

    const weakSkills: WeakSkill[] = weak
      .slice(0, MAX_RECOMMENDATIONS)
      .map((m) => ({ skill: m.skillTag, masteryScore: m.masteryScore }));

    const recommendations: Recommendation[] = weakSkills
      .map(({ skill, masteryScore }) => {
        const lessonId = SKILL_REVIEW_LESSON[skill];
        if (!lessonId) return null;
        return {
          type: 'REVIEW' as const,
          lessonId,
          skill,
          reason: reasonFor(skill, masteryScore),
        };
      })
      .filter((r): r is Recommendation => r !== null);

    return { weakSkills, recommendations };
  }
}

function reasonFor(skill: SkillTag, masteryScore: number): string {
  const lower = skill.toLowerCase().replace('_', ' ');
  const pct = Math.round(masteryScore * 100);
  return `You frequently struggle with ${lower} (mastery ~${pct}%).`;
}
