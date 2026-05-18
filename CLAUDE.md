# Diploma API — Engineering Reference

Backend for a gamified, adaptive programming-learning platform. University diploma project. This file is the architectural hub — every module has its own `CLAUDE.md` that goes deeper.

> **Reading order for a cold start**: this file → [prisma/CLAUDE.md](prisma/CLAUDE.md) → the module CLAUDE.md most relevant to your task.

---

## 1. Project overview

### Product

A learning platform where users pick a language (currently Python), get an adaptive progression entry point during onboarding, complete lessons (delivered by the frontend), solve a daily coding challenge, build streaks, level up, earn badges, befriend other users, compete in league-bracketed leaderboards, and run shared XP-goal challenges with friends.

### Educational philosophy

- **Adaptive, not linear.** A user's starting lesson and unlock pace are derived from declared level + Bayesian Knowledge Tracing of skill mastery, not from a fixed curriculum tree on the server.
- **Spaced practice over cramming.** SuperMemo-2 schedules per-skill reviews independently of "is this mastered?".
- **Single source of truth for XP.** Every grant goes through one append-only audit log (`XPTransaction`). XP, level, league, daily activity, collab-challenge contributions, and `xpToday` are all derived from this log + cached on `User`.
- **Lightweight, deterministic, explainable.** No ML infrastructure; algorithms are pure functions auditable from a few hundred lines of code. Every "why did this badge unlock?" or "why was I recommended this lesson?" can be answered by reading the relevant CLAUDE.md.

### Architectural axiom — frontend owns curriculum, backend owns everything else

This is the most load-bearing decision in the system. **Internalize it before touching anything.**

**Frontend owns:**
- Lesson content (theory, code, quizzes, blocks).
- Course / track / section structure (rendering).
- Lesson runtime: block flow, quiz answer validation, gating logic between blocks.
- Code editor UI for the daily challenge.

**Backend owns:**
- Auth + user accounts.
- Onboarding persistence + adaptive starting-lesson computation.
- XP economy + level + streaks + daily activity.
- Lesson completion persistence (a single endpoint: `POST /api/lessons/:id/complete`).
- Daily challenge pool, daily rotation, **server-side validation**, completion state, XP reward.
- Skill mastery (BKT).
- Spaced repetition (SM-2).
- Badges (auto-unlock + notifications).
- Adaptive recommendations.
- Friends graph + leagues + leaderboard + collaborative challenges.

**Why this split:**
- Faster frontend iteration on content. No DTO drift between renderer and content schema.
- The backend stays effectively content-blind. Renaming a lesson on the frontend doesn't require a backend migration — completion records survive renames as orphaned `lessonId` strings.
- No renderer crashes from mismatched payloads.
- The team can replace the entire curriculum without touching the backend.

### Synchronization contract

Frontend and backend agree on **two stable identifiers**:

1. **`lessonId: string`** — kebab-case, language-prefixed (e.g. `python-print-first-output`). Stable across content rewrites. The backend stores progression keyed by this string but does NOT validate that any lesson with this id exists.
2. **`SkillTag` enum** (10 values: `VARIABLES`, `LOOPS`, `FUNCTIONS`, `RECURSION`, `OOP`, `CONDITIONS`, `LISTS`, `DICTIONARIES`, `STRINGS`, `ARRAYS`). Frontend lessons declare which skills they exercise; the backend uses tags to drive BKT, recommendations, SM-2, and badge unlocks.

The backend keeps a **minimal in-code curriculum registry** ([`src/curriculum/registry.ts`](src/curriculum/registry.ts) + [`src/curriculum/skill-tags.ts`](src/curriculum/skill-tags.ts)) containing ONLY lesson IDs, module groupings, level→starting-lesson mapping, icon metadata, and the skill→canonical-review-lesson mirror. No rendered content, no payloads. The registry is the bare minimum required for the backend to answer "where should this user resume?", "what module is this lesson in?", "which review lesson covers this weak skill?".

---

## 2. Tech stack

### Backend (this repo)

| Layer | Choice | Notes |
|---|---|---|
| Framework | NestJS 11 | Modular DI, controllers/services, decorator-driven |
| Language | TypeScript (strict) | `noImplicitAny`, `strictNullChecks` |
| Database | PostgreSQL 16 | Local: Docker (`diploma_postgres`) |
| ORM | Prisma 6 | Schema → migrations → typed client |
| Auth | Passport JWT | `Authorization: Bearer <token>` |
| Validation | class-validator + class-transformer | DTOs at boundaries |
| Password hashing | bcrypt 6 | Native binding via node-gyp |
| API docs | Swagger / OpenAPI | Auto-generated at `/api/docs` (UI) and `/api/docs-json` |
| Package manager | pnpm | Never use npm/yarn |

