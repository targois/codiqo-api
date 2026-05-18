# Leaderboard Module — CLAUDE.md

## Purpose

League-bracketed leaderboard. The user only sees peers in their own XP cohort so the experience stays motivating — no flat global ladder.

## Endpoint

| Method | Path | Description |
|---|---|---|
| GET | `/api/leaderboard` | This user's league + rank + top users in the same league |

Auth required.

## Response

```json
{
  "league": "SILVER",
  "rank": 4,
  "users": [
    { "rank": 1, "username": "alex",   "displayName": null, "xp": 420, "streak": 7, "isCurrentUser": false },
    { "rank": 2, "username": "morgan", "displayName": null, "xp": 380, "streak": 4, "isCurrentUser": false },
    { "rank": 3, "username": "alex2",  "displayName": null, "xp": 340, "streak": 2, "isCurrentUser": false },
    { "rank": 4, "username": "me",     "displayName": null, "xp": 320, "streak": 5, "isCurrentUser": true  }
  ]
}
```

- `users` is the top N (currently 25) in the user's league, sorted by XP DESC then by `createdAt ASC` (stable tiebreaker).
- `rank` is the user's rank **within the league**, computed against the full league count (not just the slice).
- `isCurrentUser` flags this user inside the `users` list if present.

## League computation

Pure-function mapping from `User.xp` in [`src/leagues/leagues.ts`](../../leagues/leagues.ts):

| League | XP range |
|---|---|
| BRONZE | 0 – 199 |
| SILVER | 200 – 499 |
| GOLD | 500 – 1499 |
| PLATINUM | 1500 – 3999 |
| DIAMOND | 4000+ |

No DB column on `User` — league is derived at request time so threshold tweaks don't need migrations.

## Why XP-only

The spec called out XP + recent activity + streak + challenge completion. For MVP we only use XP because:

- XP is already a composite signal (lessons earn XP, daily challenges earn XP, both contribute to leagues without any extra weighting).
- Single-dimension ranking is explainable — users can predict their next promotion.
- Streak/recency-weighted scores would need a calibration corpus and a recompute job. Out of scope per the "lightweight, deterministic" rule.

Adding more signals later is a service-level change — no schema migration needed.

## What this module does NOT do

- Persist a "current rank" — too noisy to keep in sync.
- Cross-league comparisons — intentional.
- Pagination — leagues are small enough at MVP. Add cursor pagination when a single league exceeds ~25 users.
- Anti-cheat / XP audits — separate concern (the XPTransaction audit log is the source of truth).

## File structure

```
leaderboard/
  leaderboard.service.ts     — get(userId), brackets()
  leaderboard.controller.ts  — GET /leaderboard
  leaderboard.module.ts
  CLAUDE.md
```
