# Tracks Module — CLAUDE.md

## Purpose

Per-language progression state for the track page ("See full path"). Returns enough metadata for the frontend to highlight the current module, current lesson, and restore progression state across reloads.

## Endpoint

| Method | Path | Description |
|---|---|---|
| GET | `/api/tracks/:language/progress` | Per-language completion + current module/lesson + icon metadata |

Auth required. `:language` slug is case-insensitive: `python`, `javascript`, `typescript`, `html-css`/`html_css`, `react`.

## Response

```json
{
  "language": "python",
  "iconKey": "python",
  "accentColor": "#3776AB",
  "currentLessonId": "python-lists-intro",
  "completedLessons": [],
  "unlockedLessons": ["python-lists-intro"],
  "progressPercent": 0,
  "completedLessonsCount": 0,
  "totalLessonsCount": 35,
  "currentModule": {
    "id": "python-data-structures",
    "title": "Data Structures"
  },
  "xp": 0,
  "streak": 0
}
```

| Field | Notes |
|---|---|
| `language` | kebab-case slug (`python`, `javascript`, `html-css`, `react`, `typescript`). |
| `iconKey` | Stable semantic identifier the frontend maps to a visual icon component. |
| `accentColor` | Brand accent for this track (hex). Frontend may override. |
| `currentLessonId` | First unlocked, uncompleted lesson in this track for this user. `null` for empty tracks. |
| `unlockedLessons` | Adaptive unlock list (see [progress CLAUDE.md](../progress/CLAUDE.md) for rule). |
| `completedLessons` | All `lessonId`s for the user where `isCompleted = true` and the id starts with `<slug>-`. |
| `progressPercent` | `round(completedInTrack / totalLessonsCount * 100)`. Counts only lessons that exist in the registry. |
| `completedLessonsCount` | Lessons the user has completed that ARE part of this track. |
| `totalLessonsCount` | Total lessons in this track (from the curriculum registry). |
| `currentModule` | The module that contains `currentLessonId`. `null` if no current lesson. |
| `xp` / `streak` | Global stats (XP/streak are not per-track). |

## Curriculum source of truth

The track structure (modules, lesson IDs, icon metadata, level→starting-lesson) lives in [`src/curriculum/registry.ts`](../../curriculum/registry.ts). The registry holds NO lesson content — only IDs, ordering, and lightweight metadata. This is the only place the backend knows curriculum structure.

If the frontend curriculum diverges from the backend registry (renames, reorders, additions), structural fields (`unlockedLessons`, `currentLessonId`, `currentModule`, `progressPercent`) drift. The fix is to update both in lockstep.

## Adaptive unlock & current lesson

Both fields are computed by the same registry helpers used in `/api/progress`. The unlock rule for a given language:

1. Resolve `startingLessonId` from `Onboarding` (only when the user's onboarded language matches the queried track).
2. From `startingLessonId` onward, lesson N is unlocked iff N == start OR N-1 completed OR N completed.
3. Lessons before `startingLessonId` are locked-out by default; if completed anyway they stay in `unlockedLessons` for review.
4. `currentLessonId` = first unlocked + uncompleted lesson.
5. `currentModule` = the registry module that contains `currentLessonId`.

If the user's onboarded language differs from the queried track, `startingLessonId` is treated as `null` for THIS track — the track starts from the first lesson.

## Frontend ↔ backend contract

- **Lesson ID prefix**: every frontend lesson id starts with its language slug (`python-…`, `html-css-…`). The backend filters `completedLessons` by this prefix and uses it to find lessons in the registry.
- **Renames**: if a frontend lessonId is renamed, completed records for the old id remain in the DB but stop counting toward `progressPercent`. Append-only completion history survives curriculum changes.
- **Adding a lesson** without updating the registry: the lesson is still completable via `POST /api/lessons/:id/complete`, but it does not count toward `totalLessonsCount`, doesn't appear in `unlockedLessons`, and doesn't become `currentLessonId`.

## Errors

- 404 `Unknown language` — unknown slug
- 401 — missing/invalid JWT

## File structure

```
tracks/
  tracks.service.ts     — resolveLanguage(slug), getProgress(userId, language)
  tracks.controller.ts  — GET /:language/progress
  tracks.module.ts
  CLAUDE.md
```