### Frontend (separate repo `diploma-frontend`)

Not in this repo but documented in [docs/FRONTEND_ARCHITECTURE.md](docs/FRONTEND_ARCHITECTURE.md). Key points:

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Animation | Framer Motion |
| Curriculum | Frontend-owned registry (TS modules) |

### Why these choices

- **Prisma 6 (not 7)**: v7 dropped `url` from `schema.prisma` in favour of a separate `prisma.config.ts` with a DB adapter. Too much ceremony for a one-developer diploma project.
- **NestJS over Express**: free modular DI, controller decorators, OpenAPI generation. Heavy enough to be opinionated; light enough for an MVP.
- **PostgreSQL**: needed real enums + composite unique indexes + cascade deletes. Prisma's Postgres support is the most mature.
- **JWT (not sessions)**: stateless backend, mobile-friendly, no Redis dependency.

---

## 3. High-level architecture

```
┌─ Frontend (Next.js 16) ──────────────────────────────────────────┐
│  curriculum registry  ·  lesson runtime  ·  quiz renderer        │
│  challenge editor     ·  profile / leaderboard / friends UI      │
└──────────────────┬──────────────────────────────────────────────┘
                   │  HTTPS · JWT bearer · application/json
                   ▼
┌─ Backend (NestJS) ───────────────────────────────────────────────┐
│                                                                  │
│  Auth layer ─────────── JwtAuthGuard, JwtStrategy, CurrentUser   │
│                                                                  │
│  Domain modules ┬─ users / auth / onboarding / profile           │
│                 ├─ lessons (complete only)                       │
│                 ├─ daily-challenge (rotate / submit / validate)  │
│                 ├─ progress / tracks / for-you (aggregators)     │
│                 ├─ skill-mastery (BKT)                           │
│                 ├─ spaced-repetition (SM-2)                      │
│                 ├─ recommendations                               │
│                 ├─ badges                                        │
│                 ├─ friends                                       │
│                 ├─ leaderboard (XP → league)                     │
│                 └─ collaborative-challenges                      │
│                                                                  │
│  Pure-function libs ─── src/adaptive/{bkt.ts, sm2.ts}            │
│                          src/leagues/leagues.ts                  │
│                          src/curriculum/{registry.ts,            │
│                                          skill-tags.ts}          │
│                                                                  │
│  Persistence ────────── PrismaService (singleton)                │
└──────────────────┬──────────────────────────────────────────────┘
                   ▼
                 PostgreSQL
```

### Layer responsibilities

| Layer | Concern |
|---|---|
| **Controllers** | HTTP wiring, request validation (DTOs), Swagger annotations. No business logic. |
| **Services** | Domain logic, talks to Prisma, owns transactions. One service per module. |
| **Pure libs** (`adaptive/`, `leagues/`, `curriculum/`) | Stateless algorithms / lookups. No I/O. Easy to unit-test. |
| **Prisma** | The DB schema is the contract. All transactions go through `PrismaService.$transaction`. |

### Cross-module integration patterns

- **XP grants**: every endpoint that awards XP calls `XpService.awardInTx(tx, ...)` inside its own `prisma.$transaction`. This guarantees `XPTransaction` rows, `User.xp`, and `User.level` are always in sync.
- **Skill mastery**: `SkillMasteryService.recordAttempt(userId, skillTag, correct, tx?)` accepts an optional `tx` so callers can fold mastery updates into the same transaction as XP.
- **Badge unlocks**: `BadgesService.checkAndUnlock(userId)` is called AFTER the transaction commits. It reads the just-updated state, finds newly-qualified badges, creates rows, and returns them so callers can include `newBadges` in the response.

---

## 4. Frontend ↔ backend contract (critical)

### Stable identifiers

- `lessonId: string` — kebab-case, language-prefixed. Examples: `python-print-first-output`, `python-for-loops`, `python-classes-intro`.
- `SkillTag` — see enum list above.
- `slug` — used for daily challenges and badges. Stable across content rewrites.

### What the backend will NOT do

- ❌ Return lesson content (theory / blocks / quizzes / code samples). There are no such tables.
- ❌ Validate that a `lessonId` refers to a real lesson. `POST /api/lessons/:id/complete` accepts any string.
- ❌ Execute user-submitted code. Daily challenge validation is normalized-string comparison (see [daily-challenge/CLAUDE.md](src/modules/daily-challenge/CLAUDE.md)).
- ❌ Validate quiz answers. The frontend grades them and reports outcomes via `POST /api/skills/record`.
- ❌ Maintain a full curriculum tree. The minimal in-code registry has IDs + ordering + icon metadata; nothing else.

