# Prisma — Database Reference

This is the canonical reference for every table, column, relation, and migration in the system. Read [the root CLAUDE.md](../CLAUDE.md) first for architectural context.

---

## 1. Workflow

1. Edit `prisma/schema.prisma`.
2. Run `pnpm prisma:migrate` (interactive). Prisma generates the migration, applies it, and regenerates the TS client.
3. If the migration is something Prisma can't generate cleanly inside its outer transaction (enum rewrites, in particular), fall back to:
   ```bash
   pnpm prisma migrate diff \
     --from-url "$DATABASE_URL" \
     --to-schema-datamodel prisma/schema.prisma \
     --script > prisma/migrations/<timestamp>_<name>/migration.sql
   # edit the SQL by hand, then:
   pnpm prisma migrate deploy
   pnpm prisma generate
   ```
4. Never hand-edit a migration that has already been applied.

### Seeding

`pnpm prisma:seed` runs [`prisma/seed.ts`](seed.ts), which upserts:

- ~12 Python daily challenges (`daily_challenges` table, keyed by `slug`).
- ~10 badges (`badges` table, keyed by `slug`) — 7 skill-tagged + 3 XP milestones.

Both pools upsert idempotently. Safe to re-run — user data is never touched.

### What is NOT seeded

- Lesson content. The frontend owns the curriculum. The backend's [`src/curriculum/registry.ts`](../src/curriculum/registry.ts) is a TS source file, not a DB row.
- Users. Created on demand by `POST /api/auth/register`.
- XPTransactions, friendships, badges-per-user, mastery, reviews, collab challenges. All created at runtime by domain endpoints.

---

## 2. Schema map

```
User (account + cached gamification stats)
 ├── Onboarding             1-to-1 optional
 ├── UserLessonProgress[]   per (userId, lessonId)
 ├── DailyActivity[]        per (userId, UTC-day)
 ├── XPTransaction[]        append-only audit log
 ├── UserDailyChallenge[]   per (userId, challengeId)
 ├── UserSkillMastery[]     BKT state, per (userId, SkillTag)
 ├── UserSkillReview[]      SM-2 schedule, per (userId, SkillTag)
 ├── UserBadge[]            unlocked badges
 ├── sentFriendRequests[]   Friendship as requester
 ├── receivedFriendRequests[] Friendship as addressee
 └── collabParticipations[] CollaborativeChallengeParticipant

DailyChallenge
 └── UserDailyChallenge[]

Badge
 └── UserBadge[]

CollaborativeChallenge
 └── CollaborativeChallengeParticipant[]

Friendship                  (no nested relations beyond requester/addressee)
```

---

## 3. Enums

### `ProgrammingLanguage`

`JAVASCRIPT | TYPESCRIPT | PYTHON | HTML_CSS | REACT`. Only `PYTHON` has a populated curriculum registry at MVP.

### `UserLearningLevel`

`BEGINNER | INTERMEDIATE | ADVANCED`. Used by onboarding + adaptive starting-lesson computation + BKT prior seeding.

(Legacy value `BASIC` was removed in the `adaptive_progression_and_daily_challenge` migration; existing `BASIC` rows were migrated to `BEGINNER`.)

### `LearningGoal`

`CAREER | STUDY | PET_PROJECT | JUST_FOR_FUN`. Currently stored only — no logic branches on it yet.

### `DailyLearningTime`

`FIVE_MIN | TEN_MIN | FIFTEEN_MIN | THIRTY_MIN`. Stored only.

### `PreferredLearningFormat`

`THEORY_FIRST | PRACTICE_FIRST | MIXED`. Stored only.

### `ChallengeValidationType`

`EXACT_MATCH | NORMALIZED_MATCH`. Drives the daily challenge validator. Future values (`AST_DIFF`, `TEST_CASES`) would land here.

### `SkillTag`

`VARIABLES | LOOPS | FUNCTIONS | RECURSION | OOP | CONDITIONS | LISTS | DICTIONARIES | STRINGS | ARRAYS`. The synchronization contract between frontend and backend for adaptive learning. Frontend lessons declare which skills they exercise via these tags.

### `FriendshipStatus`

`PENDING | ACCEPTED | REJECTED`. See `Friendship` below for the lifecycle.

