# Skill Mastery Module — CLAUDE.md

## Purpose

Tracks per-skill mastery using Bayesian Knowledge Tracing (BKT). Every quiz answer, code-task verdict, or completed lesson can be recorded as an attempt against one or more skills; the BKT posterior updates the user's `masteryScore` and we expose the resulting state for analytics, badges, recommendations, and competency-map rendering.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/skills/mastery` | Per-skill mastery snapshot for the user |
| POST | `/api/skills/record` | Record one `{ skillTag, correct }` attempt |

Auth required.

## POST /api/skills/record

```json
{ "skillTag": "LOOPS", "correct": true }
```

Response:
```json
{
  "mastery": {
    "skillTag": "LOOPS",
    "masteryScore": 0.65,
    "confidenceLevel": 0.15,
    "correctAnswers": 3,
    "incorrectAnswers": 1,
    "totalAttempts": 4
  },
  "newBadges": [
    { "id": "...", "slug": "loop-explorer", "title": "Loop Explorer", "iconKey": "loops" }
  ]
}
```

Newly-unlocked badges piggy-back on the response. The frontend then hits `POST /api/profile/badge-notifications/seen` to acknowledge.

## GET /api/skills/mastery

```json
[
  { "skillTag": "VARIABLES", "masteryScore": 0.92, "confidenceLevel": 0.45, "correctAnswers": 8, "incorrectAnswers": 1, "totalAttempts": 9 },
  { "skillTag": "LOOPS", "masteryScore": 0.65, "confidenceLevel": 0.15, "correctAnswers": 3, "incorrectAnswers": 1, "totalAttempts": 4 }
]
```

Only skills the user has attempted at least once appear in the response.

## BKT

Standard 4-parameter Bayesian Knowledge Tracing. Algorithm lives in [`src/adaptive/bkt.ts`](../../adaptive/bkt.ts).

| Parameter | Value | Meaning |
|---|---|---|
| `PRIOR (P_L0)` | 0.1 | Prior probability of mastery on a fresh skill |
| `TRANSIT (P_T)` | 0.1 | Probability of learning from a single attempt |
| `GUESS (P_G)` | 0.2 | Probability of answering correctly without knowing |
| `SLIP (P_S)` | 0.1 | Probability of slipping despite knowing |

Update rule per attempt:

```
P(L | correct)   = P(L) * (1 - S) / ( P(L) * (1 - S) + (1 - P(L)) * G )
P(L | incorrect) = P(L) * S       / ( P(L) * S + (1 - P(L)) * (1 - G) )
P(L)_new         = P(L | obs) + (1 - P(L | obs)) * T
```

Parameters are shared across skills — per-skill tuning would need a calibration corpus we don't have at MVP. Trade accuracy for explainability.

## IRT (light)

We do NOT run an IRT loop at runtime. The onboarding-declared level seeds the BKT prior on first attempt:

| Level | Initial prior |
|---|---|
| BEGINNER | 0.10 (= `BKT.PRIOR`) |
| INTERMEDIATE | 0.30 |
| ADVANCED | 0.50 |

If a future onboarding diagnostic asks a few quick questions, the proportion correct can shift this prior more accurately (see [`src/adaptive/bkt.ts`](../../adaptive/bkt.ts)).

## Confidence level

```
confidenceLevel(totalAttempts) = clamp01(totalAttempts / 20)
```

Used to decide when to *trust* `masteryScore` — badges and recommendations gate on it so a single lucky-or-unlucky attempt can't unlock a "Master" badge or surface a false "weak skill".

## Hooks into completion paths

- `POST /api/lessons/:id/complete` — if `skillTags` is included in the body, each tag is recorded as one `correct` attempt in the same transaction that awards XP. Coarse-grained signal — quiz-level accuracy lands through `POST /api/skills/record`.
- `POST /api/daily-challenge/:id/submit` — does NOT touch skill mastery (challenges aren't skill-tagged in MVP). It still triggers a badge-unlock check after commit.

## File structure

```
skill-mastery/
  dto/
    record-attempt.dto.ts        — { skillTag, correct }
  skill-mastery.service.ts       — recordAttempt, recordBatch, getSummary
  skill-mastery.controller.ts    — GET /mastery, POST /record
  skill-mastery.module.ts        — exports SkillMasteryService
  CLAUDE.md
```
