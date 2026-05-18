# Daily Challenge Module — CLAUDE.md

## Purpose

One curated coding challenge per day. The backend owns the pool, the rotation, validation, completion state, and XP rewards. The frontend renders the editor, runs syntax highlighting, and shows hints. **No user code is executed on the backend.**

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/daily-challenge` | Today's challenge + this user's completion state |
| POST | `/api/daily-challenge/:id/submit` | Validate a submission, award XP on first correct answer |

Both require `Authorization: Bearer <token>`.

## GET /api/daily-challenge

```json
{
  "id": "8375f054-…",
  "slug": "fizzbuzz-1-to-15",
  "title": "FizzBuzz (1 to 15)",
  "description": "Print numbers 1 through 15…",
  "difficulty": "BEGINNER",
  "estimatedMinutes": 5,
  "xpReward": 25,
  "language": "python",
  "starterCode": "for n in range(1, 16):\n    # your code here\n    pass\n",
  "expectedOutput": "1\n2\nFizz\n…",
  "hint": "Check the multiple-of-15 condition first…",
  "completed": false
}
```

Notes:
- `completed` reflects this user's `UserDailyChallenge.isCompleted`.
- `expectedSolution` is **never** returned to the client — only the backend uses it for validation.
- `language` and `difficulty` are stored as free strings to keep the schema flexible.

Errors:
- 404 `No daily challenges configured` — empty pool.

## POST /api/daily-challenge/:id/submit

Request:
```json
{ "code": "for n in range(1, 16): …" }
```

Successful submission:
```json
{
  "correct": true,
  "earnedXp": 25,
  "streak": 5,
  "totalXp": 120,
  "level": 2,
  "xpToday": 45,
  "message": "Challenge completed!"
}
```

Wrong submission:
```json
{
  "correct": false,
  "message": "Solution is not correct yet.",
  "hint": "Check the multiple-of-15 condition first…"
}
```

Idempotent re-submit after success:
```json
{
  "correct": true,
  "earnedXp": 0,
  "streak": 5,
  "totalXp": 120,
  "level": 2,
  "xpToday": 45,
  "message": "Challenge already completed"
}
```

`totalXp`, `level`, `streak`, and `xpToday` are post-award snapshots — the frontend can hydrate its XP / level / streak / "XP today" widgets directly from this response without a follow-up `GET /api/progress`. They will, however, match `/api/progress` byte-for-byte: it is the same underlying state, computed by the same shared paths.

Errors:
- 404 `Daily challenge not found` — bad challenge id
- 400 `Challenge has no expected solution configured` — admin misconfiguration
- 401 — missing/invalid JWT

## Validation

Validators live in [`challenge-validator.ts`](challenge-validator.ts). The single entrypoint is `validate(type, submitted, expected)` which dispatches on `ChallengeValidationType`:

| Validator | Behaviour |
|---|---|
| `EXACT_MATCH` | Bytewise equality |
| `NORMALIZED_MATCH` | Strip trailing whitespace, drop blank lines, normalize `\r\n` → `\n`, trim outer whitespace. **Leading whitespace (indentation) is preserved**, because Python depends on it. |

### Why no code execution

MVP is deliberately string-only — no Docker, no Python VM, no sandbox. Reasons:
- avoids the operational complexity of a sandbox
- avoids the security risk of arbitrary code execution from the public internet
- enough for the curated FizzBuzz-tier challenges we ship

The validator interface (`validate(type, submitted, expected)`) is set up so a future `TEST_CASES` or `SANDBOX_EXEC` type can be added without touching controllers or services. **Validators must never run untrusted code, shell out, or reflect submitted code into a process.**

## Rotation

`pickTodaysChallenge()` selects deterministically by
`dayIndexUTC(today) % publishedChallenges.length`.

- Every user sees the same challenge on a given UTC day.
- Adding new challenges shifts the rotation — that's acceptable for MVP.
- The list is ordered by `createdAt ASC` for stability.
- No advanced scheduling (per-day-of-week curation, difficulty progression, etc.) — keep it boring.

## XP + streak + duplicate protection

On the **first** correct submission, inside one `prisma.$transaction`:
1. Upsert `UserDailyChallenge` → `isCompleted = true`, `completedAt`, `submittedCode`.
2. `XpService.awardInTx` → User.xp += `challenge.xpReward`, level recomputed, `XPTransaction { reason: "daily_challenge_complete" }`.
3. Streak update if applicable (User.streak, User.lastActivityDate).
4. Upsert today's `DailyActivity` → `lessonsCompleted++`.

A wrong submission still upserts the row (with `submittedCode`, `isCompleted = false`) so the editor can rehydrate the user's last attempt. No XP, no streak, no DailyActivity update.

A repeat correct submission is a fast path — load the user, recompute `xpToday`, and return `{ correct: true, earnedXp: 0, … }` with no DB writes.

## One unified XP economy

Lessons and daily challenges share the same XP infrastructure:

- Both call `XpService.awardInTx(tx, …)` inside their own `prisma.$transaction`.
- Both produce an `XPTransaction` row (`lesson_complete` / `daily_challenge_complete`).
- Both increment `User.xp` and recompute `User.level = floor(xp / 100) + 1`.
- Both update the same `User.streak` + `User.lastActivityDate`.
- Both increment today's `DailyActivity.lessonsCompleted` row.
- Both contribute to `xpToday`, which is a `SUM(amount)` over `XPTransaction` since today's UTC midnight — never cached.

Never branch into a separate XP path for challenges. If a future reward type needs XP, route it through `XpService.awardInTx` so the audit log, level, streak, and `xpToday` aggregate all stay in sync.

## Streak logic

Same UTC-midnight rule as lesson completion:

| Scenario | Result |
|---|---|
| `lastActivityDate = null` | streak = 1 |
| yesterday | streak + 1 |
| 2+ days ago | streak reset to 1 |
| today already | unchanged |
| already-completed challenge | unchanged |

Challenges and lessons share `User.streak` and `User.lastActivityDate` — completing either counts as activity for today.

## Seed

`prisma/seed.ts` upserts a small pool of Python challenges (FizzBuzz, reverse string, count vowels, sum 1..100, palindrome, even/odd, primes < 20, factorial, Fibonacci, max of list, word count, sum of digits). All use `NORMALIZED_MATCH`. The seed is idempotent (upserts by `slug`).

## File structure

```
daily-challenge/
  dto/
    submit-challenge.dto.ts    — { code: string } body
  challenge-validator.ts       — validate(type, submitted, expected); normalize()
  daily-challenge.service.ts   — getToday(), submit(), pickTodaysChallenge()
  daily-challenge.controller.ts — GET /, POST /:id/submit
  daily-challenge.module.ts    — imports LessonsModule (for XpService)
  CLAUDE.md
```
