# Lessons Module — CLAUDE.md

## 1. Purpose

Persists lesson completion + drives the XP / streak / skill-mastery / badge updates that follow. The single completion endpoint is the only progression event the frontend reports for lessons. No lesson content lives here — that's the frontend's job.

## 2. Responsibilities

On `POST /api/lessons/:id/complete`:

- Upsert `UserLessonProgress`. Idempotent on re-completion.
- Award XP via `XpService.awardInTx` (single XP code path for the whole system).
- Update `User.xp` + `User.level` + write `XPTransaction`.
- Update `User.streak` + `User.lastActivityDate` (UTC midnight rules).
- Upsert today's `DailyActivity`.
- Record one BKT "correct attempt" for each entry in `skillTags[]`.
- Run badge-unlock check after commit; return any newly unlocked badges in the response.

Does NOT:
- Validate that `:id` references a real lesson — the frontend owns curriculum.
- Validate lesson order / prerequisites — unlock semantics are computed elsewhere by `computeUnlockedLessons` in [`src/curriculum/registry.ts`](../../curriculum/registry.ts).
- Store partial progress per block. Block flow is owned by the frontend; only the final "lesson done" event reaches this endpoint.

## 3. Database models

Reads/writes:

- **`UserLessonProgress`** — `(userId, lessonId)` unique. Owns this table.
- **`XPTransaction`** — append-only audit log. Written via `XpService.awardInTx`.
- **`User`** — bumps `xp`, `level`, `streak`, `lastActivityDate`.
- **`DailyActivity`** — `(userId, UTC-midnight-date)` unique counter.
- **`UserSkillMastery`** — touched via `SkillMasteryService.recordBatch` if `skillTags` provided.
- **`UserBadge`** — touched via `BadgesService.checkAndUnlock` after commit.

See [prisma/CLAUDE.md](../../../prisma/CLAUDE.md) for column-level reference.

## 4. API endpoint

| Method | Path | Auth |
|---|---|---|
| POST | `/api/lessons/:id/complete` | JWT |

`:id` is the stable frontend-owned lesson identifier (e.g. `python-print-first-output`).

### Request body

```json
{
  "xpReward": 10,
  "skillTags": ["VARIABLES", "LOOPS"]
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `xpReward` | int (0–200) | no | XP awarded on first completion. Default 10. Capped at 200 to bound abuse. |
| `skillTags` | SkillTag[] | no | If supplied, each tag is recorded as one `correct` BKT attempt in the same transaction. |

Body is intentionally tiny — quiz validation, code-task validation, and block flow are owned by the frontend. By the time the backend sees the request, the frontend has decided the lesson is done.

### Response

```json
{
  "success": true,
  "alreadyCompleted": false,
  "earnedXp": 10,
  "totalXp": 30,
  "level": 1,
  "streak": 1,
  "newBadges": [
    { "id": "...", "slug": "loop-explorer", "title": "Loop Explorer", "iconKey": "loops" }
  ]
}
```

| Field | Notes |
|---|---|
| `alreadyCompleted` | `true` if lesson was already completed before this call. `earnedXp = 0`, no streak change, no XP transaction. |
| `earnedXp` | XP actually awarded by THIS call. 0 on idempotent re-completion. |
| `totalXp` | New `User.xp` snapshot. |
| `level` | Recomputed `floor(totalXp / 100) + 1`. |
| `streak` | Post-update streak. |
| `newBadges` | Badges newly unlocked by THIS call. Empty array if none. Each entry has the keys above. |

The frontend can hydrate its XP / level / streak / badge widgets directly from this response. A follow-up `GET /api/progress` is unnecessary unless you need `xpToday`.

## 5. Internal flows

### Completion path (first time)

```
POST /api/lessons/:id/complete
        │
        ▼
LessonsService.complete(lessonId, userId, dto)
        │
        ├─ findUnique UserLessonProgress
        │      └─ exists & isCompleted → return idempotent result
        │
        ├─ findUnique User (full row for xp/streak math)
        ├─ compute new streak (UTC midnight rules)
        ├─ compute newXp = user.xp + xpReward
        ├─ compute newLevel = floor(newXp / 100) + 1
        │
        ├─ prisma.$transaction(async (tx) => {
        │       upsert UserLessonProgress { isCompleted, xpEarned, completedAt }
        │       XpService.awardInTx { amount: xpReward, reason: 'lesson_complete', lessonId }
        │       if (updateStreak) update User { streak, lastActivityDate }
        │       upsert DailyActivity { lessonsCompleted++ }
        │       SkillMasteryService.recordBatch(skillTags map → correct:true, tx)
        │   })
        │
        ├─ BadgesService.checkAndUnlock(userId)     ← runs AFTER commit
        │
        └─ return { success, alreadyCompleted: false, earnedXp, totalXp, level, streak, newBadges }
