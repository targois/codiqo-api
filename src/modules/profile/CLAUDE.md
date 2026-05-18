# Profile Module — CLAUDE.md

## 1. Purpose

User-facing profile view + edits. Aggregates the current user's identity, gamification stats, onboarding language, and a completion counter into a single response. The frontend uses this to populate profile cards, sidebars, and greetings.

Also houses the **badge-notification endpoints** (`GET /profile/badge-notifications`, `POST /profile/badge-notifications/seen`) which physically live under the profile URL prefix even though the logic lives in [badges/](../badges/CLAUDE.md). They're documented here for URL discoverability.

## 2. Responsibilities

- `GET /api/profile/me` — combined profile read (identity + cached stats + completion count + onboarding language).
- `PATCH /api/profile/me` — update mutable identity fields (`displayName`, `username`, `avatarUrl`). Username is checked for uniqueness.
- `POST /api/profile/logout` — placeholder for token revocation (currently a no-op because JWT is stateless).

Does NOT own gamification reads in their full shape — for that, use [progress/CLAUDE.md](../progress/CLAUDE.md) (`/api/progress`) or [for-you/CLAUDE.md](../for-you/CLAUDE.md) (`/api/for-you`).

## 3. Database models

Reads from `users` and `onboardings`. Counts `user_lesson_progress` rows where `isCompleted=true`. Updates `users` columns on PATCH.

Does not own any tables.

## 4. API endpoints

| Method | Path | Auth | Module | Description |
|---|---|---|---|---|
| GET | `/api/profile/me` | JWT | profile | Combined profile + stats |
| PATCH | `/api/profile/me` | JWT | profile | Update `displayName` / `username` / `avatarUrl` |
| POST | `/api/profile/logout` | JWT | profile | Stateless logout signal |
| GET | `/api/profile/badge-notifications` | JWT | **badges** | Unseen badges (see [badges/CLAUDE.md](../badges/CLAUDE.md)) |
| POST | `/api/profile/badge-notifications/seen` | JWT | **badges** | Mark all unseen badges as seen |

### `GET /api/profile/me`

Response 200:
```json
{
  "id": "uuid",
  "username": "python_learner",
  "email": "user@example.com",
  "displayName": "Python User",
  "avatarUrl": null,
  "selectedLanguage": "PYTHON",
  "xp": 80,
  "level": 1,
  "streak": 2,
  "completedLessons": 4,
  "isOnboardingComplete": true,
  "createdAt": "..."
}
```

- `selectedLanguage`: from `Onboarding.selectedLanguage`, or `null` if onboarding not done.
- `completedLessons`: `_count` of `UserLessonProgress` rows where `isCompleted=true`. Prisma generates a `SELECT COUNT(*)` subquery — single round trip.

### `PATCH /api/profile/me`

Body (all optional):
```json
{ "displayName": "...", "username": "...", "avatarUrl": "..." }
```

Response: same shape as `GET /me`, reflecting the post-update state.

Errors:
- 409 if the new `username` is taken by a different user.
- 400 on validation failure.

### `POST /api/profile/logout`

Response: `{ "success": true }`. No state changes server-side — JWT is stateless, the client discards its token. Reserved as a hook for a future token-blacklist implementation.

## 5. Internal flows

### Username uniqueness check on PATCH

```ts
if (dto.username) {
  const taken = await prisma.user.findFirst({
    where: { username: dto.username, NOT: { id: userId } },
  });
  if (taken) throw new ConflictException('Username is already taken');
}
await prisma.user.update({ where: { id: userId }, data: dto, ... });
```

Race window: two concurrent PATCHes from different users both checking against the same target username, both passing. Mitigated by the DB-level `@unique` constraint — one of the two `update`s will fail with a Prisma error. Currently we don't catch and re-throw this as 409, so it surfaces as 500. Acceptable at MVP; future hardening: wrap the update in try/catch and translate Prisma `P2002` into `ConflictException`.

### Why aggregate stats live here vs. progress/

`/api/profile/me` is a "header + sidebar" payload: cheap, returned on every page load by the frontend.
`/api/progress` is the full gamification snapshot: `xpToday`, `unlockedLessons`, `currentLessonId`, `completedLessons[]`.

Both read from the same `User` cache, so they never diverge. Keeping two endpoints lets the frontend pick the right payload size for the page.

## 6. Edge cases

| Case | Behaviour |
|---|---|
| User has no onboarding | `selectedLanguage: null` |
| Empty PATCH body | No-op; current state returned |
| `username` taken by another user | 409 Conflict |
| `username` equals current value | Allowed (no-op against itself) |
| Logout called twice | Idempotent — returns `{ success: true }` each time |

## 7. Implementation notes

- **`completedLessons` uses `_count` with `where` clause** — Prisma compiles this into one query, no N+1.
- **`avatarUrl` is a free string** — no upload pipeline (see [users/CLAUDE.md §9](../users/CLAUDE.md)).
- **Email is not editable.** Adding it would require email-verification flow.
- **`POST /profile/logout` returns success even without a body**; the client is expected to drop the token regardless.

## 8. File structure

```
profile/
  dto/
    update-profile.dto.ts     — username?, displayName?, avatarUrl?
  profile.service.ts          — getMe, update, logout
  profile.controller.ts       — GET /me, PATCH /me, POST /logout
  profile.module.ts
  CLAUDE.md
```

## 9. Future improvements (not implemented)

- **Email change flow** — verification token, dedicated endpoints.
- **Profile picture upload** — S3 / R2 pipeline.
- **Profile privacy** — `isProfilePublic` toggle; affects friend-list visibility.
- **Activity feed on profile** — recent XP transactions, badges, streak history.
- **P2002 → 409 translation** — wrap the username-update path in try/catch.
