# Lessons Module — CLAUDE.md

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/lessons/:id` | Get published lesson with full content + user progress |
| POST | `/api/lessons/:id/complete` | Mark lesson as done — awards XP, updates streak |

Both endpoints require `Authorization: Bearer <token>`.

## GET /api/lessons/:id — Response shape

```json
{
  "id": "...",
  "title": "...",
  "description": "...",
  "language": "TYPESCRIPT",
  "difficulty": "BEGINNER",
  "estimatedMinutes": 10,
  "xpReward": 10,
  "order": 1,
  "theoryBlocks": [{ "id": "...", "type": "TEXT", "content": "...", "order": 1 }],
  "quizQuestions": [{
    "id": "...", "question": "...", "type": "SINGLE_CHOICE", "order": 1,
    "answers": [{ "id": "...", "text": "...", "isCorrect": true }]
  }],
  "codeTasks": [{ "id": "...", "starterCode": "...", "expectedAnswer": "...", "order": 1 }],
  "userProgress": { "completed": false, "progressPercent": 0 }
}
```

Returns 404 if lesson not found or `isPublished = false`.

## POST /api/lessons/:id/complete — Response shape

```json
{
  "success": true,
  "earnedXp": 10,
  "totalXp": 50,
  "streak": 3,
  "level": 1
}
```

## XP logic

- First completion → `earnedXp = lesson.xpReward` (default 10)
- Re-completion → `earnedXp = 0` (no duplicate XP)
- `level = Math.floor(totalXp / 100) + 1`

## Streak logic

All based on `User.lastActivityDate` (stored as UTC):

| Scenario | Result |
|---|---|
| `lastActivityDate` = null (first ever) | streak = 1 |
| `lastActivityDate` = yesterday | streak + 1 |
| `lastActivityDate` = 2+ days ago | streak reset to 1 |
| `lastActivityDate` = today (already had activity) | streak unchanged |
| Re-completing an already completed lesson | streak never changes |

## Transaction

`POST /api/lessons/:id/complete` uses `prisma.$transaction` to atomically:
1. Upsert `UserLessonProgress` (mark complete, set `completedAt`)
2. Update `User.xp`, `User.level`, `User.streak`, `User.lastActivityDate`
3. Upsert `DailyActivity` (increment `lessonsCompleted` for today)

Steps 2 & 3 only execute for **new** completions (`!alreadyCompleted`).

## File structure

```
lessons/
  lessons.service.ts    — findById(), complete(), streak logic
  lessons.controller.ts — GET /:id, POST /:id/complete
  lessons.module.ts     — exports LessonsService
```