### What the frontend will NOT do

- ❌ Compute XP, level, streak, or league client-side from lesson completions. Always read these from `User`-derived endpoints.
- ❌ Decide whether a badge is unlocked. The backend returns `newBadges` in completion responses.
- ❌ Store progress in localStorage as a source of truth. `UserLessonProgress` rows are authoritative.

### What goes over the wire — minimum payload shapes

- **Lesson completion** (`POST /api/lessons/:id/complete`):
  ```json
  { "xpReward": 10, "skillTags": ["VARIABLES", "LOOPS"] }
  ```
  Backend persists, awards XP, updates streak, records `correct` BKT attempts for each tag, runs badge check.

- **Per-attempt skill update** (`POST /api/skills/record`):
  ```json
  { "skillTag": "LOOPS", "correct": true }
  ```
  Frontend calls this for every quiz answer / code task verdict — gives the BKT model finer-grained signal than lesson completion alone.

### What happens when the frontend renames a `lessonId`

- The old `UserLessonProgress` row stays in the DB (append-only history).
- Existing `XPTransaction` rows referencing the old id stay valid (the column is a free string, no FK).
- The lesson stops counting toward `totalLessonsCount` and `unlockedLessons` for any track view, because the registry no longer knows the old id.
- New completions with the new id create a fresh `UserLessonProgress` row.

If a rename happens, update [`src/curriculum/registry.ts`](src/curriculum/registry.ts) in lockstep.

---

## 5. Database overview

Full reference: [prisma/CLAUDE.md](prisma/CLAUDE.md). Quick map below.

### Core (auth + identity)

| Table | Purpose |
|---|---|
| `users` | Account + cached gamification stats (`xp`, `level`, `streak`, `lastActivityDate`). |
| `onboardings` | Quiz answers (`selectedLanguage`, `currentLevel`, `learningGoal`, …) + computed `startingLessonId`. 1-to-1 with `users`. |

### Progression engine

| Table | Purpose |
|---|---|
| `user_lesson_progress` | One row per `(userId, lessonId)`. `isCompleted`, `completedAt`, `xpEarned`. |
| `xp_transactions` | Append-only audit log of every XP grant. Indexed on `(userId, createdAt)` for `xpToday`. |
| `daily_activities` | One row per `(userId, UTC-day)`. Used by streak logic. |

### Daily challenge

| Table | Purpose |
|---|---|
| `daily_challenges` | Curated pool. `slug`-keyed. Holds `expectedSolution` (never sent to client). |
| `user_daily_challenges` | Per-user state: `submittedCode`, `isCompleted`, `completedAt`. |

### Adaptive learning

| Table | Purpose |
|---|---|
| `user_skill_mastery` | BKT state per `(userId, SkillTag)` — mastery, confidence, attempt counts. |
| `user_skill_reviews` | SM-2 schedule per `(userId, SkillTag)` — interval, ease, next review. |

### Gamification + social

| Table | Purpose |
|---|---|
| `badges` | Curated badge pool. Skill-tagged or XP-gated. |
| `user_badges` | Unlocked badges per user. `isSeen` for notification flow. |
| `friendships` | Edge in friend graph. `(requesterId, addresseeId, status)`. |
| `collaborative_challenges` | Shared XP-goal challenges. |
| `collaborative_challenge_participants` | Participants per challenge. Contributions are computed read-side. |

### Enums

`ProgrammingLanguage`, `UserLearningLevel`, `LearningGoal`, `DailyLearningTime`, `PreferredLearningFormat`, `ChallengeValidationType`, `SkillTag`, `FriendshipStatus`.

There is NO league enum — league is a pure function of `User.xp`.

---

## 6. Progression system

### XP

- **Formula for level**: `level = floor(xp / 100) + 1`. Static method [`XpService.level`](src/modules/lessons/xp.service.ts).
- **Sources**:
  | Source | Amount | Reason string |
  |---|---|---|
  | Lesson completion | `dto.xpReward ?? 10` (max 200) | `lesson_complete` |
  | Daily challenge solved | `challenge.xpReward` (~20-30) | `daily_challenge_complete` |
- **Audit log**: every grant writes one `XPTransaction` row inside the same transaction that updates `User.xp` and `User.level`. The audit log is **never updated, never deleted** — it's the only place `User.xp` is mutated.
- **xpToday**: computed by `SUM(amount)` over `XPTransaction` where `createdAt >= today UTC midnight`. Surface this in `/api/progress` and `POST /api/daily-challenge/:id/submit` responses.

