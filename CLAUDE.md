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
    lessons/          # lesson runtime: GET, start, completeBlock, complete
    tracks/           # course → sections → lessons view + unlock logic
    for-you/          # aggregated homepage feed — done
    progress/         # UserLessonProgress reads — done (no HTTP endpoints)
    profile/          # current user profile — done
    tasks/            # planned — exercises/quizzes after lessons
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
| lastActivityDate | DateTime? | null | last activity date (UTC) |
| isOnboardingComplete | Boolean | false | set after onboarding quiz |
| createdAt | DateTime | now() | auto |
| updatedAt | DateTime | updatedAt | auto |

### Domain hierarchy

```
Course (per language)
└── CourseSection (ordered)
    └── Lesson (ordered, slug, isFree?)
        └── LessonBlock (ordered, type, payload Json)
```

### Implemented models
- `Course` — top-level container per language (slug, totalXp, estimatedMinutes)
- `CourseSection` — ordered group of lessons within a course
- `Lesson` — slug, sectionId, order, xpReward, difficulty (BEGINNER/BASIC/INTERMEDIATE/ADVANCED), isPublished, isFree
- `LessonBlock` — `type` (THEORY/ANALOGY/CODE/EXPLANATION/MISTAKE/QUIZ) + `payload Json`
- `UserLessonProgress` — per-user lesson state (`status` enum, progressPercent, isCompleted, xpEarned, completedAt)
- `UserLessonBlockProgress` — per-user block completion (`@@unique([userId, blockId])`)
- `DailyActivity` — per UTC day, lessonsCompleted counter
- `XPTransaction` — append-only audit log of every XP award
- `DailyChallenge` + `UserDailyChallenge` — architecture-only, no endpoints yet

### Removed (course_engine migration)
- `TheoryBlock`, `QuizQuestion`, `QuizAnswer`, `CodeTask` — replaced by `LessonBlock`
- `UserQuizAnswer`, `UserCodeTaskSubmission` — replaced by `UserLessonBlockProgress`

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
| lessons | ✅ done | GET /api/lessons/:id, POST /api/lessons/:id/start, POST /api/lessons/:lessonId/blocks/:blockId/complete, POST /api/lessons/:id/complete |
| tracks | ✅ done | GET /api/tracks/:language (course → sections → lessons + lock state) |
| for-you | ✅ done | GET /api/for-you (hero-driven, language scoped) |
| progress | ✅ done | no HTTP — ProgressService used internally |
| profile | ✅ done | GET /api/profile/me, PATCH /api/profile/me, POST /api/profile/logout |
| tasks | planned | — |
| admin | planned | — |

## Seeding

`pnpm prisma:seed` runs `prisma/seed.ts` and idempotently rebuilds the Python course (5 sections, 35 lessons, ~600 XP, ~265 min). Every lesson has 6 blocks (theory + analogy + code + explanation + mistake + quiz). Re-running wipes existing courses (cascades clean up sections/lessons/blocks/progress).
