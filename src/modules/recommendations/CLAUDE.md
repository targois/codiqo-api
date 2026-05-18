# Recommendations Module — CLAUDE.md

## Purpose

Adaptive recommendation engine driven by BKT skill mastery. Surfaces the user's weakest skills and proposes review lessons to shore them up.

## Endpoint

| Method | Path | Description |
|---|---|---|
| GET | `/api/recommendations` | Weak skills + recommended review lessons |

Auth required.

## Response

```json
{
  "weakSkills": [
    { "skill": "LOOPS", "masteryScore": 0.42 }
  ],
  "recommendations": [
    {
      "type": "REVIEW",
      "lessonId": "python-for-loops",
      "skill": "LOOPS",
      "reason": "You frequently struggle with loops (mastery ~42%)."
    }
  ]
}
```

## Selection rule

A skill is **weak** iff:

```
masteryScore < 0.6   AND   totalAttempts >= 3
```

Up to 3 weak skills are returned, sorted by mastery ascending (weakest first).

The minimum-attempts gate prevents recommending a review after a single failed quiz — we want signal, not noise.

## Lesson lookup

`weakSkills` lists every qualifying skill. `recommendations` is the subset that maps to a canonical review lesson via [`SKILL_REVIEW_LESSON`](../../curriculum/skill-tags.ts). Skills without a mapped lesson appear in `weakSkills` but not in `recommendations` — the UI can still warn the user.

The mapping is a small in-backend mirror of the frontend curriculum. Keep entries in lockstep with renames.

## Why no neural recommender / matrix factorisation

MVP rule: **lightweight, deterministic, explainable**. Recommendations must be readable from the user's mastery vector and a single config file — anyone debugging "why was I recommended X?" should be able to read the rule above and check their masteries. Heavier engines (collaborative filtering, neural recommenders) are explicitly out of scope until we have a corpus large enough to calibrate them.

## File structure

```
recommendations/
  recommendations.service.ts     — getRecommendations
  recommendations.controller.ts  — GET /recommendations
  recommendations.module.ts
  CLAUDE.md
```