### Level

`User.level` is a denormalised cache of the formula. Recomputed on every XP grant by `XpService.awardInTx`. Read directly from `User`; never recompute on read.

### Streak

UTC midnight-normalised. First-time completion of EITHER a lesson OR a daily challenge counts as activity for today.

| Scenario (today vs. `lastActivityDate`) | Result |
|---|---|
| `lastActivityDate = null` | streak = 1 |
| Yesterday | streak += 1 |
| 2+ days ago | streak reset to 1 |
| Today already | unchanged |
| Re-completing same lesson/challenge | unchanged |

Updates happen ONLY on first-time completion. Already-completed paths short-circuit before touching streak.

### Unlock logic (adaptive)

Lives in `computeUnlockedLessons` in [`src/curriculum/registry.ts`](src/curriculum/registry.ts).

1. Resolve `startingLessonId` from onboarding (level + language).
2. From `startingLessonId` forward in registry order, a lesson is unlocked iff it IS the starting lesson OR the previous lesson is completed OR the lesson itself is completed.
3. Lessons before the starting lesson are locked-out by default. Lessons before the start that the user nonetheless completed remain "unlocked" (for review).
4. `currentLessonId` = first unlocked, uncompleted lesson.

### Duplicate XP protection

Every completion endpoint checks `isCompleted` BEFORE entering the XP transaction. If already complete:
- No XP awarded.
- No `XPTransaction` row.
- No streak change.
- No `DailyActivity` increment.
- Response indicates the no-op (`alreadyCompleted: true` or `earnedXp: 0`).

This is enforced by row-level checks, not by unique-constraint races — but the row uniqueness (`@@unique([userId, lessonId])`, `@@unique([userId, challengeId])`) prevents duplicate rows from being created even under concurrent submit pressure.

---

## 7. Adaptive learning system

Two independent algorithms, both pure functions:

### BKT — Bayesian Knowledge Tracing ([src/adaptive/bkt.ts](src/adaptive/bkt.ts))

**Answers**: "Has this user learned this skill?"

Four-parameter model, shared across all skills:
```
PRIOR (P_L0)  = 0.10   prior on a fresh skill
TRANSIT (P_T) = 0.10   probability of learning per attempt
GUESS (P_G)   = 0.20   correct without knowing
SLIP (P_S)    = 0.10   incorrect despite knowing
```

Per-attempt update:
```
P(L | correct)   = P(L)(1-S) / ( P(L)(1-S) + (1-P(L))G )
P(L | incorrect) = P(L)S     / ( P(L)S + (1-P(L))(1-G) )
P(L)_new         = P(L | obs) + (1 - P(L | obs)) * T
```

`masteryScore = P(L)_new`. `confidenceLevel = min(1, totalAttempts / 20)` — gates badges and recommendations so single attempts don't trigger false signals.

**IRT-lite seeding**: instead of running a full IRT estimation loop, the onboarding-declared level seeds the BKT prior on first attempt:

| Level | Initial prior |
|---|---|
| BEGINNER | 0.10 |
| INTERMEDIATE | 0.30 |
| ADVANCED | 0.50 |

### SM-2 — Spaced Repetition ([src/adaptive/sm2.ts](src/adaptive/sm2.ts))

**Answers**: "When should this user review this skill to retain it?"

Classic SuperMemo-2. User supplies recall quality `q ∈ [0..5]`:
```
EF' = max(1.3, EF + (0.1 - (5-q)(0.08 + (5-q)*0.02)))

q < 3:  intervalDays = 1; repetitionCount = 0
q ≥ 3:
  repetition 0 → 1 day
  repetition 1 → 6 days
  repetition n → max(1, round(prevInterval * EF'))

nextReviewAt = now + intervalDays * 24h
```

Expected stable-`q=4` growth: 1 → 6 → 14 → 34 → 84 days …

### BKT vs SM-2 — the orthogonality

| Question | BKT | SM-2 |
|---|---|---|
| Is the skill learned? | yes | — |
| When to surface a review? | — | yes |
| Updated on each quiz attempt? | yes | no |
| Updated on user "I forgot / got it" rating? | no | yes |
| Drives badge unlocks? | yes | no |
| Drives review feed? | no | yes |

A skill can be "mastered" in BKT (`masteryScore > 0.9`) AND simultaneously "due" in SM-2 (84 days since last review). They never share state.

### Recommendation engine ([src/modules/recommendations](src/modules/recommendations/))

