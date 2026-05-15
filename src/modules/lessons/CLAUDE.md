# Lessons Module — CLAUDE.md

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/lessons/:id` | Lesson content + progress + sidebar (track view) |
| POST | `/api/lessons/:id/start` | Create/update progress, mark `lastOpenedAt` |
| POST | `/api/lessons/:lessonId/blocks/:blockId/complete` | Mark a block complete (quiz blocks validate the answer) |
| POST | `/api/lessons/:id/complete` | Finalize lesson — gated on all blocks done; awards XP + streak |

All require `Authorization: Bearer <token>`.

## GET /api/lessons/:id — Response

```json
{
  "lesson": {
    "id": "...", "slug": "python-print-and-first-output",
    "title": "...", "description": "...",
    "estimatedMinutes": 5, "xpReward": 10, "difficulty": "BEGINNER",
    "progress": { "status": "IN_PROGRESS", "progressPercent": 33, "isCompleted": false },
    "blocks": [
      { "id": "...", "type": "THEORY", "order": 1, "payload": { "title": "...", "content": "..." } },
      { "id": "...", "type": "QUIZ", "order": 6, "payload": { "question": "...", "answers": [...], "correctAnswer": 1, "explanation": "..." } }
    ]
  },
  "sidebar": {
    "currentTrack": { "title": "Python Programming", "progressPercent": 12 },
    "sections": [
      { "id": "...", "title": "First Steps in Python", "lessons": [
        { "id": "...", "title": "...", "isCompleted": true, "isLocked": false },
        { "id": "...", "title": "...", "isCompleted": false, "isLocked": false },
        { "id": "...", "title": "...", "isCompleted": false, "isLocked": true }
      ]}
    ]
  }
}
```

Returns:
- 404 if lesson missing or `isPublished = false`
- 403 if lesson is locked for the user (unlock rule below)

Blocks are always ordered by `order ASC`. Sidebar reuses `TracksService.getTrackView()`.

## POST /api/lessons/:id/start — Response

```json
{ "lessonId": "...", "started": true, "progress": { "status": "IN_PROGRESS", "progressPercent": 0, "isCompleted": false } }
```

Promotes `NOT_STARTED → IN_PROGRESS` on first call. Never downgrades `COMPLETED`.

## POST /api/lessons/:lessonId/blocks/:blockId/complete

Body (optional): `{ "answer": <number> }` — required for QUIZ blocks (zero-based index into `payload.answers`).

Response:
- QUIZ block: `{ "correct": true, "blockCompleted": true }` — `blockCompleted` is `false` if answer is wrong (block stays open for retry)
- Non-quiz block: `{ "blockCompleted": true }`

Errors: 400 (quiz without answer), 403 (locked), 404 (lesson/block missing).

After every successful completion, `Lesson.progressPercent` is recomputed:
```
progressPercent = round(completed blocks / total blocks * 100)
```

## POST /api/lessons/:id/complete — Response

```json
{ "success": true, "earnedXp": 10, "totalXp": 75, "streak": 3, "level": 1 }
```

Gate: throws `400 "Lesson requirements are not completed"` unless every block has a `UserLessonBlockProgress` with `isCompleted = true`. Lessons with zero blocks pass immediately.

Already-completed lessons are idempotent — gate skipped, `earnedXp = 0`.

Inside one transaction:
1. Upsert `UserLessonProgress` → `status=COMPLETED`, `progressPercent=100`, `completedAt`
2. `XpService.awardInTx` → user.xp += `lesson.xpReward`, level updated, `XPTransaction` row created
3. Streak update if applicable (User.streak, User.lastActivityDate)
4. Upsert `DailyActivity` → `lessonsCompleted++`

## Unlock logic

Implemented in `TracksService.computeLockMap` and enforced via `requireUnlockedLesson` in `LessonRuntimeService` + the GET handler in `LessonsService`.

Sequential rule: lesson N is unlocked iff (N is the first lesson in the course) **OR** (lesson N-1 in the course-wide sequence is completed).

Sequence = `section.order ASC, then lesson.order ASC` across all published lessons in the course.

Completed lessons remain unlocked.

## XP economy (current)

| Event | Amount | Reason string |
|---|---|---|
| Lesson complete (first time) | `lesson.xpReward` | `lesson_complete` |

Per-block XP (the previous quiz/code-task +5/+10) was removed when the block model unified. XP awards happen only at lesson completion. Re-completion grants 0 XP.

## Streak logic

Based on `User.lastActivityDate` (UTC, midnight-normalized):

| Scenario | Result |
|---|---|
| `lastActivityDate = null` | streak = 1 |
| yesterday | streak + 1 |
| 2+ days ago | streak reset to 1 |
| today already | unchanged |
| re-completing | unchanged |

## Service architecture

```
LessonsService          — findById (uses TracksService for sidebar)
LessonRuntimeService    — start, completeBlock (with quiz validation), complete
XpService               — awardInTx, static level()
TracksService (imported from tracks/) — track view + unlock + isLessonUnlocked
```

Lessons module imports TracksModule. Both services use `PrismaService` (global).

## File structure

```
lessons/
  dto/
    complete-block.dto.ts       — { answer?: number }
  lessons.service.ts            — findById()
  lesson-runtime.service.ts     — start(), completeBlock(), complete(), recomputeLessonProgress()
  xp.service.ts                 — awardInTx, static level()
  lessons.controller.ts         — 4 routes
  lessons.module.ts             — imports TracksModule
  CLAUDE.md
```
