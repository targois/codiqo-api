# Prisma — CLAUDE.md

## Workflow

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma:migrate` — creates SQL file in `migrations/` and applies it
3. Prisma auto-regenerates the TypeScript client after migration

Never edit migration SQL files by hand.

## Naming conventions

- Model names: PascalCase singular (`User`, `Course`, `Lesson`)
- Table names: snake_case plural via `@@map("table_name")`
- Column names: camelCase in schema → Prisma auto-maps to the same in TS client
- IDs: `String @id @default(uuid())` — UUIDs for all primary keys
- Timestamps: every model has `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`

## Current schema

### User
Core user record. Holds auth, profile, gamification state.

| Field | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| email | String | unique |
| username | String | unique |
| passwordHash | String | bcrypt hash, never returned in API responses |
| displayName | String? | optional display name |
| avatarUrl | String? | URL to profile picture |
| xp | Int | total XP earned, default 0 |
| level | Int | computed from XP, default 1 |
| streak | Int | current day streak, default 0 |
| streakLastDate | DateTime? | last day user completed a lesson |
| isOnboardingComplete | Boolean | false until onboarding quiz done |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |

### Onboarding (migration: 20260512175805_add_onboarding)

1-to-1 with User. `userId` is unique at DB level. Cascade deletes with User.
Creation uses `$transaction` to atomically set `User.isOnboardingComplete = true`.

**Enums:** `ProgrammingLanguage` · `UserLearningLevel` · `LearningGoal` · `DailyLearningTime` · `PreferredLearningFormat`

| Field | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| userId | String | unique FK → users, CASCADE |
| selectedLanguage | ProgrammingLanguage | |
| currentLevel | UserLearningLevel | |
| learningGoal | LearningGoal | |
| dailyTime | DailyLearningTime | |
| preferredFormat | PreferredLearningFormat | |
| isCompleted | Boolean | default false, set true on create |
| createdAt | DateTime | auto |
| updatedAt | DateTime | auto |

### Lesson (migration: 20260513193042_add_lessons_progress_streak)

Content unit. `isPublished` controls visibility. `order` determines sequence.

| Field | Type | Notes |
|---|---|---|
| id | String (uuid) | PK |
| title, description | String | |
| language | ProgrammingLanguage | |
| difficulty | LessonDifficulty | BEGINNER / BASIC / INTERMEDIATE |
| estimatedMinutes | Int | |
| xpReward | Int | default 10 |
| order | Int | sort order for feed |
| isPublished | Boolean | false = hidden from API |

Related models (all cascade-delete with Lesson):
- `TheoryBlock` — `type: LessonContentType`, `content`, `order`
- `QuizQuestion` — `type: QuizQuestionType`, `order` → has `QuizAnswer[]`
- `CodeTask` — `starterCode`, `expectedAnswer`, `order`

### UserLessonProgress

One record per (user, lesson) pair. `@@unique([userId, lessonId])`.

| Field | Type | Notes |
|---|---|---|
| progressPercent | Int | 0–100 |
| isCompleted | Boolean | |
| xpEarned | Int | 0 on re-completion |
| completedAt | DateTime? | first completion timestamp |
| lastOpenedAt | DateTime? | updated on every complete call |

### DailyActivity

One record per (user, UTC-midnight-date). `@@unique([userId, date])`.
`lessonsCompleted` increments on each new (non-duplicate) lesson completion.
Used for: streak calculation + `dailyProgress` in `/api/for-you`.

### User — updated fields (same migration)

- `streakLastDate` renamed to `lastActivityDate`
- Added relations: `progress UserLessonProgress[]`, `dailyActivities DailyActivity[]`

### New enums (same migration)

- `LessonDifficulty`: BEGINNER / BASIC / INTERMEDIATE
- `LessonContentType`: TEXT
- `QuizQuestionType`: SINGLE_CHOICE / MULTIPLE_CHOICE / FILL_CODE
- `ProgrammingLanguage`: added REACT

## Planned models (future migrations)

- `Course` — group lessons into named courses
- `XpEvent` — immutable log of every XP grant (userId, amount, reason, createdAt)
