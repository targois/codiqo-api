# Spaced Repetition Module — CLAUDE.md

## Purpose

Schedules per-skill reviews using the SuperMemo-2 (SM-2) algorithm. The user rates how easily they recalled a skill (`0..5`) and SM-2 decides when to surface it again, fighting forgetting curves.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/reviews/rate` | Apply one SM-2 step with a 0..5 quality rating |
| GET | `/api/reviews/due` | Skills whose nextReviewAt has elapsed |

Auth required.

## POST /api/reviews/rate

```json
{ "skillTag": "LOOPS", "quality": 4 }
```

Response:
```json
{
  "skillTag": "LOOPS",
  "intervalDays": 1,
  "easeFactor": 2.5,
  "repetitionCount": 1,
  "nextReviewAt": "2026-05-18T10:00:00.000Z"
}
```

First rating creates the schedule row with defaults (`intervalDays=1`, `easeFactor=2.5`, `repetitionCount=0`).

## GET /api/reviews/due

```json
{
  "reviews": [
    {
      "skillTag": "LOOPS",
      "nextReviewAt": "2026-05-17T08:00:00.000Z",
      "intervalDays": 6,
      "repetitionCount": 2,
      "recommendedLessonId": "python-for-loops"
    }
  ]
}
```

Sorted by `nextReviewAt ASC` — most-forgotten first. `recommendedLessonId` is the canonical review lesson for the skill (same map as `/api/recommendations`).

## SM-2 algorithm

Implemented in [`src/adaptive/sm2.ts`](../../adaptive/sm2.ts). For each rating with quality `q ∈ [0..5]`:

```
EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

if q < 3:                           # forgot
  repetitionCount = 0
  intervalDays    = 1
elif repetitionCount == 0:
  intervalDays = 1
elif repetitionCount == 1:
  intervalDays = 6
else:
  intervalDays = max(1, round(prevInterval * EF'))
repetitionCount += 1  (unless q < 3, in which case it was reset)

nextReviewAt = now + intervalDays * 24h
```

Expected interval growth for a string of `q=4` ratings:

```
day 0 (first review)  → 1 day
day 1                 → 6 days
day 7                 → 14 days   (= round(6 * 2.5))
day 21                → 34 days   (= round(14 * 2.46…))
day 55                → 84 days
…
```

A single `q<3` collapses the schedule back to a 1-day interval and resets `repetitionCount = 0`, but `easeFactor` continues to drift per the formula (floored at 1.3) so chronically-hard skills review more often even after a single recall.

## How this complements BKT

| System | What it answers |
|---|---|
| **BKT** ([skill-mastery](../skill-mastery/CLAUDE.md)) | Has the user *learned* this skill? |
| **SM-2** (this module) | When should the user *review* this skill to retain it? |

They run in parallel and don't share state. A skill can have BKT `masteryScore = 0.95` (mastered) and still be SM-2-due if 84 days have passed since the last successful review. Likewise a freshly-rated skill with `q = 4` won't be SM-2-due for 24 hours even if BKT considers it weak.

## Future hooks (not in MVP)

- Onboarding could seed an `UserSkillReview` row per beginner skill via `ensureInitialSchedule()`.
- A nightly job could degrade `easeFactor` for skills the user keeps deferring.
- Notification system could ping users on `nextReviewAt`.

None of these are wired today — kept on the explicit "do not overengineer" list.

## File structure

```
spaced-repetition/
  dto/
    rate-review.dto.ts            — { skillTag, quality }
  spaced-repetition.service.ts    — rate, listDue, ensureInitialSchedule
  spaced-repetition.controller.ts — POST /reviews/rate, GET /reviews/due
  spaced-repetition.module.ts     — exports SpacedRepetitionService
  CLAUDE.md
```
