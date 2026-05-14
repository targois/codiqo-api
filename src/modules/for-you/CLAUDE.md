# For You Module — CLAUDE.md

## Purpose

Single aggregated endpoint that powers the homepage feed.
Combines user stats, onboarding preferences, daily progress, recommendation, and next lessons queue into one response — avoiding multiple round-trips from the frontend.

## Endpoint

| Method | Path | Auth |
|---|---|---|
| GET | `/api/for-you` | JWT required |

## Response shape

```json
{
  "user": { "xp": 10, "streak": 1, "level": 1 },
  "onboarding": { "selectedLanguage": "TYPESCRIPT", "currentLevel": "BEGINNER" },
  "dailyProgress": { "completedLessons": 1, "totalLessons": 5 },
  "recommendedLesson": {
    "id": "...", "title": "...", "description": "...",
    "estimatedMinutes": 10, "xpReward": 10, "difficulty": "BEGINNER"
  },
  "nextLessons": [
    { "id": "...", "title": "...", "isCompleted": false, "isLocked": false },
    { "id": "...", "title": "...", "isCompleted": false, "isLocked": true }
  ],
  "stats": { "completedLessons": 1, "totalMinutesLearned": 10 }
}
```

`recommendedLesson` is `null` if all lessons are completed or no lessons exist.
`onboarding` is `null` if user hasn't completed onboarding yet.

## Recommendation logic

**New user (0 completed lessons):**
1. Find first lesson matching `onboarding.selectedLanguage` + `BEGINNER` difficulty
2. Fallback: first published lesson by `order`

**Returning user:**
- First unfinished lesson by `order` (next after last completed)

Only `isPublished = true` lessons are considered.

## Next lessons queue

Returns up to 5 lessons starting from the recommended lesson position.

**Locking rules:**
- `isCompleted = true` → always shown as completed, never locked
- `lesson.id === recommendedLesson.id` → unlocked (this is the next step)
- everything else → `isLocked = true`

## Query strategy (no N+1)

4 queries total per request:
1. `user` with `onboarding` (join)
2. All published lessons ordered by `order`
3. All `UserLessonProgress` for the user
4. `DailyActivity` for today (UTC midnight)

Lesson-progress join done in-memory using a `Map<lessonId, progress>`.

## File structure

```
for-you/
  for-you.service.ts    — getForYou(userId) — all business logic
  for-you.controller.ts — GET /for-you
  for-you.module.ts
```
