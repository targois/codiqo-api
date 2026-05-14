# Progress Module — CLAUDE.md

## Purpose

Provides `ProgressService` for reading `UserLessonProgress` records.
Write operations (upsert during lesson completion) happen inside `LessonsService` using Prisma transactions — keeping atomicity with XP and streak updates.

## No public endpoints

ProgressModule has no controller. It exists as a reusable service for other modules.

## ProgressService methods

| Method | Returns |
|---|---|
| `findAllForUser(userId)` | `UserLessonProgress[]` — all progress for a user |
| `findForLesson(userId, lessonId)` | `UserLessonProgress \| null` — progress for one lesson |

## Prisma model — UserLessonProgress

| Field | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| userId | String | FK → users, CASCADE |
| lessonId | String | FK → lessons, CASCADE |
| progressPercent | Int | 0–100 |
| isCompleted | Boolean | true after POST /lessons/:id/complete |
| xpEarned | Int | XP awarded at completion (0 on re-completion) |
| completedAt | DateTime? | timestamp of first completion |
| lastOpenedAt | DateTime? | updated on every complete call |
| @@unique([userId, lessonId]) | | prevents duplicate records |

## File structure

```
progress/
  progress.service.ts   — findAllForUser(), findForLesson()
  progress.module.ts    — exports ProgressService
```
