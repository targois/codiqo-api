# Prisma — CLAUDE.md

## Workflow

1. Edit `prisma/schema.prisma`
2. Run `pnpm prisma:migrate` (interactive) — or `pnpm prisma db push --accept-data-loss` (dev shortcut, no migration history)
3. Prisma auto-regenerates the TypeScript client
4. Run `pnpm prisma:seed` to refresh course content

Never edit migration SQL files by hand.

## Naming conventions

- Model names: PascalCase singular (`Course`, `Lesson`, `LessonBlock`)
- Table names: snake_case plural via `@@map("table_name")`
- Column names: camelCase in schema → Prisma auto-maps to the same in TS client
- IDs: `String @id @default(uuid())` for all PKs
- Slugs: `String @unique` on Course and Lesson — stable URLs, idempotent re-seed
- Timestamps: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`

## Domain hierarchy

```
Course (per language, per difficulty)
└── CourseSection (ordered)
    └── Lesson (ordered, slug, isFree?)
        └── LessonBlock (ordered, type, payload Json)
```

Per user:
```
UserLessonProgress (per lesson — status, percent, completedAt)
└── UserLessonBlockProgress (per block — isCompleted)
XPTransaction (append-only audit log of every XP award)
DailyActivity (per UTC day — for streak)
```

## Course

| Field | Notes |
|---|---|
| slug | unique, used in URLs and idempotent seed (`python-programming`) |
| language | `ProgrammingLanguage` enum — drives /api/tracks/:language and for-you |
| difficulty | overall course tier; individual lessons have their own difficulty |
| totalXp / estimatedMinutes | computed from sections at seed time |
| isPublished | gate visibility |

## CourseSection

| Field | Notes |
|---|---|
| courseId | FK → Course CASCADE |
| order | section order within the course (1-based) |
| totalXp / estimatedMinutes | computed from lessons at seed time |

## Lesson

Lesson no longer holds `language` directly — language lives on its `section.course`.
Queries that need language filter through `section.course.language`.

| Field | Notes |
|---|---|
| sectionId | FK → CourseSection CASCADE |
| slug | unique (`python-print-and-first-output`) |
| order | lesson order within the section (1-based) |
| difficulty | `LessonDifficulty` (BEGINNER/BASIC/INTERMEDIATE/ADVANCED) |
| xpReward | XP awarded on first completion |
| isFree | preview-without-account flag (not enforced in MVP) |

## LessonBlock

The single content unit. **`payload` is `Json` — never markdown, never HTML.**
Frontend renders by `type`; backend validates by `type` (e.g. quiz answer index).

| `type` | Payload shape |
|---|---|
| `THEORY` | `{ title, content }` |
| `ANALOGY` | `{ title, content }` |
| `CODE` | `{ language, filename, code }` |
| `EXPLANATION` | `{ items: [{ line, explanation }] }` |
| `MISTAKE` | `{ title, content }` |
| `QUIZ` | `{ question, answers: string[], correctAnswer: number, explanation }` |

`Json` (not `String`) keeps the contract structured and type-safe at the seed layer; the frontend never has to parse markdown.

## UserLessonProgress

Per `(userId, lessonId)`. `@@unique([userId, lessonId])`.

| Field | Notes |
|---|---|
| status | `LessonProgressStatus` — NOT_STARTED → IN_PROGRESS → COMPLETED |
| progressPercent | 0–100, recomputed on every block completion |
| isCompleted | mirror of `status = COMPLETED` for fast filtering |
| xpEarned | lesson.xpReward on first completion, 0 thereafter |
| completedAt / lastOpenedAt | first completion timestamp; bumped on every `start` |

## UserLessonBlockProgress

Per `(userId, blockId)`. `@@unique([userId, blockId])`.
For QUIZ blocks: only created when answer is correct.
For other blocks: created when frontend posts /complete.

`Lesson.progressPercent = round(completed blocks / total blocks * 100)` — recomputed automatically inside `LessonRuntimeService.completeBlock`.

## DailyActivity

Per `(userId, UTC-midnight-date)`. Increments on each new lesson completion. Source for streak + `dailyProgress` in /api/for-you.

## XPTransaction

Append-only audit log. Created by `XpService.awardInTx()`. Never updated/deleted.
Currently the only `reason` value is `lesson_complete`. Quiz/code-task XP from the previous architecture has been removed in favor of a single award on lesson completion.

## DailyChallenge / UserDailyChallenge

Architecture-only — no endpoints yet. Reserved for future feature.

## Migrations

| Migration | Notes |
|---|---|
| `20260509163635_init_users` | initial users |
| `20260512175805_add_onboarding` | onboarding |
| `20260513193042_add_lessons_progress_streak` | original lesson tables (dropped) |
| `20260514212246_add_runtime_tables` | XPTransaction etc. (UserQuizAnswer/UserCodeTaskSubmission later dropped) |
| (course_engine) | applied via `prisma db push` — Course/CourseSection/LessonBlock/UserLessonBlockProgress; dropped TheoryBlock/QuizQuestion/QuizAnswer/CodeTask/UserQuizAnswer/UserCodeTaskSubmission; added LessonProgressStatus + ADVANCED difficulty |

## Seed

`pnpm prisma:seed` runs `prisma/seed.ts`:
- wipes existing courses (cascades clean up sections/lessons/blocks/progress)
- recreates one course: "Python Programming" with 5 sections, 35 lessons, ~600 XP
- every lesson has 6 blocks: theory + analogy + code + explanation + mistake + quiz

The seed is idempotent (deletes & rebuilds) — safe to re-run.
