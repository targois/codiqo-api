# Progress Module — CLAUDE.md

## Purpose

`ProgressService` — internal-only reads of `UserLessonProgress`. No HTTP endpoints. Writes happen inside `LessonRuntimeService` (transactional).

## UserLessonProgress lifecycle

| Field | Set when |
|---|---|
| `status` | NOT_STARTED on create → IN_PROGRESS on first start/block complete → COMPLETED on /complete |
| `progressPercent` | recomputed on every block completion: `round(completed / total * 100)` |
| `isCompleted` | mirror of status = COMPLETED |
| `xpEarned` | `lesson.xpReward` on first completion, 0 thereafter |
| `completedAt` | first completion timestamp only (never overwritten) |
| `lastOpenedAt` | bumped on every `POST /lessons/:id/start` |

## UserLessonBlockProgress lifecycle

Per `(userId, blockId)` — `@@unique([userId, blockId])`.
- Non-quiz blocks: created/upserted when frontend POSTs `/blocks/:blockId/complete`
- Quiz blocks: created/upserted only when the user submits a correct answer

Re-submitting a wrong quiz answer does NOT create or downgrade a record — just returns `{ correct: false, blockCompleted: false }`.

## XPTransaction

Append-only audit log. Created by `XpService.awardInTx()` inside the lesson-completion transaction. Never updated, never deleted.

| Reason | Source |
|---|---|
| `lesson_complete` | `POST /lessons/:id/complete` (first time only) |

## Why audit-log XP instead of computed totals

`User.xp` is the running total maintained by `XpService.awardInTx`. `XPTransaction` records *each* award separately so we can:
- Reconstruct any user's XP timeline
- Investigate disputed XP totals without re-running domain logic
- Support future features (XP decay, achievement triggers, undo)

Never modify `User.xp` outside `XpService` — this is the only place that creates the matching transaction row.

## ProgressService methods

| Method | Returns |
|---|---|
| `findAllForUser(userId)` | `UserLessonProgress[]` |
| `findForLesson(userId, lessonId)` | `UserLessonProgress \| null` |

## File structure

```
progress/
  progress.service.ts   — findAllForUser(), findForLesson()
  progress.module.ts    — exports ProgressService
  CLAUDE.md
```
