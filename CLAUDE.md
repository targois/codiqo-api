# Diploma API — CLAUDE.md

Gamified programming learning platform backend. University diploma project.

## Tech stack

- **NestJS 11** — modular backend framework
- **TypeScript** — strict mode (`noImplicitAny`, `strictNullChecks`)
- **PostgreSQL 16** — database, runs in Docker
- **Prisma 6** — ORM (schema → migrations → typed client)
- **pnpm** — package manager (never use npm/yarn)
- **JWT + Passport** — authentication
- **class-validator + class-transformer** — DTO validation
- **bcrypt** — password hashing
- **Swagger/OpenAPI** — auto-generated docs at `/api/docs`

## Commands

```bash
pnpm db:up            # start PostgreSQL container
pnpm db:down          # stop PostgreSQL container
pnpm start:dev        # dev server with hot-reload
pnpm build            # production build
pnpm prisma:migrate   # create + apply DB migration after schema change
pnpm prisma:generate  # regenerate Prisma TS client (after schema change)
pnpm prisma:studio    # visual DB browser UI
```

## Folder structure

```
src/
  modules/            # feature modules (one folder per domain)
    auth/             # JWT auth — register, login, /me
      decorators/     # @CurrentUser()
      dto/            # RegisterDto, LoginDto
      guards/         # JwtAuthGuard
      strategies/     # JwtStrategy (passport)
    users/            # user CRUD, password hashing
      dto/            # CreateUserDto
    onboarding/       # quiz after registration — done
      dto/            # CreateOnboardingDto, UpdateOnboardingDto
    lessons/          # lesson content + completion — done
    for-you/          # aggregated homepage feed — done
    progress/         # UserLessonProgress reads — done (no HTTP endpoints)
    courses/          # planned — course catalog
    tasks/            # planned — exercises/quizzes after lessons
    xp/               # planned — XP awarding logic (now inline in lessons)
    streak/           # planned — streak (now inline in lessons)
    profile/          # planned — public user profile
    admin/            # planned — admin panel API
  common/
    prisma/           # PrismaService (global singleton)
  config/             # typed config helpers (if added)

prisma/
  schema.prisma       # source of truth for DB schema
  migrations/         # auto-generated SQL, committed to git
```

## Architecture patterns

### Every module has
- `*.module.ts` — declares providers/controllers, imports dependencies
- `*.service.ts` — business logic, talks to Prisma
- `*.controller.ts` — HTTP layer, maps routes, Swagger decorators
- `dto/*.dto.ts` — request body shape + class-validator rules

### Adding a new module — checklist
1. Create folder `src/modules/<name>/` with `dto/` subfolder
2. Create `<name>.service.ts`, `<name>.controller.ts`, `<name>.module.ts`
3. Add `@ApiTags('<Name>')` to the controller
4. Register the module in `src/app.module.ts` imports array
5. If the module needs the DB — inject `PrismaService` (it's global, no extra import needed)
6. If the module needs auth — import `JwtAuthGuard` from `../auth/guards/jwt-auth.guard`
7. Run `pnpm prisma:migrate` if schema changed

### Auth protection
```typescript
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';

@Get('me')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
myRoute(@CurrentUser() user: Omit<User, 'passwordHash'>) {
  return user;
}
```

### JWT payload shape
```typescript
interface JwtPayload {
  sub: string;   // user UUID
  email: string;
  iat: number;   // issued at (auto)
  exp: number;   // expires at (auto)
}
```
`JwtStrategy.validate()` fetches the full user from DB and puts it on `req.user`.
`@CurrentUser()` reads `req.user` — always returns `Omit<User, 'passwordHash'>`.

### Never return `passwordHash`
`UsersService.sanitize()` strips it before every response.
`Omit<User, 'passwordHash'>` is the return type used everywhere.
`findByEmail()` is the only method that returns the raw `User` (needed internally for bcrypt compare during login).

### DTO conventions
- `whitelist: true` — extra fields are silently stripped
- `forbidNonWhitelisted: true` — extra fields throw 400
- `transform: true` — strings auto-coerced to numbers/booleans where typed
- All DTOs use `@ApiProperty` / `@ApiPropertyOptional` for Swagger

### Global API prefix
All routes are prefixed with `/api`. Swagger UI is at `/api/docs`. Swagger JSON (for Postman import) is at `/api/docs-json`.

## Environment variables (.env)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `postgresql://postgres:password@localhost:5432/diploma_db?schema=public` |
| `JWT_SECRET` | Secret for signing JWT tokens — change in production |
| `JWT_EXPIRES_IN` | Token TTL, e.g. `7d` |
| `PORT` | HTTP port (default 3000) |

## Database — Prisma

**Rule:** never edit migration SQL files by hand. Always change `schema.prisma` → run `pnpm prisma:migrate`.

### User model fields

| Field | Type | Default | Notes |
|---|---|---|---|
| id | String (uuid) | uuid() | PK |
| email | String | — | unique |
| username | String | — | unique |
| passwordHash | String | — | bcrypt, never exposed |
| displayName | String? | null | |
| avatarUrl | String? | null | |
| xp | Int | 0 | total XP |
| level | Int | 1 | derived from xp |
| streak | Int | 0 | current day streak |
| streakLastDate | DateTime? | null | last activity date |
| isOnboardingComplete | Boolean | false | set after onboarding quiz |
| createdAt | DateTime | now() | auto |
| updatedAt | DateTime | updatedAt | auto |

### Implemented models
- `Lesson` — content unit with theory, quiz, code tasks, XP reward, difficulty, language
- `TheoryBlock` — text content block (belongs to Lesson)
- `QuizQuestion` + `QuizAnswer` — quiz with answers (belongs to Lesson)
- `CodeTask` — code exercise (belongs to Lesson)
- `UserLessonProgress` — per-user lesson state (progressPercent, isCompleted, xpEarned)
- `DailyActivity` — daily lesson completion count for streak tracking

### Planned models (future migrations)
- `Course` — group lessons into named courses
- `XpEvent` — immutable log of every XP grant (userId, amount, reason, createdAt)

## Package decisions (why)

- **Prisma 6, not 7** — Prisma 7 removed `url` from schema.prisma, requires a separate `prisma.config.ts` with a DB adapter. Too much complexity for this stage.
- **bcrypt 6** — native binding, requires `node-gyp`. Already built and approved in `pnpm-workspace.yaml`.
- **passport-jwt** — standard JWT strategy for NestJS/Passport. Uses `ExtractJwt.fromAuthHeaderAsBearerToken()`.
- **`expiresIn` cast** — `@nestjs/jwt` v11 expects branded `StringValue` from `ms`. Workaround: cast via `as unknown as number` in `auth.module.ts`. Runtime behaviour is correct.

## Module status

| Module | Status | Endpoints |
|---|---|---|
| users | ✅ done | POST /api/users, GET /api/users, GET /api/users/:id |
| auth | ✅ done | POST /api/auth/register, POST /api/auth/login, GET /api/auth/me |
| onboarding | ✅ done | POST /api/onboarding, GET /api/onboarding/me, PATCH /api/onboarding/me |
| lessons | ✅ done | GET /api/lessons/:id, POST /api/lessons/:id/complete |
| for-you | ✅ done | GET /api/for-you |
| progress | ✅ done | no HTTP — ProgressService used internally |
| courses | planned | — |
| tasks | planned | — |
| profile | planned | — |
| admin | planned | — |
