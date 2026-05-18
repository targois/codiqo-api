# Users Module — CLAUDE.md

## 1. Purpose

CRUD over the `User` table + password hashing. Lower-level than `auth/` and `profile/`: this is where User rows are actually created and fetched, and where `passwordHash` is stripped before responses.

## 2. Responsibilities

- Create a `User` row with a bcrypt-hashed password.
- Lookup users by id, by email, or fetch the full list.
- Strip `passwordHash` before any data leaves the service (`sanitize()`).
- Enforce email + username uniqueness at the application layer (DB also enforces).

What this module does NOT do:
- Token signing or login (that's [auth/](../auth/CLAUDE.md)).
- Profile aggregation with stats (that's [profile/](../profile/CLAUDE.md)).
- Onboarding writes (that's [onboarding/](../onboarding/CLAUDE.md)).

## 3. Database models

Owns `users` table. See [prisma/CLAUDE.md §4](../../../prisma/CLAUDE.md) for the column-by-column reference.

## 4. API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/users` | JWT | Create a user (admin-style) |
| GET | `/api/users` | JWT | List all users |
| GET | `/api/users/:id` | JWT | Get one user by UUID |

These are admin-style — they mirror what `auth/register` already does but without issuing a token, and without filtering by ownership. The frontend typically uses `auth/register`, `auth/me`, and `profile/me` instead.

### Response shape

Always `Omit<User, 'passwordHash'>`:
```json
{
  "id": "uuid",
  "email": "...",
  "username": "...",
  "displayName": null,
  "avatarUrl": null,
  "xp": 0,
  "level": 1,
  "streak": 0,
  "lastActivityDate": null,
  "isOnboardingComplete": false,
  "createdAt": "...",
  "updatedAt": "..."
}
```

## 5. Internal flows

### `UsersService.create(dto)`

1. `findFirst` looks for an existing row with the same email OR username.
2. If found → `ConflictException("Email or username is already taken")`.
3. Otherwise → `bcrypt.hash(password, 10)`, `prisma.user.create({ ... })`, return sanitised.

### `UsersService.findByIdOrNull(id)`

Variant of `findById` that returns `null` instead of throwing. Used by `JwtStrategy.validate` — a token for a deleted user should return 401, not 404.

### `UsersService.findByEmail(email)`

Returns the **full** `User` row including `passwordHash`. Used internally by `AuthService.login` to compare the bcrypt hash. **Never expose its return value to a client.**

### `sanitize(user)`

Single source of truth for password stripping:
```ts
private sanitize(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash: _, ...safe } = user;
  return safe;
}
```

## 6. Edge cases

| Case | Behaviour |
|---|---|
| Email collision on create | 409 Conflict |
| Username collision on create | 409 Conflict |
| `findById(unknown)` | 404 NotFoundException |
| `findByIdOrNull(unknown)` | returns `null` (used by JwtStrategy) |
| Password shorter than 8 chars | 400 from DTO validator (lives in `auth/dto/register.dto.ts`) |

## 7. Implementation notes

- **bcrypt cost factor**: 10. Tuning this is a security-vs-latency trade-off. 10 ≈ 60ms per hash on a modern dev machine.
- **No soft delete.** A deleted user cascades through every related table (see [prisma/CLAUDE.md §11](../../../prisma/CLAUDE.md)). If we ever need "deactivate without losing history", a `deactivatedAt` column is the way.
- **No avatar upload pipeline.** `avatarUrl` is a free string; no S3 upload is implemented. Future work.
- **No public `findByUsername`.** Other modules (e.g. friends) query users by username via Prisma directly — there's no service method for it because it would be a thin wrapper.

## 8. File structure

```
users/
  dto/
    create-user.dto.ts        — email, username, password (min 8), displayName?
  users.service.ts            — create, findAll, findById, findByIdOrNull, findByEmail, sanitize
  users.controller.ts         — POST /users, GET /users, GET /users/:id
  users.module.ts             — exports UsersService
  CLAUDE.md
```

## 9. Future improvements (not implemented)

- **Soft delete** — `deactivatedAt: DateTime?`. JWT validation would treat deactivated users like missing ones.
- **Avatar pipeline** — S3 / R2 upload + signed URL on profile updates.
- **Audit log** — `UserAuditEvent` table for password changes, email changes, etc.
- **Email verification** — `emailVerifiedAt: DateTime?`, magic-link send/confirm endpoints.
- **GDPR export / erasure endpoints** — protected admin route producing a JSON dump of all user-owned rows.
