# Friends Module — CLAUDE.md

## Purpose

Friendship graph + friend progression overview. The backend stores PENDING / ACCEPTED / REJECTED edges; the frontend renders the social UI.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/friends/request` | Send a request by `username` |
| POST | `/api/friends/accept` | Accept a pending request you received |
| POST | `/api/friends/reject` | Reject a pending request you received |
| GET | `/api/friends` | Accepted friendships |
| GET | `/api/friends/pending` | Pending requests involving this user (both directions) |
| GET | `/api/friends/progress` | Friend stats (xp, streak, league, completed lessons) |

Auth required.

## Data model

```
Friendship {
  requesterId  → User
  addresseeId  → User
  status       FriendshipStatus  (PENDING | ACCEPTED | REJECTED)
  @@unique([requesterId, addresseeId])
}
```

Each pair `(A, B)` has at most one row in each direction. We treat `(A, B)` and `(B, A)` as duplicates at the application layer — sending a request creates `(requester, addressee)` and prevents either direction from being re-created while ACCEPTED or PENDING.

## Rules

- **Self-friending** rejected with 400.
- **Already PENDING/ACCEPTED**: 409.
- **Existing REJECTED**: re-requesting flips the row back to PENDING (allows a second attempt without leaving an orphan).
- **Accept/reject**: only the addressee can respond. Idempotency is enforced — re-accepting a non-PENDING row returns 409.

## GET /api/friends/progress

```json
{
  "friends": [
    {
      "username": "alex_dev",
      "displayName": null,
      "avatarUrl": null,
      "xp": 340,
      "level": 4,
      "streak": 12,
      "completedLessons": 24,
      "currentLeague": "SILVER"
    }
  ]
}
```

`currentLeague` is computed from XP via [`leagues/leagues.ts`](../../leagues/leagues.ts) — same source as the leaderboard endpoint, so badges/leagues stay consistent.

## What the backend does NOT do

- Recommend "people you may know" — needs a corpus the platform doesn't have yet.
- DMs / chat — out of scope.
- Push notifications on friend events — the frontend polls.
- Block / mute lists — out of scope.

## File structure

```
friends/
  dto/
    friend-request.dto.ts          — { username }, { friendshipId }
  friends.service.ts               — sendRequest, respond, list, progress
  friends.controller.ts            — 6 endpoints
  friends.module.ts
  CLAUDE.md
```