### No `League` enum

League tiers (`BRONZE | SILVER | GOLD | PLATINUM | DIAMOND`) live in [`src/leagues/leagues.ts`](../src/leagues/leagues.ts) as a TypeScript union, not in the schema. League is a pure function of `User.xp` — no DB column needed.

---

## 4. Core models

### `User` (`users`)

The account record + a cache of derived gamification stats.

| Column | Type | Default | Notes |
|---|---|---|---|
| `id` | uuid | `uuid()` | PK |
| `email` | text | — | unique |
| `username` | text | — | unique |
| `passwordHash` | text | — | bcrypt; never exposed in API responses |
| `displayName` | text? | null | optional friendly name |
| `avatarUrl` | text? | null | currently unused, reserved |
| `xp` | int | 0 | running total — mutated ONLY by `XpService.awardInTx` |
| `level` | int | 1 | denormalised: `floor(xp / 100) + 1`. Always recomputed on XP grant. |
| `streak` | int | 0 | consecutive UTC days with activity |
| `lastActivityDate` | timestamp? | null | last day (UTC midnight-normalised) that counted toward streak |
| `isOnboardingComplete` | bool | false | set true atomically with `Onboarding` creation |
| `createdAt` | timestamp | now() | |
| `updatedAt` | timestamp | @updatedAt | |

**Why cached stats live on User:**
The bench-and-aggregate path (sum every `XPTransaction` on every read) is fine at small scale but burns CPU as the log grows. `User.xp` and `User.level` are denormalised so that frequent reads (`GET /api/profile/me`, `GET /api/progress`, leaderboard queries) hit a single row. `XPTransaction` remains the audit-truth — the cache cannot drift unless someone bypasses `XpService.awardInTx`.

### `Onboarding` (`onboardings`)

Quiz answers + the computed adaptive entry point. One row per user.

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | unique → 1-to-1 with `User` |
| `selectedLanguage` | enum | track the user chose |
| `currentLevel` | enum | drives starting-lesson selection AND BKT prior seeding |
| `learningGoal` / `dailyTime` / `preferredFormat` | enum | stored only, no logic branches yet |
| `startingLessonId` | text? | computed by `getStartingLessonId(language, level)` |
| `isCompleted` | bool | always true after creation; reserved for partial-onboarding flows |

`startingLessonId` is recomputed by `OnboardingService.update` only when `selectedLanguage` or `currentLevel` changes. Other field updates leave it untouched.

---

## 5. Progression engine

### `UserLessonProgress` (`user_lesson_progress`)

One row per `(userId, lessonId)`. `lessonId` is a free string — no foreign key. The backend never validates that `lessonId` references a real lesson.

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | FK CASCADE |
| `lessonId` | text | frontend-owned identifier |
| `isCompleted` | bool | flipped true on first completion; never downgraded |
| `completedAt` | timestamp? | first completion timestamp |
| `xpEarned` | int | XP awarded at first completion |
| `createdAt` / `updatedAt` | auto | |

`@@unique([userId, lessonId])` guards against duplicate rows under concurrent submit.

### `DailyActivity` (`daily_activities`)

One row per `(userId, UTC-midnight-date)`. Incremented on first-time lesson completion OR first-time daily challenge solve.

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | FK CASCADE |
| `date` | timestamp | midnight UTC |
| `lessonsCompleted` | int | counter — used by streak logic + future heatmap UIs |

`@@unique([userId, date])`. Name is historical — it actually counts both lessons and daily challenges.

### `XPTransaction` (`xp_transactions`)

The append-only audit log. **The only place `User.xp` is allowed to mutate is from `XpService.awardInTx`, which writes a matching row here.** Never `UPDATE` or `DELETE` an `XPTransaction`.

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | FK CASCADE |
| `amount` | int | XP awarded |
| `reason` | text | `lesson_complete` or `daily_challenge_complete` (more values can be added without schema changes) |
| `lessonId` | text? | optional free string, no FK |
| `createdAt` | timestamp | indexed via `(userId, createdAt)` for `xpToday` aggregates |

