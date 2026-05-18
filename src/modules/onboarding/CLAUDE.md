# Onboarding Module — CLAUDE.md

## 1. Purpose

Captures the post-registration quiz (language, level, goal, pace, format) and seeds the user's adaptive progression entry point — the `startingLessonId` from which the unlock graph and `currentLessonId` flow. The single hand-off from "registered" to "ready to learn".

## 2. Responsibilities

- Persist the 5 quiz answers in one `Onboarding` row (1-to-1 with `User`).
- Compute `startingLessonId` from `(selectedLanguage, currentLevel)` via the curriculum registry.
- Flip `User.isOnboardingComplete = true` atomically when the row is created.
- Recompute `startingLessonId` on subsequent updates if and only if `selectedLanguage` or `currentLevel` change.
- Provide read access for the frontend (`/api/onboarding/me`).

Does NOT touch XP, streak, progress, or any other module's state. Pure capture + adaptive routing seed.

## 3. Database models

Owns `onboardings`. See [prisma/CLAUDE.md §4](../../../prisma/CLAUDE.md).

- `userId` is `@unique` → enforces 1-to-1 with `User`.
- `startingLessonId` is computed server-side; never accepted from the client.
- `isCompleted` is reserved for partial-onboarding flows (currently always set true on creation).

## 4. API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/onboarding` | JWT | Submit quiz answers, create the row, seed `startingLessonId` |
| GET | `/api/onboarding/me` | JWT | Read the current user's onboarding row |
| PATCH | `/api/onboarding/me` | JWT | Update fields; recompute `startingLessonId` if language/level change |

### `POST /api/onboarding`

Body:
```json
{
  "selectedLanguage": "PYTHON",
  "currentLevel": "INTERMEDIATE",
  "learningGoal": "CAREER",
  "dailyTime": "TEN_MIN",
  "preferredFormat": "MIXED"
}
```

Response 201:
```json
{
  "id": "...",
  "userId": "...",
  "selectedLanguage": "PYTHON",
  "currentLevel": "INTERMEDIATE",
  "learningGoal": "CAREER",
  "dailyTime": "TEN_MIN",
  "preferredFormat": "MIXED",
  "startingLessonId": "python-lists-intro",
  "isCompleted": true,
  "createdAt": "...",
  "updatedAt": "..."
}
```

Errors: 409 if onboarding already exists; 400 on enum validation failure.

### `PATCH /api/onboarding/me`

Body: same fields, all optional. Server recomputes `startingLessonId` only when `selectedLanguage` or `currentLevel` actually differs from the stored value (so updating `dailyTime` alone does not bounce the user back to the start of a track).

## 5. Internal flows

### Adaptive starting-lesson seeding

```
language + level
   │
   ▼
getStartingLessonId(language, level)            // src/curriculum/registry.ts
   │
   ▼
Onboarding.startingLessonId (text, nullable)
```

Defined for `PYTHON` (the only filled track):

| Level | startingLessonId |
|---|---|
| BEGINNER | `python-print-first-output` |
| INTERMEDIATE | `python-lists-intro` |
| ADVANCED | `python-functions-basics` |

Other languages return `null` until their track is populated in the registry.

### Onboarding completion is transactional

```ts
prisma.$transaction([
  prisma.onboarding.create({ data: { userId, ...dto, startingLessonId, isCompleted: true } }),
  prisma.user.update({ where: { id: userId }, data: { isOnboardingComplete: true } }),
]);
```

If either step fails, both roll back. Subsequent requests see "either both done or neither".

### Downstream consumers

`startingLessonId` is read by:

- [progress/CLAUDE.md](../progress/CLAUDE.md) — `computeUnlockedLessons` + `computeCurrentLessonId` (the homepage CTA).
- [tracks/CLAUDE.md](../tracks/CLAUDE.md) — same, scoped to the queried track.
- [for-you/CLAUDE.md](../for-you/CLAUDE.md) — surfaces it in the homepage aggregator response.
- [skill-mastery/CLAUDE.md](../skill-mastery/CLAUDE.md) — `currentLevel` seeds the BKT prior on the first attempt for each skill (IRT-lite).

## 6. Edge cases

| Case | Behaviour |
|---|---|
| User has no onboarding row, hits a protected endpoint | Most endpoints work; aggregators (`progress`, `for-you`, `tracks/:lang/progress`) return `currentLessonId: null` and `unlockedLessons: []`. Frontend prompts onboarding. |
| User PATCHes `selectedLanguage` mid-progression | `startingLessonId` is recomputed for the new language. Existing `UserLessonProgress` rows are untouched — completions are permanent and language-independent. |
| User PATCHes `currentLevel` only | `startingLessonId` recomputed. Already-unlocked / completed lessons stay unlocked. |
| Language with no registry entries (e.g. REACT today) | `startingLessonId` set to `null`. Track endpoints return `totalLessonsCount: 0` and empty arrays. |
| Repeat `POST /api/onboarding` | `409 Conflict — Onboarding already completed`. Use PATCH. |
| Legacy `currentLevel = BASIC` (pre-migration) | Already migrated to `BEGINNER` in [migration 20260516092055](../../../prisma/migrations/20260516092055_adaptive_progression_and_daily_challenge/migration.sql). |

## 7. Implementation notes

- **`startingLessonId` is server-computed, never client-supplied.** The DTOs (`CreateOnboardingDto`, `UpdateOnboardingDto`) do not accept this field — the frontend can read it from the response but cannot dictate it.
- **DTO design**: `CreateOnboardingDto` requires all 5 fields. `UpdateOnboardingDto` makes all 5 optional. Both validate enums with `@IsEnum`.
- **No goal-driven branching yet.** `learningGoal`, `dailyTime`, `preferredFormat` are stored but no module reads them. They're available for future features (e.g. recommending shorter lessons for `FIVE_MIN` users).
- **The legacy `BASIC` enum value was retired.** See [prisma/CLAUDE.md §3](../../../prisma/CLAUDE.md). Any frontend still sending `BASIC` will get a 400.

## 8. File structure

```
onboarding/
  dto/
    create-onboarding.dto.ts   — all 5 fields required
    update-onboarding.dto.ts   — all 5 fields optional
  onboarding.service.ts        — create(), findByUser(), update()
  onboarding.controller.ts     — POST, GET /me, PATCH /me
  onboarding.module.ts
  CLAUDE.md
```

## 9. Future improvements (not implemented)

- **Diagnostic mini-quiz** — 5–10 quick questions that refine the BKT prior per skill, not just an overall level. Would shift IRT-lite from `level → single prior` to `per-skill priors`.
- **Goal-driven recommendation slope** — `dailyTime=FIVE_MIN` users get shorter / fewer recommendations.
- **Re-onboarding ("change my path")** — explicit flow to reset progression without losing XP/badges. Currently PATCH does this implicitly.
- **Multi-language onboarding** — user picks several languages, each gets its own `startingLessonId`. Schema would need `Onboarding` to split into `UserLanguageEntry` rows.