**Rule**: skill is weak iff `masteryScore < 0.6 AND totalAttempts >= 3`. Top 3 weak skills are returned; each maps to a canonical review lesson via [`SKILL_REVIEW_LESSON`](src/curriculum/skill-tags.ts) (where defined).

No collaborative filtering, no neural recommender. Anyone debugging "why was I recommended X?" can read the rule above and check their mastery vector.

---

## 8. Social systems

### Friends graph

`Friendship(requesterId, addresseeId, status)` with `@@unique([requesterId, addresseeId])`. Application-layer treats `(A,B)` and `(B,A)` as duplicates and prevents either direction from being re-created while PENDING / ACCEPTED. `REJECTED` rows can be revived as a fresh `PENDING`.

| Status | Set by | Transitions to |
|---|---|---|
| PENDING | `POST /api/friends/request` | ACCEPTED, REJECTED |
| ACCEPTED | addressee via `/accept` | (terminal) |
| REJECTED | addressee via `/reject` | PENDING (on re-request) |

Self-friending and conflicting duplicate requests are rejected.

### Leagues ([src/leagues/leagues.ts](src/leagues/leagues.ts))

Pure function `leagueForXp(xp): League`. No DB column on `User` — league is derived at request time so threshold tweaks don't need migrations.

| League | XP |
|---|---|
| BRONZE | 0 – 199 |
| SILVER | 200 – 499 |
| GOLD | 500 – 1499 |
| PLATINUM | 1500 – 3999 |
| DIAMOND | 4000+ |

### Leaderboard

`GET /api/leaderboard` returns top 25 users in the requesting user's league, sorted `xp DESC`, then `createdAt ASC` (stable tiebreaker). Rank is computed against the full league count, not just the slice. Cross-league comparisons are intentionally impossible.

### Collaborative challenges

A small group (typically friends) commits to collectively earning `xpGoal` XP before `expiresAt`. **The challenge does not grant its own XP** — it's a lens over the existing XP economy. Contributions are computed read-side by summing `XPTransaction.amount` per participant inside the challenge window `[createdAt, min(expiresAt, now)]`. No special XP path, no double-bookkeeping.

---

## 9. Daily challenge system

### Lifecycle

1. **Daily rotation**: `pickTodaysChallenge()` returns `published[dayIndexUTC(today) % publishedCount]` — deterministic, same for everyone on a given UTC day.
2. **Fetch**: `GET /api/daily-challenge` returns the challenge + this user's completion state.
3. **Submit**: `POST /api/daily-challenge/:id/submit { code }` runs the validator, persists state, awards XP on first-time correct.

### Validation

Server-side string comparison only. **No code execution**, intentionally — see [daily-challenge/CLAUDE.md](src/modules/daily-challenge/CLAUDE.md) for the security rationale.

| Validator | Logic |
|---|---|
| `EXACT_MATCH` | Bytewise equality |
| `NORMALIZED_MATCH` | Strip trailing whitespace, drop blank lines, normalize `\r\n` → `\n`, trim outer. **Indentation preserved** (Python depends on it). |

The single entrypoint is `validate(type, submitted, expected)` in [`src/modules/daily-challenge/challenge-validator.ts`](src/modules/daily-challenge/challenge-validator.ts). Adding a future `AST_DIFF`, `TEST_CASES`, or `SANDBOX_EXEC` validator means extending this switch — no controller or service changes needed.

### XP + duplicate protection

First correct submission, inside one transaction:
1. Upsert `UserDailyChallenge` → `isCompleted=true`, `submittedCode`, `completedAt`.
2. `XpService.awardInTx` → `User.xp +=` reward, level recomputed, `XPTransaction` written.
3. Streak update (shared with lessons).
4. Upsert today's `DailyActivity`.

Then (post-commit): badge unlock check + `xpToday` aggregation, both folded into the response.

Wrong submission: row is upserted with `submittedCode` (for editor rehydration), `isCompleted=false`. No XP, no streak, no DailyActivity.

Repeat correct submission: fast path. Loads user, returns `{ correct: true, earnedXp: 0, ... }` with current state. No DB writes.

---

## 10. Project structure

