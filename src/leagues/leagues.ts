// ─── League tiers ────────────────────────────────────────────────────────────
//
// Pure-function league assignment from XP. No DB column on User — the league
// is derived at request time so it always reflects current XP without needing
// a migration when thresholds change.

export type League = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND';

export interface LeagueBracket {
  league: League;
  minXp: number;
}

// Ascending by minXp. The first bracket whose minXp the user clears (scanning
// from highest to lowest) is their league.
export const LEAGUE_BRACKETS: LeagueBracket[] = [
  { league: 'BRONZE', minXp: 0 },
  { league: 'SILVER', minXp: 200 },
  { league: 'GOLD', minXp: 500 },
  { league: 'PLATINUM', minXp: 1500 },
  { league: 'DIAMOND', minXp: 4000 },
];

export function leagueForXp(xp: number): League {
  let current: League = 'BRONZE';
  for (const bracket of LEAGUE_BRACKETS) {
    if (xp >= bracket.minXp) current = bracket.league;
  }
  return current;
}

export function leagueRange(league: League): { minXp: number; maxXp: number | null } {
  const idx = LEAGUE_BRACKETS.findIndex((b) => b.league === league);
  const next = LEAGUE_BRACKETS[idx + 1];
  return {
    minXp: LEAGUE_BRACKETS[idx].minXp,
    maxXp: next ? next.minXp - 1 : null,
  };
}
