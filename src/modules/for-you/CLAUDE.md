# For You Module — CLAUDE.md

## Purpose

Homepage feed aggregator. Returns the user's gamification state, onboarding context, completion list, and today's daily activity in a single request. The frontend uses this together with its local curriculum registry to render the homepage (recommended lesson, next lessons, language tracks).

The backend does NOT compute "next lesson", "track tile", or "recommended hero" — those are derived on the frontend from `completedLessons` + the curriculum it owns.

## Endpoint

| Method | Path | Auth |
|---|---|---|
| GET | `/api/for-you` | JWT required |

## Response

```json
{
  "user": {
    "xp": 75, "streak": 3, "level": 1,
    "username": "python_learner", "displayName": "Python User"
  },
  "onboarding": {
    "selectedLanguage": "PYTHON",
    "currentLevel": "BEGINNER"
  },
  "completedLessons": ["python-print-first-output", "python-variables"],
  "dailyProgress": { "completedLessons": 1 }
}
```

| Field | Notes |
|---|---|
| `user.*` | Cached gamification stats from `User`. |
| `onboarding` | `null` when onboarding is not yet completed. |
| `completedLessons` | Every `lessonId` the user has completed, across every language. |
| `dailyProgress.completedLessons` | Count of lessons completed today (UTC), from `DailyActivity`. |

## Query strategy

3 queries:
1. user + onboarding (1 row)
2. all `UserLessonProgress` rows where `isCompleted = true` (lessonId only)
3. today's `DailyActivity` row

No joins to a `Lesson` table — there isn't one. The endpoint stays a cheap aggregator.

## Frontend usage

| UI element | Source |
|---|---|
| Greeting / username | `user.username` |
| XP / level / streak header | `user.xp`, `user.level`, `user.streak` |
| Recommended lesson hero | derived: first lesson in `onboarding.selectedLanguage` not in `completedLessons` |
| Next lessons queue | derived: next N lessons from the local curriculum after the recommended one |
| Track tiles | derived: per-language completion ratio from `completedLessons` + curriculum totals |
| Daily progress | `dailyProgress.completedLessons` vs. the user's daily goal |

## File structure

```
for-you/
  for-you.service.ts    — getForYou(userId)
  for-you.controller.ts — GET /for-you
  for-you.module.ts
  CLAUDE.md
```
