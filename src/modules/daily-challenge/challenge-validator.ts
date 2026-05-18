import { ChallengeValidationType } from '@prisma/client';

// ── MVP validators ─────────────────────────────────────────────────────────
//
// We intentionally DO NOT execute user code. The platform stores an
// `expectedSolution` per challenge and validates by string comparison.
//
// Future-ready: this file exposes a single `validate(type, submitted,
// expected)` entrypoint. New validator types (AST_DIFF, TEST_CASES,
// SANDBOX_EXEC) can be added by extending the switch — controllers and
// services do not need to change. Today only EXACT_MATCH and
// NORMALIZED_MATCH exist.
//
// Security: validators must never run untrusted code, never shell out, and
// never reflect submitted code into a process. Pure string ops only.

export interface ValidationOutcome {
  correct: boolean;
}

export function validate(
  type: ChallengeValidationType,
  submitted: string,
  expected: string | null | undefined,
): ValidationOutcome {
  if (!expected) return { correct: false };

  switch (type) {
    case ChallengeValidationType.EXACT_MATCH:
      return { correct: submitted === expected };
    case ChallengeValidationType.NORMALIZED_MATCH:
      return { correct: normalize(submitted) === normalize(expected) };
  }
}

// Whitespace normalization: collapse trailing whitespace on every line,
// drop blank lines, and trim outer whitespace. Indentation (leading spaces)
// is preserved because Python depends on it.
export function normalize(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .filter((line) => line.length > 0)
    .join('\n')
    .trim();
}
