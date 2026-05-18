import { ProgrammingLanguage, UserLearningLevel } from '@prisma/client';

// ─── Minimal in-backend curriculum registry ──────────────────────────────────
//
// The frontend owns lesson CONTENT (theory, code, quizzes, rendering).
// The backend only owns lesson IDENTITY + ORDER + ICON METADATA, because
// adaptive routing ("where should this user resume?") and progression
// aggregation ("what's unlocked?", "what module is this?") need a stable
// structural view of the curriculum.
//
// Rules:
//   - lesson IDs are stable and frontend-authoritative; if a name changes
//     here it must change in the frontend curriculum at the same time.
//   - this file contains NO lesson content — only IDs and grouping.
//   - any module/lesson the frontend adds without a matching entry here is
//     still completable via POST /api/lessons/:id/complete, it just won't
//     count toward unlock / current-lesson / track aggregation.

export interface ModuleSpec {
  id: string;
  title: string;
  lessons: string[];
}

export interface TrackSpec {
  language: ProgrammingLanguage;
  slug: string;
  iconKey: string;
  accentColor: string;
  modules: ModuleSpec[];
  levelStartingLessonId: Record<UserLearningLevel, string>;
}

const PYTHON: TrackSpec = {
  language: ProgrammingLanguage.PYTHON,
  slug: 'python',
  iconKey: 'python',
  accentColor: '#3776AB',
  modules: [
    {
      id: 'python-basics',
      title: 'Python Basics',
      lessons: [
        'python-print-first-output',
        'python-variables',
        'python-data-types',
        'python-string-basics',
        'python-numbers-arithmetic',
        'python-comments',
        'python-input',
      ],
    },
    {
      id: 'python-control-flow',
      title: 'Control Flow',
      lessons: [
        'python-if-statements',
        'python-comparison-operators',
        'python-logical-operators',
        'python-elif-else',
        'python-while-loops',
        'python-for-loops',
        'python-break-continue',
      ],
    },
    {
      id: 'python-data-structures',
      title: 'Data Structures',
      lessons: [
        'python-lists-intro',
        'python-list-methods',
        'python-tuples',
        'python-dictionaries',
        'python-sets',
        'python-nested-structures',
      ],
    },
    {
      id: 'python-functions',
      title: 'Functions',
      lessons: [
        'python-functions-basics',
        'python-function-arguments',
        'python-return-values',
        'python-default-arguments',
        'python-keyword-arguments',
        'python-scope',
        'python-lambda',
      ],
    },
    {
      id: 'python-advanced',
      title: 'Advanced Python',
      lessons: [
        'python-list-comprehensions',
        'python-error-handling',
        'python-file-io',
        'python-modules-imports',
        'python-classes-intro',
        'python-class-methods',
        'python-inheritance',
        'python-decorators-intro',
      ],
    },
  ],
  levelStartingLessonId: {
    BEGINNER: 'python-print-first-output',
    INTERMEDIATE: 'python-lists-intro',
    ADVANCED: 'python-functions-basics',
  },
};

const JAVASCRIPT: TrackSpec = {
  language: ProgrammingLanguage.JAVASCRIPT,
  slug: 'javascript',
  iconKey: 'javascript',
  accentColor: '#F7DF1E',
  modules: [],
  levelStartingLessonId: {
    BEGINNER: '',
    INTERMEDIATE: '',
    ADVANCED: '',
  },
};

const TYPESCRIPT: TrackSpec = {
  language: ProgrammingLanguage.TYPESCRIPT,
  slug: 'typescript',
  iconKey: 'typescript',
  accentColor: '#3178C6',
  modules: [],
  levelStartingLessonId: {
    BEGINNER: '',
    INTERMEDIATE: '',
    ADVANCED: '',
  },
};

const HTML_CSS: TrackSpec = {
  language: ProgrammingLanguage.HTML_CSS,
  slug: 'html-css',
  iconKey: 'html-css',
  accentColor: '#E34F26',
  modules: [],
  levelStartingLessonId: {
    BEGINNER: '',
    INTERMEDIATE: '',
    ADVANCED: '',
  },
};

