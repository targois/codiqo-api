# Profile Module — CLAUDE.md

## Purpose

Provides current user's complete profile: auth data, gamification stats, onboarding language, and progress counters. Used by the frontend to populate the profile card, sidebar, and greeting.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/profile/me` | Full profile with stats |
| POST | `/api/profile/logout` | Signals logout (client removes token) |

Both require `Authorization: Bearer <token>`.

## GET /api/profile/me — Response

```json
{
  "id": "...",
  "username": "python_learner",
  "email": "user@example.com",
  "displayName": "Python User",
  "avatarUrl": null,
  "selectedLanguage": "PYTHON",
  "xp": 10,
  "level": 1,
  "streak": 1,
  "completedLessons": 1,
  "isOnboardingComplete": true,
  "createdAt": "2026-05-14T..."
}
```

- `selectedLanguage` — from `Onboarding.selectedLanguage`, `null` if onboarding not done
- `completedLessons` — count of `UserLessonProgress` where `isCompleted = true` (Prisma `_count`)

## POST /api/profile/logout — Response

```json
{ "success": true }
```

JWT is stateless — the server has no session to invalidate. The client removes the token from storage. A future implementation can add a token blacklist (Redis) here.

## Frontend usage

| UI element | Source field |
|---|---|
| Greeting "Good evening, {name}" | `user.username` from `GET /api/auth/me` or `for-you.user.username` |
| Mini profile card username | `profile.username` |
| Mini profile card XP/level | `profile.xp`, `profile.level` |
| Sidebar selected language | `profile.selectedLanguage` |
| Completed lessons badge | `profile.completedLessons` |

## File structure

```
profile/
  profile.service.ts    — getMe(), logout()
  profile.controller.ts — GET /me, POST /logout
  profile.module.ts
```
