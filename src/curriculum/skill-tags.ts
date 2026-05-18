import { SkillTag } from '@prisma/client';

// ─── Skill → review lesson mapping ───────────────────────────────────────────
//
// The frontend curriculum is the source of truth for which lessons cover which
// skills. We mirror only the *canonical review lesson per skill* — the lesson
// the recommendation engine and the spaced-repetition scheduler should surface
// when a skill is weak or due.
//
// Keep this small and obvious. If the frontend renames a lesson, update both
// in lockstep. Missing entries make recommendations fall back to "no lesson".

export const SKILL_REVIEW_LESSON: Record<SkillTag, string | null> = {
  VARIABLES: 'python-variables',
  LOOPS: 'python-for-loops',
  FUNCTIONS: 'python-functions-basics',
  RECURSION: null,
  OOP: 'python-classes-intro',
  CONDITIONS: 'python-if-statements',
  LISTS: 'python-lists-intro',
  DICTIONARIES: 'python-dictionaries',
  STRINGS: 'python-string-basics',
  ARRAYS: 'python-lists-intro',
};

export const ALL_SKILL_TAGS = Object.values(SkillTag);
