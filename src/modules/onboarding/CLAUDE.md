# Onboarding Module — CLAUDE.md

## Purpose

Collects user preferences after registration via a quiz.
Results are used later to personalize the "For You" lessons feed.
After successful submission, `User.isOnboardingComplete` is set to `true`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/onboarding` | Submit quiz answers — creates onboarding record |
| GET | `/api/onboarding/me` | Get current user's onboarding data |
| PATCH | `/api/onboarding/me` | Update individual onboarding fields |

All endpoints require `Authorization: Bearer <token>`.

## Example request body — POST /api/onboarding

```json
{
  "selectedLanguage": "TYPESCRIPT",
  "currentLevel": "BEGINNER",
  "learningGoal": "CAREER",
  "dailyTime": "TEN_MIN",
  "preferredFormat": "MIXED"
}
```

## Enums

```
ProgrammingLanguage:  JAVASCRIPT | TYPESCRIPT | PYTHON | HTML_CSS
UserLearningLevel:    BEGINNER | BASIC | INTERMEDIATE
LearningGoal:         CAREER | STUDY | PET_PROJECT | JUST_FOR_FUN
DailyLearningTime:    FIVE_MIN | TEN_MIN | FIFTEEN_MIN | THIRTY_MIN
PreferredLearningFormat: THEORY_FIRST | PRACTICE_FIRST | MIXED
```

## DTOs

- `CreateOnboardingDto` — all 5 fields required, each validated with `@IsEnum`
- `UpdateOnboardingDto` — all fields optional (`@IsOptional`), same enum validation

## Prisma model

```
Onboarding {
  id               String (uuid) PK
  userId           String        unique — FK → User, CASCADE delete
  selectedLanguage ProgrammingLanguage
  currentLevel     UserLearningLevel
  learningGoal     LearningGoal
  dailyTime        DailyLearningTime
  preferredFormat  PreferredLearningFormat
  isCompleted      Boolean  default false
  createdAt        DateTime auto
  updatedAt        DateTime auto
}
```

`userId` is unique → enforces 1-to-1 with User at the DB level.

## Relation with User

- `User.onboarding` → optional `Onboarding?`
- Onboarding creation uses `prisma.$transaction` to atomically:
  1. Create the `Onboarding` record
  2. Set `User.isOnboardingComplete = true`
- If onboarding already exists → `409 Conflict`
- If onboarding not found on GET/PATCH → `404 Not Found`

## File structure

```
onboarding/
  dto/
    create-onboarding.dto.ts   — all fields required
    update-onboarding.dto.ts   — all fields optional
  onboarding.service.ts        — create(), findByUser(), update()
  onboarding.controller.ts     — POST, GET /me, PATCH /me
  onboarding.module.ts         — exports OnboardingService (for future use)
```