```
src/
  main.ts                 — Nest bootstrap, global `/api` prefix, Swagger setup
  app.module.ts           — root module, imports every feature module

  common/
    prisma/               — PrismaService (global singleton)

  adaptive/               — pure-function algorithm modules (no I/O)
    bkt.ts                — BKT update + confidence + IRT-lite seeding
    sm2.ts                — SM-2 update + initial state

  curriculum/             — minimal in-code curriculum registry
    registry.ts           — modules, lesson IDs, level→start, icon metadata
    skill-tags.ts         — SkillTag → canonical review lesson mapping

  leagues/                — pure XP→league function
    leagues.ts

  modules/                — one folder per feature
    auth/                 — JWT register/login/me
      dto/, guards/, strategies/, decorators/
    users/                — admin-style CRUD + sanitize()
      dto/
    onboarding/           — quiz + adaptive startingLessonId
      dto/
    lessons/              — POST /:id/complete (single endpoint)
      dto/                — CompleteLessonDto (xpReward, skillTags)
      xp.service.ts       — XpService.awardInTx, XpService.level
    tracks/               — GET /:language/progress
    progress/             — GET /api/progress (aggregator)
    for-you/              — GET /api/for-you (homepage aggregator)
    profile/              — GET/PATCH /api/profile/me + logout + badge notifications
      dto/
    daily-challenge/      — GET /, POST /:id/submit
      dto/                — SubmitChallengeDto
      challenge-validator.ts — validate(type, submitted, expected)
    skill-mastery/        — POST /api/skills/record, GET /api/skills/mastery
      dto/                — RecordAttemptDto
    badges/               — GET /api/badges/me + notifications
    recommendations/      — GET /api/recommendations
    spaced-repetition/    — POST /api/reviews/rate, GET /api/reviews/due
      dto/
    friends/              — friend graph endpoints
      dto/
    leaderboard/          — GET /api/leaderboard
    collaborative-challenges/ — collab challenge endpoints
      dto/

prisma/
  schema.prisma           — source of truth for DB schema
  migrations/             — auto-generated SQL, committed to git
  seed.ts                 — idempotent: daily challenges + badges

docs/
  FRONTEND_ARCHITECTURE.md  — frontend architecture overview (kept in this repo for cross-reference)
```

### Folder responsibilities

| Folder | Owns | Does NOT |
|---|---|---|
| `src/common/` | Cross-cutting infrastructure (PrismaService) | Business logic |
| `src/adaptive/` | Algorithmic helpers (BKT, SM-2) | DB access, NestJS DI |
| `src/curriculum/` | Lesson ID structure + icon metadata | Rendered content, payloads |
| `src/leagues/` | XP → league pure function | Persisted league state |
| `src/modules/*/` | One feature each. Controller + service + DTOs + CLAUDE.md | Crossing into other modules' DB tables |
| `prisma/` | Schema + migrations + seed | Anything not schema-related |

---

## 11. Coding conventions

### Naming

- **Files**: kebab-case. `lessons.service.ts`, `complete-lesson.dto.ts`.
- **Classes**: PascalCase. `LessonsService`, `CompleteLessonDto`.
- **Types & interfaces**: PascalCase. `SkillMasterySummary`, `LeagueBracket`.
- **Variables & functions**: camelCase. `recordAttempt`, `startOfDayUTC`.
- **Prisma models**: PascalCase singular. `User`, `UserLessonProgress`.
- **Prisma tables**: snake_case plural via `@@map`. `users`, `user_lesson_progress`.
- **Columns**: camelCase. Prisma auto-maps.
- **Enums**: SCREAMING_SNAKE_CASE values. `BEGINNER`, `LESSON_COMPLETE`.
- **Lesson IDs (the synchronization contract)**: kebab-case, language-prefixed. `python-print-first-output`.

### DTOs

- One file per DTO. Co-located with the module under `dto/`.
- Always use `@ApiProperty` / `@ApiPropertyOptional` for Swagger.
- Always use class-validator decorators (`@IsString`, `@IsInt`, `@IsEnum`, …).
- `ValidationPipe` global config: `whitelist: true` (strips unknown fields), `forbidNonWhitelisted: true` (throws on unknown fields), `transform: true` (type coercion).

### Services

- One service per module. Owns all Prisma access for the module's tables.
- Accept an optional `tx?: Prisma.TransactionClient` on methods that might be folded into a caller's transaction (e.g. `SkillMasteryService.recordAttempt`).
- Read first, write inside `prisma.$transaction()` if multiple writes.
- Never put business logic in the controller.

### Controllers

- Pure HTTP wiring. Map routes, validate DTOs, extract user via `@CurrentUser()`, delegate to service, return the result verbatim.
- One file per module. Decorated with `@ApiTags`, `@ApiBearerAuth`, `@UseGuards(JwtAuthGuard)` if protected.

### Prisma transactions

