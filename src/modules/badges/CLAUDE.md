# Badges Module — CLAUDE.md

## Purpose

Competency + milestone badges. Auto-unlocked whenever a progression event (lesson complete, daily challenge submit, skill attempt) updates the user's state.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/badges/me` | All badges this user has unlocked |
| GET | `/api/profile/badge-notifications` | Unseen badges (poll on focus/mount) |
| POST | `/api/profile/badge-notifications/seen` | Mark every unseen badge as seen |

Auth required.

## Unlock conditions

Two columns on `Badge`:
- `skillTag` — unlock when the user's mastery for that tag clears `masteryScore >= 0.8` AND `confidenceLevel >= 0.25` (≈5 attempts).
- `xpRequirement` — unlock when `User.xp >= xpRequirement`.

If both are set, BOTH must hold (AND). If neither is set, the badge is unreachable through this checker (admin-only — future use).

The confidence floor prevents skill badges from popping after a single lucky attempt.

## Auto-unlock flow

`BadgesService.checkAndUnlock(userId)` walks every badge and creates `UserBadge` rows for newly-met conditions. Idempotent — `@@unique([userId, badgeId])` guards against duplicates.

Called from:
- `LessonsService.complete` (after the XP/streak transaction commits)
- `DailyChallengeService.submit` (after the XP/streak transaction commits)
- `SkillMasteryController.record` (after recording the attempt)

Newly-unlocked badges are returned inline on those responses (`newBadges: [...]`) so the frontend can animate them immediately without a separate poll.

## Notification flow

The unseen endpoint is the slow path — a frontend poll for missed unlocks (e.g. unlocks earned by a backend-side event the client wasn't listening to, or unlocks the client missed on a crash/reload):

```
GET  /api/profile/badge-notifications        → { newBadges: [{ id, slug, title, iconKey }] }
POST /api/profile/badge-notifications/seen   → { marked: 3 }
```

`UserBadge.isSeen` flips to `true` on the POST.

## Seeded badge pool

[`prisma/seed.ts`](../../../prisma/seed.ts) upserts ten badges by `slug`:

**Skill badges**: variables-master, loop-explorer, function-builder, recursion-apprentice, oop-initiate, conditional-thinker, list-wrangler.
**XP milestones**: xp-100, xp-500, xp-1000.

`iconKey` is a stable semantic identifier (`"loops"`, `"xp-bronze"`, etc) that the frontend maps to a visual icon component.

## Why no FK to the active lesson

Badges aren't lesson-scoped — they fire on cross-cutting state (XP totals, mastery snapshots). Keeping them decoupled means new badge conditions can be added by extending `qualifies()` without touching unrelated tables.

## File structure

```
badges/
  badges.service.ts       — checkAndUnlock, listForUser, listUnseen, markAllSeen
  badges.controller.ts    — GET /badges/me, GET/POST /profile/badge-notifications
  badges.module.ts        — exports BadgesService
  CLAUDE.md
```
