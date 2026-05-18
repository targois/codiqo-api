# Collaborative Challenges Module — CLAUDE.md

## Purpose

Shared XP-goal challenges between users (typically friends). A small group of users commits to collectively earning `xpGoal` XP before `expiresAt`. The backend tracks participation; XP itself flows through the regular XP path — collab challenges don't grant XP directly, they just *aggregate* it.

## Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/challenges/create` | Create a challenge (creator auto-joins) |
| POST | `/api/challenges/join` | Join an existing, non-expired challenge |
| GET | `/api/challenges` | All challenges this user participates in, with totals |

Auth required.

## POST /api/challenges/create

```json
{
  "title": "Sprint to 100 XP",
  "xpGoal": 100,
  "expiresAt": "2026-05-19T10:00:00.000Z"
}
```

Validation:
- `title`: 3..120 chars
- `xpGoal`: 10..5000
- `expiresAt`: must be in the future at request time

Creator becomes the first `CollaborativeChallengeParticipant` row in the same operation.

## POST /api/challenges/join

```json
{ "challengeId": "..." }
```

Errors:
- 404 — unknown challenge
- 400 — challenge expired
- 409 — already joined

## GET /api/challenges

```json
{
  "challenges": [
    {
      "id": "...",
      "title": "Sprint to 100 XP",
      "xpGoal": 100,
      "totalXp": 65,
      "progressPercent": 65,
      "expiresAt": "2026-05-19T10:00:00.000Z",
      "isExpired": false,
      "isCompleted": false,
      "myContribution": 40,
      "participants": [
        { "username": "bob",   "contributedXp": 40 },
        { "username": "alice", "contributedXp": 25 }
      ]
    }
  ]
}
```

## How `contributedXp` is computed

For each participant, we sum `XPTransaction.amount` rows where `createdAt` is between the challenge's `createdAt` and `min(expiresAt, now)`. This means:

- Joining a challenge mid-way means earlier-window XP doesn't count — only XP earned *after* the challenge starts.
- Lessons and daily challenges both feed in (anything that emits an `XPTransaction`).
- After `expiresAt`, the totals freeze.

It's all read-side aggregation — no extra writes on every XP grant, no double-counting risk.

## Why no special XP path

Collab challenges deliberately don't grant their own XP. They are a *lens* over the existing XP economy, so the same activity counts in lessons, leaderboards, and challenges without bookkeeping going out of sync.

## What this module does NOT do

- Per-user XP cap inside a challenge — keep it simple.
- Auto-end / reward distribution on completion — challenges are observational at MVP.
- Invitations — frontend can share the `challengeId` via any channel.

## File structure

```
collaborative-challenges/
  dto/
    collaborative-challenge.dto.ts   — { title, xpGoal, expiresAt }, { challengeId }
  collaborative-challenges.service.ts — create, join, listForUser, sumXpInWindow
  collaborative-challenges.controller.ts — POST /create, POST /join, GET /
  collaborative-challenges.module.ts
  CLAUDE.md
```