- Always use `prisma.$transaction(async (tx) => { ... })` for multi-write operations.
- Always pass `tx` to nested service methods that accept it.
- Compute post-commit values (e.g. `xpToday`) AFTER the transaction returns.

### Error responses

- Use Nest's built-in HTTP exceptions: `BadRequestException`, `NotFoundException`, `ConflictException`, `ForbiddenException`, `UnauthorizedException`.
- Login endpoint returns generic `"Invalid credentials"` for both wrong email and wrong password (prevents enumeration).

### Never

- ❌ Return `passwordHash`. `UsersService.sanitize()` strips it. Use `Omit<User, 'passwordHash'>` in return types.
- ❌ Mutate `User.xp` outside `XpService.awardInTx`. The audit log MUST stay in sync.
- ❌ Add a feature flag or backward-compat shim when you can just change the code.
- ❌ Hand-edit applied migration SQL.

---

## 12. API design rules

### Global

- All routes mounted under `/api` (set by `app.setGlobalPrefix('api')` in [main.ts](src/main.ts)).
- Swagger UI: `/api/docs`. OpenAPI JSON: `/api/docs-json`.
- All routes except `/api/auth/register` and `/api/auth/login` require `Authorization: Bearer <token>`.
- Responses are always JSON. Errors use the standard Nest envelope: `{ "message": "...", "error": "...", "statusCode": 4xx }`.

### Endpoint catalogue

| Method | Path | Module | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | auth | public |
| POST | `/api/auth/login` | auth | public |
| GET | `/api/auth/me` | auth | JWT |
| POST | `/api/users` | users | JWT |
| GET | `/api/users` | users | JWT |
| GET | `/api/users/:id` | users | JWT |
| POST | `/api/onboarding` | onboarding | JWT |
| GET | `/api/onboarding/me` | onboarding | JWT |
| PATCH | `/api/onboarding/me` | onboarding | JWT |
| POST | `/api/lessons/:id/complete` | lessons | JWT |
| GET | `/api/tracks/:language/progress` | tracks | JWT |
| GET | `/api/progress` | progress | JWT |
| GET | `/api/for-you` | for-you | JWT |
| GET | `/api/daily-challenge` | daily-challenge | JWT |
| POST | `/api/daily-challenge/:id/submit` | daily-challenge | JWT |
| GET | `/api/skills/mastery` | skill-mastery | JWT |
| POST | `/api/skills/record` | skill-mastery | JWT |
| GET | `/api/recommendations` | recommendations | JWT |
| GET | `/api/reviews/due` | spaced-repetition | JWT |
| POST | `/api/reviews/rate` | spaced-repetition | JWT |
| GET | `/api/badges/me` | badges | JWT |
| GET | `/api/profile/badge-notifications` | badges | JWT |
| POST | `/api/profile/badge-notifications/seen` | badges | JWT |
| POST | `/api/friends/request` | friends | JWT |
| POST | `/api/friends/accept` | friends | JWT |
| POST | `/api/friends/reject` | friends | JWT |
| GET | `/api/friends` | friends | JWT |
| GET | `/api/friends/pending` | friends | JWT |
| GET | `/api/friends/progress` | friends | JWT |
| GET | `/api/leaderboard` | leaderboard | JWT |
| POST | `/api/challenges/create` | collaborative-challenges | JWT |
| POST | `/api/challenges/join` | collaborative-challenges | JWT |
| GET | `/api/challenges` | collaborative-challenges | JWT |
| GET | `/api/profile/me` | profile | JWT |
| PATCH | `/api/profile/me` | profile | JWT |
| POST | `/api/profile/logout` | profile | JWT |

### Response shape consistency

- **List endpoints**: usually a raw array OR `{ key: [...] }` wrapper when the list represents a single concept. E.g. `GET /api/badges/me` returns a raw array, while `GET /api/friends/progress` returns `{ friends: [...] }`. The wrapper makes it easier to add metadata (counts, pagination) later without a breaking change.
- **Aggregator endpoints**: flat object with named fields (`/api/progress`, `/api/for-you`, `/api/tracks/:language/progress`).
- **Mutation endpoints**: return the post-mutation state of the affected entity OR a small success envelope. Lesson/challenge completion returns the latest XP/streak/level so the frontend doesn't need a follow-up read.
- **Idempotency**: completion endpoints are idempotent at the row level — re-calling them is safe and returns the no-op result (`alreadyCompleted: true` or `earnedXp: 0`).

### Pagination

Not implemented. League cohorts and friend lists are small enough at MVP. Add cursor pagination when needed.

---

## 13. Future scaling notes

Marked **not implemented** unless stated otherwise. Treat these as "the architecture is ready for, but the code is not".

