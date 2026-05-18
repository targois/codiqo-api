import {
  ChallengeValidationType,
  PrismaClient,
  SkillTag,
} from '@prisma/client';

const prisma = new PrismaClient();

// ─── Daily challenge pool ────────────────────────────────────────────────────

interface ChallengeSpec {
  slug: string;
  title: string;
  description: string;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedMinutes: number;
  xpReward: number;
  language: string;
  starterCode: string;
  expectedOutput: string;
  hint: string;
  validationType: ChallengeValidationType;
  expectedSolution: string;
}

const CHALLENGES: ChallengeSpec[] = [
  {
    slug: 'fizzbuzz-1-to-15',
    title: 'FizzBuzz (1 to 15)',
    description:
      'Print numbers 1 through 15. Replace multiples of 3 with "Fizz", multiples of 5 with "Buzz", and multiples of both with "FizzBuzz".',
    difficulty: 'BEGINNER',
    estimatedMinutes: 5,
    xpReward: 25,
    language: 'python',
    starterCode: `for n in range(1, 16):\n    # your code here\n    pass\n`,
    expectedOutput: `1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz`,
    hint: 'Check the multiple-of-15 condition first, otherwise FizzBuzz outputs will be lost.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `for n in range(1, 16):\n    if n % 15 == 0:\n        print("FizzBuzz")\n    elif n % 3 == 0:\n        print("Fizz")\n    elif n % 5 == 0:\n        print("Buzz")\n    else:\n        print(n)\n`,
  },
  {
    slug: 'reverse-string',
    title: 'Reverse a String',
    description: 'Print the reverse of the string "diploma".',
    difficulty: 'BEGINNER',
    estimatedMinutes: 3,
    xpReward: 20,
    language: 'python',
    starterCode: `s = "diploma"\n# print the reverse of s\n`,
    expectedOutput: `amolpid`,
    hint: 'Python supports slice steps — try the [::-1] idiom.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `s = "diploma"\nprint(s[::-1])\n`,
  },
  {
    slug: 'count-vowels',
    title: 'Count Vowels',
    description:
      'Count the number of vowels (a, e, i, o, u — case insensitive) in "Education" and print it.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 4,
    xpReward: 25,
    language: 'python',
    starterCode: `word = "Education"\n# print the vowel count\n`,
    expectedOutput: `5`,
    hint: 'Lowercase the string first, then sum a generator expression.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `word = "Education"\nprint(sum(1 for c in word.lower() if c in "aeiou"))\n`,
  },
  {
    slug: 'sum-numbers-1-to-100',
    title: 'Sum 1 to 100',
    description: 'Compute and print the sum of integers from 1 to 100 (inclusive).',
    difficulty: 'BEGINNER',
    estimatedMinutes: 2,
    xpReward: 20,
    language: 'python',
    starterCode: `# print the sum of 1..100\n`,
    expectedOutput: `5050`,
    hint: 'range(1, 101) is exclusive on the right end.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `print(sum(range(1, 101)))\n`,
  },
  {
    slug: 'palindrome-check',
    title: 'Palindrome Check',
    description: 'Print True if "level" reads the same forwards and backwards, else False.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 3,
    xpReward: 25,
    language: 'python',
    starterCode: `word = "level"\n# print True/False — is it a palindrome?\n`,
    expectedOutput: `True`,
    hint: 'Compare the string to its reverse using slicing.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `word = "level"\nprint(word == word[::-1])\n`,
  },
  {
    slug: 'even-odd-1-to-10',
    title: 'Even or Odd',
    description: 'For each number from 1 to 10, print "<n>: Even" or "<n>: Odd".',
    difficulty: 'BEGINNER',
    estimatedMinutes: 4,
    xpReward: 25,
    language: 'python',
    starterCode: `for n in range(1, 11):\n    # print "<n>: Even" or "<n>: Odd"\n    pass\n`,
    expectedOutput: `1: Odd\n2: Even\n3: Odd\n4: Even\n5: Odd\n6: Even\n7: Odd\n8: Even\n9: Odd\n10: Even`,
    hint: 'The modulo operator n % 2 tells you the parity.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `for n in range(1, 11):\n    if n % 2 == 0:\n        print(f"{n}: Even")\n    else:\n        print(f"{n}: Odd")\n`,
  },
  {
    slug: 'primes-under-20',
    title: 'Primes Under 20',
    description: 'Print each prime number less than 20, one per line.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 7,
    xpReward: 30,
    language: 'python',
    starterCode: `# print primes < 20, one per line\n`,
    expectedOutput: `2\n3\n5\n7\n11\n13\n17\n19`,
    hint: 'A number n is prime if no integer in 2..sqrt(n) divides it.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `for n in range(2, 20):\n    is_prime = True\n    for d in range(2, int(n ** 0.5) + 1):\n        if n % d == 0:\n            is_prime = False\n            break\n    if is_prime:\n        print(n)\n`,
  },
  {
    slug: 'factorial-of-6',
    title: 'Factorial of 6',
    description: 'Compute and print 6! (six factorial).',
    difficulty: 'BEGINNER',
    estimatedMinutes: 3,
    xpReward: 20,
    language: 'python',
    starterCode: `# print 6 factorial\n`,
    expectedOutput: `720`,
    hint: 'Use a loop, or import math and call math.factorial.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `import math\nprint(math.factorial(6))\n`,
  },
  {
    slug: 'fibonacci-first-10',
    title: 'First 10 Fibonacci',
    description: 'Print the first 10 Fibonacci numbers starting from 0, one per line.',
    difficulty: 'INTERMEDIATE',
    estimatedMinutes: 6,
    xpReward: 30,
    language: 'python',
    starterCode: `# print the first 10 Fibonacci numbers (start with 0)\n`,
    expectedOutput: `0\n1\n1\n2\n3\n5\n8\n13\n21\n34`,
    hint: 'Track two variables a and b, then update them simultaneously.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `a, b = 0, 1\nfor _ in range(10):\n    print(a)\n    a, b = b, a + b\n`,
  },
  {
    slug: 'max-of-list',
    title: 'Max of a List',
    description: 'Given the list [3, 7, 2, 9, 4, 8], print the maximum value.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 2,
    xpReward: 20,
    language: 'python',
    starterCode: `nums = [3, 7, 2, 9, 4, 8]\n# print the max\n`,
    expectedOutput: `9`,
    hint: 'Python has a built-in for this.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `nums = [3, 7, 2, 9, 4, 8]\nprint(max(nums))\n`,
  },
  {
    slug: 'word-count',
    title: 'Word Count',
    description:
      'Count the words in the sentence "the quick brown fox jumps over the lazy dog" and print the count.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 3,
    xpReward: 20,
    language: 'python',
    starterCode: `s = "the quick brown fox jumps over the lazy dog"\n# print the number of words\n`,
    expectedOutput: `9`,
    hint: '.split() splits on whitespace by default.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `s = "the quick brown fox jumps over the lazy dog"\nprint(len(s.split()))\n`,
  },
  {
    slug: 'sum-of-digits',
    title: 'Sum of Digits',
    description: 'Compute and print the sum of the digits of 12345.',
    difficulty: 'BEGINNER',
    estimatedMinutes: 3,
    xpReward: 25,
    language: 'python',
    starterCode: `n = 12345\n# print the sum of n's digits\n`,
    expectedOutput: `15`,
    hint: 'Convert the integer to a string and iterate over the characters.',
    validationType: ChallengeValidationType.NORMALIZED_MATCH,
    expectedSolution: `n = 12345\nprint(sum(int(c) for c in str(n)))\n`,
  },
];

