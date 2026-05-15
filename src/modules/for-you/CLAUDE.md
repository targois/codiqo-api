# For You Module — CLAUDE.md

## Purpose

Single aggregated endpoint for the homepage feed. Combines user stats, hero recommendation, next lessons queue, language tracks, and daily progress in one response. Hero is fully API-driven.

## Endpoint

| Method | Path | Auth |
|---|---|---|
| GET | `/api/for-you` | JWT required |

## Response shape

```json
{
  "user": { "xp": 10, "streak": 1, "level": 1, "username": "...", "displayName": "..." },
  "onboarding": { "selectedLanguage": "PYTHON", "currentLevel": "BEGINNER" },
  "dailyProgress": { "completedLessons": 1, "totalLessons": 35 },
  "recommendedLesson": {
    "id": "...", "title": "...", "description": "...",
    "estimatedMinutes": 5, "xpReward": 10,
    "difficulty": "BEGINNER", "language": "PYTHON",
    "progressPercent": 33, "completedLessons": 1, "totalLessons": 35
  },
  "nextLessons": [
    { "id": "...", "title": "...", "isCompleted": true, "isLocked": false, "language": "PYTHON", "difficulty": "BEGINNER" }
  ],
  "tracks": [
    { "language": "PYTHON", "progressPercent": 3, "completedLessons": 1, "totalLessons": 35 }
  ],
  "stats": { "completedLessons": 1, "totalMinutesLearned": 5 }
}
```

## Schema impact: language now lives on Course

Lesson no longer has a `language` column. The for-you query joins through `Lesson → CourseSection → Course → language`:

```ts
prisma.lesson.findMany({
  where: { isPublished: true, section: { course: { isPublished: true } } },
  include: { section: { include: { course: { select: { language: true } } } } },
  orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
});
```

After the query, lessons are flattened to `{ ..., language, sectionOrder }` so downstream filters/grouping look like the old single-table version.

## Recommendation algorithm — deterministic, never null when lessons exist

Three cases, evaluated in order:
1. **New user** (`completedInLang === 0`) → first lesson in `selectedLanguage` by sequence
2. **Returning user** (has completions, unfinished remain) → first unfinished by sequence
3. **All complete** → last completed in language; falls back to first lesson

Sequence = `section.order ASC, lesson.order ASC` (course-wide).

## Language consistency — STRICT

`recommendedLesson.language` always equals `onboarding.selectedLanguage`.
`nextLessons` are always in `selectedLanguage`.
TypeScript lessons NEVER show for a PYTHON user.

If onboarding is incomplete → fallback to all lessons.

## Progress calc (hero)

```
progressPercent = floor(completedInLang / totalLessons * 100)
```

`tracks[]` uses `Math.round` (visual). `recommendedLesson.progressPercent` uses `Math.floor` (truthful).

## Tracks

Built from `Lesson → Course.language` grouping. Onboarding language sorts first. Only languages with at least one published lesson appear.

## Query strategy (no N+1)

4 queries:
1. user + onboarding
2. all published lessons + their `section.course.language`
3. all `UserLessonProgress` for user
4. today's `DailyActivity`

Language filtering and grouping happen in-memory after the lesson fetch.

## File structure

```
for-you/
  for-you.service.ts    — getForYou(userId)
  for-you.controller.ts — GET /for-you
  for-you.module.ts
  CLAUDE.md
```
