# Progress Module — CLAUDE.md

## Purpose

Returns the user's progression summary. The frontend uses it to derive what lesson to open, which lessons are unlocked, and to render gamification stats (XP, level, streak, XP-today).

## Endpoint

| Method | Path | Description |
|---|---|---|
| GET | `/api/progress` | Aggregated progression state |

Auth required.

## Response

```json
{
  "xp": 60,
  "level": 1,
  "streak": 3,
  "xpToday": 20,
  "completedLessonsCount": 4,
  "unlockedLessons": [
    "python-print-first-output",
    "python-variables",
    "python-data-types",
    "python-string-basics",
    "python-numbers-arithmetic"
  ],
  "completedLessons": [
    "python-print-first-output",
    "python-variables",
    "python-data-types",
    "python-string-basics"
  ],
  "currentLessonId": "python-numbers-arithmetic"
}
```

| Field | Notes |
|---|---|
| `xp` / `level` / `streak` | Cached gamification stats from `User`. |
| `xpToday` | Sum of `XPTransaction.amount` for this user where `createdAt >= today UTC midnight`. Computed at request time — never cached. |
| `completedLessons` | Every completed `lessonId` across every language. |
| `completedLessonsCount` | `completedLessons.length` — sent explicitly to skip a `.length` round-trip. |
| `unlockedLessons` | Adaptive unlock list, computed against the curriculum registry and the user's `onboarding.startingLessonId`. Empty if not onboarded. |
| `currentLessonId` | First unlocked, uncompleted lesson — what the homepage CTA opens. `null` if not onboarded. |

## Adaptive unlock

The unlock + current-lesson computation lives in `src/curriculum/registry.ts` and is shared with the tracks module. Rule of thumb:

1. Resolve the user's `startingLessonId` from onboarding (BEGINNER → first lesson, INTERMEDIATE → mid-track lesson, ADVANCED → late-track lesson).
2. From `startingLessonId` onward, lesson N is unlocked iff N == start OR N-1 is completed OR N itself is completed.
3. Lessons before `startingLessonId` are normally locked-out; if the user goes back and completes one anyway it stays in `unlockedLessons` (for review).
4. `currentLessonId` = first lesson in `unlockedLessons` that is not yet completed.

A user who never onboarded gets `unlockedLessons: []` and `currentLessonId: null`. The frontend can prompt onboarding.

## XPTransaction & XP today

`XPTransaction` is an append-only audit log. `xpToday` is computed by:

```ts
prisma.xPTransaction.aggregate({
  where: { userId, createdAt: { gte: startOfDayUTC(now) } },
  _sum: { amount: true },
})
```

There is an index `(userId, createdAt)` on `xp_transactions` so this query is cheap. `xpToday` includes BOTH lesson completions AND daily challenge completions — anything that grants XP.

| Reason | Source |
|---|---|
| `lesson_complete` | `POST /api/lessons/:id/complete` (first time only) |
| `daily_challenge_complete` | `POST /api/daily-challenge/:id/submit` (first correct submission) |

## Why audit-log XP instead of computed totals

`User.xp` is the running total maintained by `XpService.awardInTx`. `XPTransaction` records *each* award separately so we can:
- Reconstruct any user's XP timeline (used for `xpToday`).
- Investigate disputed XP totals without re-running domain logic.
- Support future features (XP decay, achievements, undo).

Never modify `User.xp` outside `XpService.awardInTx` — that's the only place that also writes the matching transaction row.

## UserLessonProgress lifecycle

Per `(userId, lessonId)` — `@@unique([userId, lessonId])`.

| Field | Set when |
|---|---|
| `isCompleted` | Flipped to true by `POST /api/lessons/:id/complete`. Never downgraded. |
| `completedAt` | First completion timestamp. |
| `xpEarned` | `dto.xpReward ?? 10` at first completion. |
| `createdAt` / `updatedAt` | Auto. |

## Service methods

| Method | Returns |
|---|---|
| `getSummary(userId)` | The response shape above — used by the controller |
| `findAllForUser(userId)` | `UserLessonProgress[]` — internal helper |
| `findForLesson(userId, lessonId)` | `UserLessonProgress \| null` — internal helper |

## File structure

```
progress/
  progress.service.ts    — getSummary, findAllForUser, findForLesson
  progress.controller.ts — GET /api/progress
  progress.module.ts     — exports ProgressService
  CLAUDE.md
```