```

### Streak logic

Based on `User.lastActivityDate` (UTC midnight-normalised):

| Scenario | Result |
|---|---|
| `lastActivityDate = null` | streak = 1, updateStreak = true |
| Yesterday | streak + 1 |
| 2+ days ago | streak reset to 1 |
| Today already | unchanged, no DB write |
| Already-completed lesson (any day) | unchanged, no DB write |

Streak updates happen ONLY on first-time completion. The idempotent branch returns before this code is reached.

### XP economy

| Event | Amount | Reason string |
|---|---|---|
| Lesson complete (first time) | `dto.xpReward ?? 10` | `lesson_complete` |

`XpService.awardInTx` writes a single `XPTransaction` row inside the same DB transaction that updates `User.xp` and `User.level`. The audit log is append-only — once written, never updated or deleted.

### Skill mastery recording

If `skillTags: [TAG_A, TAG_B]` is supplied, each tag is recorded as one `correct: true` attempt in the same transaction. The call is `SkillMasteryService.recordBatch(userId, [{ skillTag, correct: true } for each tag], tx)`.

- This is a **coarse signal**: "the user finished a lesson exercising these skills".
- For fine-grained per-quiz accuracy, the frontend uses `POST /api/skills/record` (see [skill-mastery/CLAUDE.md](../skill-mastery/CLAUDE.md)).
- BKT prior is seeded from onboarding `currentLevel` on the very first attempt for each skill.

### Badge unlock check

Runs AFTER the transaction commits. `BadgesService.checkAndUnlock(userId)`:

1. Loads `User.xp`, every badge, every existing `UserBadge`, every `UserSkillMastery`.
2. For each badge the user doesn't yet own, checks the conditions (`masteryScore ≥ 0.8` AND `confidenceLevel ≥ 0.25` for skill badges; `xp ≥ xpRequirement` for XP badges; both ANDed if both are set).
3. Inserts new `UserBadge` rows.
4. Returns the freshly unlocked badges.

Reason it runs post-commit: the badge check must see the *committed* XP + mastery state.

## 6. Edge cases

| Case | Behaviour |
|---|---|
| `:id` is a string that's not in the curriculum registry | Accepted. Row is created. Lesson does not count toward `totalLessonsCount` or `unlockedLessons` in track views. |
| Same `:id` posted twice in rapid succession | Both see the un-completed row in step 1, both try to upsert. The `@@unique([userId, lessonId])` constraint serialises them; the second hits "already completed" via the idempotent guard. **No double XP.** |
| `xpReward > 200` | 400 Bad Request (DTO validator). |
| `xpReward = 0` | Allowed. Lesson is marked complete with `xpEarned = 0`; no `XPTransaction` row would be... actually, `XpService.awardInTx` is called unconditionally, so an `XPTransaction { amount: 0 }` row IS written. Consider this acceptable audit noise. |
| `skillTags: []` | No mastery updates. |
| `skillTags` contains a value not in the `SkillTag` enum | 400 Bad Request (DTO `@IsEnum`). |
| User has no onboarding row yet, supplies `skillTags` | BKT prior falls back to `BKT.PRIOR = 0.10`. Works. |
| User crosses a level boundary | `level` recomputed; response reflects new level. |
| Re-completion same UTC day after streak update | No-op idempotent path. Streak unchanged. |

## 7. Implementation notes

- **Skill mastery folded into the XP transaction.** This is deliberate: if the XP grant fails (DB error mid-transaction), mastery doesn't accidentally bump. `SkillMasteryService.recordBatch(..., tx)` accepts an optional `tx` precisely for this.
- **Badge check is post-commit.** It needs to see the freshly-written `User.xp` and `UserSkillMastery`. Running it inside the transaction would either: (a) not see the writes (if read-after-write isn't supported in the same tx in your Prisma transaction mode), or (b) hold the transaction open longer than necessary.
- **No prerequisite check.** The backend trusts the frontend that the lesson was reachable. Cheating users could complete a lesson out of order; the only downstream effect is that `unlockedLessons` reflects the reality (the lesson is now completed → its successor unlocks). Not a security issue, since lessons aren't paywalled.
- **No partial-completion endpoint.** Removed when frontend took ownership of the curriculum. The single `complete` event is enough for the backend; richer telemetry (per-block timing) belongs in an analytics pipeline (not implemented).

## 8. File structure

```
lessons/
  dto/
    complete-lesson.dto.ts      — { xpReward?: number, skillTags?: SkillTag[] }
  lessons.service.ts            — complete()
  xp.service.ts                 — awardInTx(), static level()
  lessons.controller.ts         — POST /:id/complete
  lessons.module.ts             — imports SkillMasteryModule + BadgesModule; exports LessonsService, XpService
  CLAUDE.md
```

### Why `XpService` lives in this module

It originated here when lessons were the only XP source. Now that daily challenges also award XP, `LessonsModule` re-exports `XpService` so [daily-challenge/](../daily-challenge/CLAUDE.md) can import it without circular references. A future refactor could move it to a top-level `economy/` module — not necessary today.

## 9. Future improvements (not implemented)

- **Per-block telemetry** — separate analytics-only endpoint or background queue, not back into a `LessonBlock` table.
- **Variable XP curves** — `xpReward` could be modulated by difficulty / time-of-day / streak. Today it's a flat-ish constant from the frontend.
- **Difficulty multiplier** — body field `difficultyMultiplier` that scales `xpReward`. Schema-free; controller change only.
- **Anti-cheat rate limit** — `@nestjs/throttler` on the completion endpoint (e.g. max 60 lesson completions per hour per user).
- **Rich completion telemetry** — emit a domain event on completion that other modules can subscribe to (NestJS event emitter). Currently the call chain is hard-coded.