// ─── Badge pool ──────────────────────────────────────────────────────────────
//
// Skill-tagged badges unlock when masteryScore >= 0.8 AND confidenceLevel
// >= 0.25 for that tag (~5 attempts). XP-gated badges unlock when User.xp
// crosses the threshold. Both conditions AND together when both are set.

interface BadgeSpec {
  slug: string;
  title: string;
  description: string;
  iconKey: string;
  skillTag?: SkillTag;
  xpRequirement?: number;
}

const BADGES: BadgeSpec[] = [
  {
    slug: 'variables-master',
    title: 'Variables Master',
    description: 'Mastered the basics of Python variables.',
    iconKey: 'variables',
    skillTag: SkillTag.VARIABLES,
  },
  {
    slug: 'loop-explorer',
    title: 'Loop Explorer',
    description: 'Mastered iteration with for and while loops.',
    iconKey: 'loops',
    skillTag: SkillTag.LOOPS,
  },
  {
    slug: 'function-builder',
    title: 'Function Builder',
    description: 'Mastered function definition and call mechanics.',
    iconKey: 'functions',
    skillTag: SkillTag.FUNCTIONS,
  },
  {
    slug: 'recursion-apprentice',
    title: 'Recursion Apprentice',
    description: 'Comfortable with recursive thinking.',
    iconKey: 'recursion',
    skillTag: SkillTag.RECURSION,
  },
  {
    slug: 'oop-initiate',
    title: 'OOP Initiate',
    description: 'Mastered the core of classes and objects.',
    iconKey: 'oop',
    skillTag: SkillTag.OOP,
  },
  {
    slug: 'conditional-thinker',
    title: 'Conditional Thinker',
    description: 'Mastered branching logic.',
    iconKey: 'conditions',
    skillTag: SkillTag.CONDITIONS,
  },
  {
    slug: 'list-wrangler',
    title: 'List Wrangler',
    description: 'Mastered Python lists.',
    iconKey: 'lists',
    skillTag: SkillTag.LISTS,
  },
  {
    slug: 'xp-100',
    title: 'Just Getting Started',
    description: 'Earned your first 100 XP.',
    iconKey: 'xp-bronze',
    xpRequirement: 100,
  },
  {
    slug: 'xp-500',
    title: 'On a Roll',
    description: 'Earned 500 XP across lessons and challenges.',
    iconKey: 'xp-silver',
    xpRequirement: 500,
  },
  {
    slug: 'xp-1000',
    title: 'Four-Digit Club',
    description: 'Earned 1,000 XP.',
    iconKey: 'xp-gold',
    xpRequirement: 1000,
  },
];

async function main() {
  console.log('Seeding daily challenges…');
  for (const c of CHALLENGES) {
    await prisma.dailyChallenge.upsert({
      where: { slug: c.slug },
      create: c,
      update: c,
    });
  }
  console.log(`Done — ${CHALLENGES.length} challenges.`);

  console.log('Seeding badges…');
  for (const b of BADGES) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      create: b,
      update: b,
    });
  }
  console.log(`Done — ${BADGES.length} badges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
