# Tracks Module — CLAUDE.md

## Purpose

A "track" = a published `Course` filtered by language, projected into a frontend-ready structure with per-user lock + completion state.

## Endpoint

| Method | Path | Description |
|---|---|---|
| GET | `/api/tracks/:language` | Track view for a language (e.g. `python`, `typescript`) |

Auth required. URL `:language` is case-insensitive; `python` and `PYTHON` both resolve to `ProgrammingLanguage.PYTHON`.

## Response

```json
{
  "track": {
    "id": "...", "title": "Python Programming",
    "description": "...", "progressPercent": 12,
    "sections": [
      { "id": "...", "title": "First Steps in Python", "lessons": [
        { "id": "...", "title": "...", "isCompleted": true, "isLocked": false }
      ]}
    ]
  }
}
```

Returns 404 if no published course exists for that language; 400 if the URL slug isn't a known language.

## TracksService.getTrackView(userId, language)

Single source of truth for the lesson lock map. Reused by:
- `TracksController` (this endpoint)
- `LessonsService.findById` (sidebar field)

## Unlock rule (MVP)

Sequential: lesson N is unlocked iff (it's the first lesson in the course) **OR** (the previous lesson in the course-wide sequence is completed). Completed lessons stay unlocked.

Sequence = `section.order ASC, lesson.order ASC` across the entire course.

`computeLockMap(lessons)` accepts a flat sequenced list of `{ id, isCompleted }` and returns a `Map<lessonId, locked>`. Pure function — easy to unit-test.

`isLessonUnlocked(userId, lessonId)` — re-runs the same logic for a single lesson, used by the runtime guard before allowing block submission or lesson completion.

## File structure

```
tracks/
  tracks.service.ts     — getTrackView(), computeLockMap(), isLessonUnlocked()
  tracks.controller.ts  — GET /api/tracks/:language
  tracks.module.ts      — exports TracksService
  CLAUDE.md
```