### AI tutoring (not implemented)

Could use the BKT mastery vector + recent `XPTransaction` history + lesson completion timeline as a feature set for a tutoring LLM. The data exists; the integration does not.

### Code execution sandbox (not implemented)

The daily challenge validator interface (`validate(type, submitted, expected)`) is designed so a future `TEST_CASES` or `SANDBOX_EXEC` validator can be added without touching controllers or services. Implementation would need a sandboxed Python container (gVisor / nsjail / Pyodide) plus per-challenge test case storage. Out of scope for MVP.

### Mobile app (not implemented)

Backend is JWT-only and CORS-friendly, so a React Native / Flutter / Capacitor frontend can consume it without changes. No web-only assumptions in any endpoint.

### Advanced recommendations (not implemented)

Current engine is threshold-based. Future paths: collaborative filtering across users with similar mastery vectors; bandit-style A/B selection of review lessons; LLM-generated remediation suggestions.

### CMS (not implemented)

Lesson content lives in the frontend repo as TypeScript modules. A CMS would mean either: (a) moving content into the backend (rejected — see "Architectural axiom"), or (b) a Sanity / Contentful integration that publishes static JSON to the frontend.

### Challenge generator (not implemented)

Currently 12 hand-seeded Python challenges in [`prisma/seed.ts`](prisma/seed.ts). A future LLM-backed generator could produce challenge + `expectedSolution` + `expectedOutput` triples; the existing schema (`DailyChallenge`) is ready.

### Multi-language tracks (partially scaffolded)

Schema and `ProgrammingLanguage` enum already support JS / TS / HTML_CSS / React. The curriculum registry has placeholder track entries with empty `modules: []`. To enable a new language: fill in the modules + lessons in the registry + add a `levelStartingLessonId` map + matching frontend content.

### XP decay / streak insurance / leaderboard seasons (not implemented)

Schema doesn't need changes for any of these. They'd be cron-driven write paths on top of the existing `XPTransaction` and `User.streak` columns.

---

## 14. MVP constraints (do not violate)

These rules earned their place by being violated in previous iterations:

- **No backend-owned lesson content.** Lesson IDs and skill tags are the only contract. If you find yourself adding a `lesson_blocks` table, stop.
- **No code execution.** Daily challenge validation is normalized-string comparison. Adding a sandbox is a multi-month project — out of scope.
- **No heavy ML.** BKT uses fixed parameters; recommendations are threshold-based. Collaborative filtering, neural recommenders, embedding models — all out of scope.
- **Deterministic + explainable.** Every "why was I recommended X / unlocked badge Y / shown this leaderboard rank" must be answerable by reading the relevant module CLAUDE.md.
- **Append-only XP.** Never delete or update `XPTransaction` rows. Never mutate `User.xp` outside `XpService.awardInTx`.

---

## 15. Commands

```bash
# Database (Docker)
pnpm db:up                     # start PostgreSQL container
pnpm db:down                   # stop PostgreSQL container

# Development
pnpm start:dev                 # dev server with hot-reload (port 3000)
pnpm build                     # production build to dist/
pnpm start:prod                # run the prod build

# Prisma
pnpm prisma:migrate            # create + apply DB migration (interactive)
pnpm prisma:generate           # regenerate TS client after schema change
pnpm prisma:studio             # visual DB browser UI
pnpm prisma:seed               # upsert daily challenges + badges (idempotent)

# Quality
pnpm lint                      # ESLint --fix
pnpm format                    # Prettier --write
```

### Environment variables (`.env`)

| Variable | Purpose | Example |
|---|---|---|
| `DATABASE_URL` | Postgres connection | `postgresql://postgres:password@localhost:5432/diploma_db?schema=public` |
| `JWT_SECRET` | Token signing key | (long random string) |
| `JWT_EXPIRES_IN` | Token TTL | `7d` |
| `PORT` | HTTP port | `3000` |

---

## 16. Module status snapshot

| Module | Status | Tag |
|---|---|---|
| auth | done | core |
| users | done | core |
| onboarding | done | core |
| lessons | done | progression |
| tracks | done | progression |
| progress | done | progression |
| for-you | done | progression |
| profile | done | profile |
| daily-challenge | done | gamification |
| skill-mastery | done | adaptive |
| spaced-repetition | done | adaptive |
| recommendations | done | adaptive |
| badges | done | gamification |
| friends | done | social |
| leaderboard | done | social |
| collaborative-challenges | done | social |

Every module has its own `CLAUDE.md` in `src/modules/<module>/CLAUDE.md`. Read those next.
