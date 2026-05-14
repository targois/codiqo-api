# Auth Module — CLAUDE.md

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create account, returns JWT |
| POST | `/api/auth/login` | public | Login, returns JWT |
| GET | `/api/auth/me` | JWT required | Get current user |

## JWT flow

1. Client sends `POST /api/auth/login` with `{ email, password }`
2. Server verifies password with `bcrypt.compare`
3. Server signs a JWT with payload `{ sub: userId, email }`
4. Client stores the token and sends it as `Authorization: Bearer <token>` on subsequent requests
5. `JwtStrategy.validate()` decodes the token, fetches the user from DB, puts it on `req.user`

## How to protect a route

```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Get('profile')
@UseGuards(JwtAuthGuard)
myRoute(@CurrentUser() user: Omit<User, 'passwordHash'>) {
  return user;
}
```

## JWT payload shape

```typescript
interface JwtPayload {
  sub: string;   // user id (UUID)
  email: string;
}
```

## Security notes

- Login always returns `"Invalid credentials"` regardless of whether the email exists (prevents email enumeration)
- `passwordHash` is never included in any API response (stripped in `UsersService.sanitize`)
- Token expiry is controlled by `JWT_EXPIRES_IN` env variable (default `7d`)
- `JwtStrategy` uses `findByIdOrNull` — if a user is deleted, their valid tokens become immediately invalid (401)

## File structure

```
auth/
  dto/
    register.dto.ts     — email, username, password, displayName?
    login.dto.ts        — email, password
  guards/
    jwt-auth.guard.ts   — extends AuthGuard('jwt'), use with @UseGuards()
  strategies/
    jwt.strategy.ts     — validates token, fetches user, populates req.user
  decorators/
    current-user.decorator.ts — @CurrentUser() param decorator
  auth.service.ts       — register(), login(), signToken()
  auth.controller.ts    — HTTP routes
  auth.module.ts        — wires everything, configures JwtModule
```
