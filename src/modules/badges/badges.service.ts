import { Injectable } from '@nestjs/common';
import { Badge } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

const MASTERY_THRESHOLD = 0.8;
const MASTERY_CONFIDENCE_FLOOR = 0.25;

export interface UnlockedBadgeView {
  id: string;
  slug: string;
  title: string;
  description: string;
  iconKey: string;
  skillTag: Badge['skillTag'];
  unlockedAt: Date;
  isSeen: boolean;
}

export interface NewBadgeBrief {
  id: string;
  slug: string;
  title: string;
  iconKey: string;
}

@Injectable()
export class BadgesService {
  constructor(private readonly prisma: PrismaService) {}

  // Walk every badge, check unlock conditions against the user's current
  // state, and create UserBadge rows for any newly-met conditions. Idempotent
  // and safe to call after any progression event (lesson complete, challenge
  // submit, skill record).
  //
  // Returns the freshly unlocked badges so the caller can surface them in the
  // response. Already-unlocked badges are skipped — duplicate XP / streak
  // logic is enforced at the row level by `@@unique([userId, badgeId])`.
  async checkAndUnlock(userId: string): Promise<NewBadgeBrief[]> {
    const [user, badges, userBadges, masteries] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { xp: true },
      }),
      this.prisma.badge.findMany(),
      this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      }),
      this.prisma.userSkillMastery.findMany({ where: { userId } }),
    ]);
    if (!user) return [];

    const owned = new Set(userBadges.map((b) => b.badgeId));
    const masteryByTag = new Map(
      masteries.map((m) => [m.skillTag, m] as const),
    );

    const toCreate: Badge[] = [];
    for (const badge of badges) {
      if (owned.has(badge.id)) continue;
      if (!this.qualifies(badge, user.xp, masteryByTag)) continue;
      toCreate.push(badge);
    }

    if (toCreate.length === 0) return [];

    await this.prisma.userBadge.createMany({
      data: toCreate.map((b) => ({ userId, badgeId: b.id })),
      skipDuplicates: true,
    });

    return toCreate.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      iconKey: b.iconKey,
    }));
  }

  // Badge condition:
  //   - skillTag set     → user's mastery for that tag must clear the
  //                        threshold AND be confident enough that we trust it.
  //   - xpRequirement set → user.xp >= xpRequirement.
  //   - both set         → BOTH conditions must hold (AND).
  //   - neither set       → unreachable (manual-only badge).
  private qualifies(
    badge: Badge,
    xp: number,
    masteryByTag: Map<string, { masteryScore: number; confidenceLevel: number }>,
  ): boolean {
    const checks: boolean[] = [];

    if (badge.skillTag) {
      const m = masteryByTag.get(badge.skillTag);
      checks.push(
        !!m &&
          m.masteryScore >= MASTERY_THRESHOLD &&
          m.confidenceLevel >= MASTERY_CONFIDENCE_FLOOR,
      );
    }
    if (badge.xpRequirement !== null && badge.xpRequirement !== undefined) {
      checks.push(xp >= badge.xpRequirement);
    }
    if (checks.length === 0) return false;
    return checks.every(Boolean);
  }

  async listForUser(userId: string): Promise<UnlockedBadgeView[]> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId },
      orderBy: { unlockedAt: 'desc' },
      include: { badge: true },
    });
    return rows.map((r) => ({
      id: r.badge.id,
      slug: r.badge.slug,
      title: r.badge.title,
      description: r.badge.description,
      iconKey: r.badge.iconKey,
      skillTag: r.badge.skillTag,
      unlockedAt: r.unlockedAt,
      isSeen: r.isSeen,
    }));
  }

  // Unseen badges since the user last polled this endpoint. Each call leaves
  // the rows untouched — the frontend confirms display by hitting
  // POST /api/profile/badge-notifications/seen.
  async listUnseen(userId: string): Promise<NewBadgeBrief[]> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId, isSeen: false },
      orderBy: { unlockedAt: 'asc' },
      include: { badge: true },
    });
    return rows.map((r) => ({
      id: r.badge.id,
      slug: r.badge.slug,
      title: r.badge.title,
      iconKey: r.badge.iconKey,
    }));
  }

  async markAllSeen(userId: string): Promise<{ marked: number }> {
    const res = await this.prisma.userBadge.updateMany({
      where: { userId, isSeen: false },
      data: { isSeen: true },
    });
    return { marked: res.count };
  }
}
