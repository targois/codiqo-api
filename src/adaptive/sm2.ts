// ─── SM-2 spaced repetition ──────────────────────────────────────────────────
//
// Classic SuperMemo-2 algorithm (Wozniak, 1990). Each skill has its own
// `intervalDays`, `easeFactor`, and `repetitionCount`. After every review,
// the user supplies a recall-quality rating `q ∈ [0..5]` and we recompute:
//
//   EF' = max(1.3, EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))
//
//   if q < 3 (failure):
//     repetitionCount = 0
//     intervalDays    = 1
//   else if repetitionCount == 0:
//     intervalDays = 1
//   else if repetitionCount == 1:
//     intervalDays = 6
//   else:
//     intervalDays = round(prevInterval * EF')
//   repetitionCount++
//
//   nextReviewAt = now + intervalDays * 24h
//
// SM-2 runs *in parallel* with BKT. BKT decides whether the skill is learned
// (correctness of an attempt); SM-2 decides when to surface a review to fight
// forgetting. They don't share state — a skill can be "mastered" in BKT and
// still be "due" in SM-2.

export interface Sm2State {
  intervalDays: number;
  easeFactor: number;
  repetitionCount: number;
}

export interface Sm2Result extends Sm2State {
  nextReviewAt: Date;
}

const MIN_EASE = 1.3;

export function sm2Update(prev: Sm2State, quality: number, now = new Date()): Sm2Result {
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let ef = prev.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ef < MIN_EASE) ef = MIN_EASE;

  let repetitionCount = prev.repetitionCount;
  let intervalDays: number;

  if (q < 3) {
    repetitionCount = 0;
    intervalDays = 1;
  } else if (repetitionCount === 0) {
    intervalDays = 1;
    repetitionCount = 1;
  } else if (repetitionCount === 1) {
    intervalDays = 6;
    repetitionCount = 2;
  } else {
    intervalDays = Math.max(1, Math.round(prev.intervalDays * ef));
    repetitionCount += 1;
  }

  const nextReviewAt = new Date(now.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  return { intervalDays, easeFactor: ef, repetitionCount, nextReviewAt };
}

// Sensible defaults for a fresh skill review record.
export function sm2InitialState(now = new Date()): Sm2Result {
  return {
    intervalDays: 1,
    easeFactor: 2.5,
    repetitionCount: 0,
    nextReviewAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
  };
}
