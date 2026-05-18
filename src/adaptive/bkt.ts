// ─── Bayesian Knowledge Tracing (BKT) ────────────────────────────────────────
//
// Standard four-parameter BKT model. Per-skill posterior P(L) is updated after
// every observed attempt:
//
//   if correct:   P(L | obs) = P(L) * (1 - P_slip) /
//                              ( P(L) * (1 - P_slip) + (1 - P(L)) * P_guess )
//   else:         P(L | obs) = P(L) * P_slip /
//                              ( P(L) * P_slip + (1 - P(L)) * (1 - P_guess) )
//
//   P(L)' = P(L | obs) + (1 - P(L | obs)) * P_transit
//
// Parameters are intentionally fixed (one set, all skills). Per-skill tuning
// would need a calibration corpus we don't have at MVP — we trade accuracy
// for simplicity and explainability, in line with the platform's MVP rule.
// All math is deterministic.

export const BKT = {
  PRIOR: 0.1,
  TRANSIT: 0.1,
  GUESS: 0.2,
  SLIP: 0.1,
} as const;

export interface BktInput {
  /** Previous posterior P(L). Use BKT.PRIOR for a fresh skill. */
  prior: number;
  correct: boolean;
}

export function bktUpdate(input: BktInput): number {
  const { prior, correct } = input;
  const numerator = correct ? prior * (1 - BKT.SLIP) : prior * BKT.SLIP;
  const denominator = correct
    ? prior * (1 - BKT.SLIP) + (1 - prior) * BKT.GUESS
    : prior * BKT.SLIP + (1 - prior) * (1 - BKT.GUESS);
  const posterior = denominator === 0 ? prior : numerator / denominator;
  return clamp01(posterior + (1 - posterior) * BKT.TRANSIT);
}

// confidenceLevel = how much we trust the masteryScore. Grows with attempts
// and saturates at 1.0 after ~20 attempts. Reported separately so the UI can
// fade in mastery claims (e.g. don't display "Master" until confidence > 0.7).
export function confidenceLevel(totalAttempts: number): number {
  return clamp01(totalAttempts / 20);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

// ─── IRT (Item Response Theory) — onboarding diagnostic helper ──────────────
//
// We don't run a full IRT loop at runtime — we use a simplified deterministic
// approximation that maps the onboarding-declared level to an initial mastery
// prior. This is "good enough" to seed BKT without a calibration item bank.
//
// If a future onboarding diagnostic asks the user N quick questions, the
// proportion correct can shift this prior (proportionCorrect * 0.6) to seed
// each skill more accurately.

import { UserLearningLevel } from '@prisma/client';

export function irtInitialMastery(level: UserLearningLevel): number {
  switch (level) {
    case UserLearningLevel.BEGINNER:
      return BKT.PRIOR;
    case UserLearningLevel.INTERMEDIATE:
      return 0.3;
    case UserLearningLevel.ADVANCED:
      return 0.5;
  }
}
