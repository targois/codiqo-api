import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { LEAGUE_BRACKETS, leagueForXp, leagueRange } from '../../leagues/leagues';

export interface LeaderboardUser {
  rank: number;
  username: string;
  displayName: string | null;
  xp: number;
  streak: number;
  isCurrentUser: boolean;
}

export interface LeaderboardResult {
  league: string;
  rank: number;
  users: LeaderboardUser[];
}

const TOP_N = 25;

@Injectable()
export class LeaderboardService {
  constructor(private readonly prisma: PrismaService) {}

  // GET /api/leaderboard
  //
  // The user sees only their league cohort — XP gates the bracket via
  // `LEAGUE_BRACKETS`. Within the league, users are ranked by XP DESC. This
  // keeps the board motivating (similar-level peers) instead of a flat
  // global ladder.
  //
  // Cohort sizes are small (no pagination yet), so we return the top N rows
  // in the league sorted by XP. The current user's rank is computed against
  // the full league count, not just the slice.
  async get(userId: string): Promise<LeaderboardResult> {
    const me = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, xp: true },
    });
    const league = leagueForXp(me.xp);
    const { minXp, maxXp } = leagueRange(league);

    const xpFilter: { gte: number; lte?: number } = { gte: minXp };
    if (maxXp !== null) xpFilter.lte = maxXp;

    const [topUsers, ahead] = await Promise.all([
      this.prisma.user.findMany({
        where: { xp: xpFilter },
        orderBy: [{ xp: 'desc' }, { createdAt: 'asc' }],
        take: TOP_N,
        select: { id: true, username: true, displayName: true, xp: true, streak: true },
      }),
      // Rank inside the league = count of users with strictly higher XP, +1.
      this.prisma.user.count({
        where: {
          xp: { gt: me.xp, ...(maxXp !== null ? { lte: maxXp } : {}) },
        },
      }),
    ]);

    const rank = ahead + 1;
    const users: LeaderboardUser[] = topUsers.map((u, idx) => ({
      rank: idx + 1,
      username: u.username,
      displayName: u.displayName,
      xp: u.xp,
      streak: u.streak,
      isCurrentUser: u.id === userId,
    }));

    return { league, rank, users };
  }

  // Convenience for diagnostics — exposes the league boundaries.
  brackets() {
    return LEAGUE_BRACKETS;
  }
}