`@@index([userId, createdAt])` powers:
- `xpToday` in `/api/progress` and daily-challenge submit response (range query since today's UTC midnight).
- Collab challenge `contributedXp` (range query in the challenge window).

---

## 6. Daily challenge

### `DailyChallenge` (`daily_challenges`)

The curated rotating pool. Backend owns this table fully — it's the only persisted "content" the backend stores.

| Column | Type | Notes |
|---|---|---|
| `slug` | text | unique; idempotency key for the seed |
| `title` / `description` | text | shown in the UI |
| `difficulty` | text | free string (`"BEGINNER" / "INTERMEDIATE" / "ADVANCED"` by convention) |
| `estimatedMinutes` | int | hint for the UI |
| `xpReward` | int | default 25 |
| `language` | text | free string — kebab-case slug (`"python"`) |
| `starterCode` | text | initial editor content |
| `expectedOutput` | text | shown to the user as the target |
| `hint` | text? | shown after a wrong submission |
| `validationType` | enum | `EXACT_MATCH` or `NORMALIZED_MATCH` |
| `expectedSolution` | text? | **NEVER exposed via API** — only the server reads it |
| `isPublished` | bool | reserved; not currently filtered on |
| `createdAt` | timestamp | rotation order (`ORDER BY createdAt ASC`) |

### `UserDailyChallenge` (`user_daily_challenges`)

Per-user state — survives across days. `(userId, challengeId)` unique.

| Column | Type | Notes |
|---|---|---|
| `submittedCode` | text? | the user's latest attempt; persisted on every submit (right or wrong) so the editor can rehydrate |
| `isCompleted` | bool | flipped true on first correct submission |
| `completedAt` | timestamp? | first correct submission timestamp |

---

## 7. Adaptive learning

### `UserSkillMastery` (`user_skill_mastery`)

BKT state per skill. One row per `(userId, SkillTag)`.

| Column | Type | Notes |
|---|---|---|
| `skillTag` | enum | the skill being tracked |
| `masteryScore` | float | BKT posterior P(L), 0..1 |
| `correctAnswers` | int | running tally |
| `incorrectAnswers` | int | running tally |
| `totalAttempts` | int | sum of the two above |
| `confidenceLevel` | float | `min(1, totalAttempts / 20)` |
| `updatedAt` | timestamp | refreshed on every attempt |

`@@unique([userId, skillTag])` ensures one row per skill per user (Prisma upserts hit this key).

Why `confidenceLevel` is denormalised: badges and recommendations gate on it; computing on-the-fly is cheap but doing it in TS keeps the threshold logic colocated with the BKT params.

### `UserSkillReview` (`user_skill_reviews`)

SM-2 schedule per skill. Independent of `UserSkillMastery` — see root CLAUDE.md §7 for orthogonality.

| Column | Type | Default | Notes |
|---|---|---|---|
| `skillTag` | enum | — | |
| `intervalDays` | float | 1 | gap until next review |
| `easeFactor` | float | 2.5 | SM-2 ease; floored at 1.3 |
| `repetitionCount` | int | 0 | reset to 0 on `q < 3` |
| `nextReviewAt` | timestamp | — | when the review becomes due |
| `lastReviewedAt` | timestamp? | null | last `POST /api/reviews/rate` timestamp |
| `createdAt` | timestamp | now() | |

Indexes: `@@unique([userId, skillTag])` + `@@index([userId, nextReviewAt])` — the second powers `GET /api/reviews/due`.

---

## 8. Gamification

### `Badge` (`badges`)

Curated pool of unlockable badges. Seeded idempotently.

| Column | Type | Notes |
|---|---|---|
| `slug` | text | unique; idempotency key |
| `title` / `description` | text | shown in the UI |
| `iconKey` | text | stable semantic identifier — frontend maps to a visual component |
| `skillTag` | enum? | unlock when this skill's mastery clears the threshold |
| `xpRequirement` | int? | unlock when `User.xp >= xpRequirement` |
| `createdAt` | timestamp | |

Unlock conditions (one OR both, ANDed if both set):
- `skillTag`: `masteryScore >= 0.8 AND confidenceLevel >= 0.25`.
- `xpRequirement`: `User.xp >= xpRequirement`.

A badge with neither set is unreachable through the auto-checker — reserved for manual admin grants.

### `UserBadge` (`user_badges`)

Unlocked badges per user.

| Column | Type | Notes |
|---|---|---|
| `userId` | uuid | FK CASCADE |
| `badgeId` | uuid | FK CASCADE |
| `unlockedAt` | timestamp | now() |
| `isSeen` | bool | false until the user acknowledges via `/badge-notifications/seen` |

`@@unique([userId, badgeId])` prevents duplicate unlocks under race.

---

## 9. Social

### `Friendship` (`friendships`)

| Column | Type | Notes |
|---|---|---|
| `requesterId` | uuid | FK CASCADE |
| `addresseeId` | uuid | FK CASCADE |
| `status` | enum | PENDING / ACCEPTED / REJECTED |
| `createdAt` | timestamp | |

Indexes: `@@unique([requesterId, addresseeId])` + `@@index([addresseeId, status])` (the latter powers "pending requests for me" queries).

**Application-level rules** (enforced in `FriendsService`, not the DB):
- `(A, B)` and `(B, A)` are treated as duplicates. A PENDING or ACCEPTED row in either direction blocks a new request.
- A REJECTED row can be revived: re-requesting flips it back to PENDING and updates `requesterId/addresseeId` if direction changed.
- Self-friending is rejected with 400.
- Only the addressee can accept/reject a PENDING row.

### `CollaborativeChallenge` (`collaborative_challenges`)

A small group commits to collectively earning `xpGoal` XP before `expiresAt`. **Does not grant its own XP** — contributions are computed read-side from `XPTransaction` rows in the challenge window.

| Column | Type | Notes |
|---|---|---|
| `title` | text | display name |
| `xpGoal` | int | total target |
| `expiresAt` | timestamp | when contributions stop counting |
| `createdAt` | timestamp | start of the contribution window |

### `CollaborativeChallengeParticipant` (`collaborative_challenge_participants`)

| Column | Type | Notes |
|---|---|---|
| `challengeId` | uuid | FK CASCADE |
| `userId` | uuid | FK CASCADE |
| `contributedXp` | int | reserved — currently always 0; the actual contribution is computed read-side per request |

`@@unique([challengeId, userId])`.

The `contributedXp` column exists as a denormalisation hook for the future. Today every read recomputes contributions from `XPTransaction` because contributions need to reflect post-join activity only. If reads become expensive, a backfill job + transactional increment in `XpService.awardInTx` would denormalise this column without an API change.

---

## 10. Migration history

| Order | Migration | What it does |
|---|---|---|
| 1 | `init_progression_engine` | Clean baseline: `User`, `Onboarding`, `UserLessonProgress`, `DailyActivity`, `XPTransaction`. No curriculum tables. (Earlier migrations were collapsed into this baseline when curriculum ownership moved to the frontend.) |
| 2 | `adaptive_progression_and_daily_challenge` | Replaces `UserLearningLevel` enum: drops `BASIC`, adds `ADVANCED` (legacy rows migrated to `BEGINNER`). Adds `Onboarding.startingLessonId`. Adds `ChallengeValidationType` enum and `DailyChallenge` + `UserDailyChallenge` tables. Adds `XPTransaction(userId, createdAt)` index. |
| 3 | `adaptive_learning_and_social_systems` | Adds `SkillTag` + `FriendshipStatus` enums. Adds `UserSkillMastery`, `UserSkillReview`, `Badge`, `UserBadge`, `Friendship`, `CollaborativeChallenge`, `CollaborativeChallengeParticipant`. |

### Known migration gotchas

- **Enum rewrites can't be `pnpm prisma migrate dev`-applied non-interactively.** Prisma wraps the generated `BEGIN`/`COMMIT` block inside its own transaction and Postgres aborts. Workaround: generate the SQL with `migrate diff --script`, remove the inner `BEGIN`/`COMMIT`, then `migrate deploy`.
- **Enum value removals fail if rows still hold the old value.** Use `USING ( CASE ... )` in `ALTER COLUMN ... TYPE` to remap. Example in [`migration 20260516092055`](migrations/20260516092055_adaptive_progression_and_daily_challenge/migration.sql) which maps legacy `BASIC` → `BEGINNER`.

---

## 11. Cascade-delete map

All `userId` FKs are `ON DELETE CASCADE`. Deleting a user erases:
- Their onboarding row.
- All lesson progress, daily activity, XP transactions, daily challenge state.
- All skill mastery, skill review schedules, badges.
- All friendships (in either direction).
- All collab challenge participations (but not the challenges themselves).

`DailyChallenge` ↔ `UserDailyChallenge` is also cascade — deleting a challenge wipes participants' progress on it.

`CollaborativeChallenge` ↔ `CollaborativeChallengeParticipant` is cascade — deleting a challenge wipes its participants.

`Badge` ↔ `UserBadge` is cascade — deleting a badge wipes who had it.

There is NO FK from `UserLessonProgress` or `XPTransaction` to a lesson table, because no lesson table exists.

---

## 12. Naming conventions

- Model names: **PascalCase singular** (`User`, `UserLessonProgress`).
- Table names: **snake_case plural** via `@@map("users")`.
- Column names: **camelCase** in schema, Prisma client preserves the casing.
- IDs: `String @id @default(uuid())` everywhere — no auto-increment integers anywhere.
- Slugs (idempotency keys): `String @unique` (`badges.slug`, `daily_challenges.slug`).
- Timestamps: `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- Composite uniques: `@@unique([fieldA, fieldB])` — used liberally for `(userId, X)` patterns.

---

## 13. Transactions

Every multi-write operation must run inside `prisma.$transaction(async (tx) => { ... })`. Examples:

- **Lesson completion** (`LessonsService.complete`): upsert `UserLessonProgress` + `XpService.awardInTx` + optional `user.update` for streak + upsert `DailyActivity` + `SkillMasteryService.recordBatch(..., tx)`.
- **Daily challenge submit** (`DailyChallengeService.submit`): upsert `UserDailyChallenge` + `XpService.awardInTx` + optional `user.update` for streak + upsert `DailyActivity`.
- **Onboarding create** (`OnboardingService.create`): create `Onboarding` + update `User.isOnboardingComplete`.

Post-commit work (badge unlock check, `xpToday` aggregation) runs AFTER the transaction returns. This is intentional: the badge check needs to see the just-written mastery rows, and `xpToday` must include the just-written `XPTransaction`.

---

## 14. Querying tips

- **`xpToday`**: `prisma.xPTransaction.aggregate({ where: { userId, createdAt: { gte: startOfDayUTC(now) } }, _sum: { amount: true } })`. The `(userId, createdAt)` index covers this.
- **"Did this user complete lesson X?"**: `prisma.userLessonProgress.findUnique({ where: { userId_lessonId: { userId, lessonId } } })`. The composite-unique index is fastest here.
- **"Friends of user X"**: `findMany({ where: { status: ACCEPTED, OR: [{ requesterId: X }, { addresseeId: X }] } })`. No specific index; lists are small at MVP.
- **Leaderboard**: `findMany({ where: { xp: { gte: ..., lte: ... } }, orderBy: [{ xp: 'desc' }, { createdAt: 'asc' }], take: 25 })`. No XP index right now; add one if performance becomes a concern.

---

## 15. Future schema directions (not implemented)

| Feature | Schema change | Notes |
|---|---|---|
| Per-user collab XP cap | Add `dailyXpCap` column to `CollaborativeChallengeParticipant` | Server-side enforcement on the read aggregate. |
| Leaderboard seasons | New `LeaderboardSnapshot` table with `seasonId`, `userId`, `xp`, `rank`, `frozenAt` | A nightly job snapshots end-of-season state. |
| Streak insurance | Add `streakFreezeTokens` to `User` | Use a token on a missed day instead of resetting streak. |
| Cross-language tracks | Already supported. Add modules + lessons in `src/curriculum/registry.ts` for `JAVASCRIPT`, `TYPESCRIPT`, `HTML_CSS`, `REACT`. |
| Challenge skill tagging | Add `skillTag SkillTag?` to `DailyChallenge` | Lets daily challenges feed into BKT and SM-2. |
| AST-based code validation | Add `TEST_CASES` value to `ChallengeValidationType` + storage for test cases (`DailyChallengeTestCase`) | Validator dispatches via `validate(type, ...)`. |

None of these require breaking changes to existing tables.