const REACT: TrackSpec = {
  language: ProgrammingLanguage.REACT,
  slug: 'react',
  iconKey: 'react',
  accentColor: '#61DAFB',
  modules: [],
  levelStartingLessonId: {
    BEGINNER: '',
    INTERMEDIATE: '',
    ADVANCED: '',
  },
};

const TRACKS: Record<ProgrammingLanguage, TrackSpec> = {
  PYTHON,
  JAVASCRIPT,
  TYPESCRIPT,
  HTML_CSS,
  REACT,
};

const SLUG_TO_LANGUAGE: Record<string, ProgrammingLanguage> = Object.fromEntries(
  Object.values(TRACKS).flatMap((t) => [
    [t.slug, t.language],
    [t.slug.replace('-', '_'), t.language],
  ]),
);

// ── Lookups ────────────────────────────────────────────────────────────────

export function getTrack(language: ProgrammingLanguage): TrackSpec {
  return TRACKS[language];
}

export function resolveLanguageSlug(slug: string): ProgrammingLanguage | null {
  return SLUG_TO_LANGUAGE[slug.toLowerCase()] ?? null;
}

// Flat ordered list of lesson IDs across all modules.
export function trackLessonSequence(language: ProgrammingLanguage): string[] {
  return TRACKS[language].modules.flatMap((m) => m.lessons);
}

// Maps lessonId → { module, indexInTrack } for fast lookups.
export function lessonIndex(
  language: ProgrammingLanguage,
): Map<string, { module: ModuleSpec; indexInTrack: number }> {
  const map = new Map<string, { module: ModuleSpec; indexInTrack: number }>();
  let i = 0;
  for (const module of TRACKS[language].modules) {
    for (const lessonId of module.lessons) {
      map.set(lessonId, { module, indexInTrack: i });
      i++;
    }
  }
  return map;
}

export function getStartingLessonId(
  language: ProgrammingLanguage,
  level: UserLearningLevel,
): string | null {
  return TRACKS[language].levelStartingLessonId[level] || null;
}

// Sequential unlock rule: a lesson is unlocked iff
//   (it IS the starting lesson)              OR
//   (the previous lesson in the track is in completed)  OR
//   (it is itself completed).
//
// Lessons BEFORE the starting lesson are considered locked-out by adaptive
// routing — the user opted in to a later entry point and we won't surface
// the earlier lessons unless they go back and complete them manually.
export function computeUnlockedLessons(
  language: ProgrammingLanguage,
  startingLessonId: string | null,
  completed: Set<string>,
): string[] {
  const seq = trackLessonSequence(language);
  if (seq.length === 0) return [];

  const startIdx = startingLessonId ? Math.max(0, seq.indexOf(startingLessonId)) : 0;
  const unlocked: string[] = [];

  for (let i = startIdx; i < seq.length; i++) {
    const id = seq[i];
    if (i === startIdx) {
      unlocked.push(id);
      continue;
    }
    const prev = seq[i - 1];
    if (completed.has(prev) || completed.has(id)) {
      unlocked.push(id);
    } else {
      break;
    }
  }

  // Lessons before the starting point that the user nonetheless completed
  // remain "unlocked" — they are visitable for review.
  for (let i = 0; i < startIdx; i++) {
    if (completed.has(seq[i]) && !unlocked.includes(seq[i])) {
      unlocked.push(seq[i]);
    }
  }

  return unlocked;
}

// "Current lesson" = first unlocked lesson the user has not completed.
// Fallback chain: first unlocked → starting lesson → first lesson in track.
export function computeCurrentLessonId(
  language: ProgrammingLanguage,
  startingLessonId: string | null,
  completed: Set<string>,
): string | null {
  const seq = trackLessonSequence(language);
  if (seq.length === 0) return null;
  const unlocked = computeUnlockedLessons(language, startingLessonId, completed);
  const next = unlocked.find((id) => !completed.has(id));
  if (next) return next;
  return startingLessonId || seq[0] || null;
}

// The module a given lessonId belongs to.
export function findModule(
  language: ProgrammingLanguage,
  lessonId: string | null,
): ModuleSpec | null {
  if (!lessonId) return null;
  return TRACKS[language].modules.find((m) => m.lessons.includes(lessonId)) ?? null;
}
