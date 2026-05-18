# Auth Module — CLAUDE.md

## 1. Purpose

Issues JWT bearer tokens, identifies the current user on protected requests, and protects routes via guards/decorators. Pure auth — does not own profile data, gamification, or anything else.

## 2. Responsibilities

- Account creation (`POST /api/auth/register`) — delegates to `UsersService.create`, then signs a token.
- Login (`POST /api/auth/login`) — verifies password with `bcrypt.compare`, signs a token.
- Token validation — `JwtStrategy.validate()` decodes incoming bearer tokens, fetches the user from DB, attaches it to `req.user`.
- Auth identity exposure — `GET /api/auth/me` returns the current user (sanitised).
- Provides the `JwtAuthGuard` and `@CurrentUser()` decorator used by every other module.

## 3. Database models

Auth does not own any tables. It reads/writes `User` via `UsersService` (see [users/CLAUDE.md](../users/CLAUDE.md)). It also depends on `User.passwordHash` (bcrypt-hashed at registration).

## 4. API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create account + return JWT |
| POST | `/api/auth/login` | public | Verify credentials + return JWT |
| GET | `/api/auth/me` | JWT | Current user (sans `passwordHash`) |

### `POST /api/auth/register`

Body:
```json
{
  "email": "user@example.com",
  "username": "python_learner",
  "password": "min8chars",
  "displayName": "Python User"
}
```

Response 201:
```json
{
  "accessToken": "eyJhbGc...",
  "user": {
    "id": "...",
    "email": "user@example.com",
    "username": "python_learner",
    "displayName": "Python User",
    "avatarUrl": null,
    "xp": 0,
    "level": 1,
    "streak": 0,
    "lastActivityDate": null,
    "isOnboardingComplete": false,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Errors: 409 (email or username taken), 400 (validation failure).

### `POST /api/auth/login`

Body: `{ "email": "...", "password": "..." }`. Response same shape as register.

Errors: 401 with the generic message `"Invalid credentials"` for BOTH unknown email AND wrong password (prevents email enumeration).

### `GET /api/auth/me`

Headers: `Authorization: Bearer <token>`. Response: the same sanitised `User` object.

## 5. Internal flows

### Token sign + verify

1. Login / register hands the user to `AuthService.signToken(user)`.
2. The service signs a JWT with payload `{ sub: user.id, email: user.email }` using `JWT_SECRET` and `JWT_EXPIRES_IN` (default `7d`).
3. Client stores the token, sends it as `Authorization: Bearer <token>` on every request.
4. On a protected route, `JwtAuthGuard` (extends `AuthGuard('jwt')`) triggers `JwtStrategy.validate(payload)`.
5. `JwtStrategy.validate` calls `UsersService.findByIdOrNull(payload.sub)`:
   - If the user exists, the sanitised user object is placed on `req.user`.
   - If the user has been deleted, `null` is returned and Nest throws `UnauthorizedException` automatically.
6. The `@CurrentUser()` parameter decorator reads `req.user` in controllers.

### How to protect a route

```typescript
import { UseGuards, Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('whatever')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WhateverController {
  @Get('me')
  myRoute(@CurrentUser() user: Omit<User, 'passwordHash'>) {
    return user;
  }
}
```

Standard pattern — every module that needs auth applies `@UseGuards(JwtAuthGuard)` at the controller level and `@ApiBearerAuth()` for Swagger.

### JWT payload shape

```typescript
interface JwtPayload {
  sub: string;    // user UUID
  email: string;
  iat: number;    // issued at (auto)
  exp: number;    // expires at (auto)
}
```

## 6. Edge cases

| Case | Behaviour |
|---|---|
| Unknown email at login | Generic `401 Invalid credentials` (no enumeration) |
| Wrong password | Same `401 Invalid credentials` |
| Expired token | `401 Unauthorized` |
| Token for a deleted user | `401 Unauthorized` (validate returns null) |
| Username/email taken at register | `409 Conflict` from `UsersService.create` |
| Missing/malformed `Authorization` header | `401 Unauthorized` (passport-jwt default) |
| Token signed by a different `JWT_SECRET` | `401 Unauthorized` |
| `displayName` omitted at register | Allowed; stored as null |

## 7. Implementation notes

- **No refresh tokens.** Tokens are stateless and expire per `JWT_EXPIRES_IN`. A future "remember me" feature would add a refresh-token table.
- **No revocation list.** A compromised token is valid until expiry. Add a Redis blacklist if needed; the `POST /api/profile/logout` endpoint is a no-op placeholder for this.
- **Password hashing**: `bcrypt.hash(password, 10)` at registration (in `UsersService.create`). 10 rounds is the cost factor — bump cautiously, it affects login latency.
- **`expiresIn` typing quirk**: `@nestjs/jwt` v11 expects a branded `StringValue` from the `ms` package. We cast via `as unknown as number` in [`auth.module.ts`](auth.module.ts). Real string is parsed correctly at runtime.

## 8. File structure

```
auth/
  dto/
    register.dto.ts          — email, username, password (min 8), displayName?
    login.dto.ts             — email, password
  guards/
    jwt-auth.guard.ts        — extends AuthGuard('jwt')
  strategies/
    jwt.strategy.ts          — validate(): fetch user, return req.user
  decorators/
    current-user.decorator.ts — @CurrentUser() param decorator
  auth.service.ts            — register(), login(), signToken()
  auth.controller.ts         — POST /register, POST /login, GET /me
  auth.module.ts             — wires JwtModule with secret/expiresIn from .env
  CLAUDE.md
```

## 9. Future improvements (not implemented)

- **Refresh tokens** — second token type, server-side rotation, longer-lived.
- **Token revocation** — Redis-backed blacklist invoked on `POST /api/profile/logout` and on password change.
- **Password reset flow** — email-based token, dedicated controller.
- **OAuth / social login** — Google / GitHub providers via `passport-google-oauth20` etc.
- **Multi-factor auth** — TOTP-based 2FA. `User` would gain `mfaSecret`, `mfaEnabled`.
- **Rate limiting on login** — `@nestjs/throttler`, IP-based, to slow credential stuffing.
