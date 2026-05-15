import {
  LessonBlockType,
  LessonDifficulty,
  PrismaClient,
  ProgrammingLanguage,
} from '@prisma/client';

const prisma = new PrismaClient();

// ── Block builders ──────────────────────────────────────────────────────────

interface BlockSpec {
  type: LessonBlockType;
  payload: Record<string, unknown>;
}

const theory = (title: string, content: string): BlockSpec => ({
  type: LessonBlockType.THEORY,
  payload: { title, content },
});

const analogy = (title: string, content: string): BlockSpec => ({
  type: LessonBlockType.ANALOGY,
  payload: { title, content },
});

const code = (filename: string, src: string, language = 'python'): BlockSpec => ({
  type: LessonBlockType.CODE,
  payload: { language, filename, code: src },
});

const explanation = (...items: { line: string; explanation: string }[]): BlockSpec => ({
  type: LessonBlockType.EXPLANATION,
  payload: { items },
});

const mistake = (title: string, content: string): BlockSpec => ({
  type: LessonBlockType.MISTAKE,
  payload: { title, content },
});

const quiz = (
  question: string,
  answers: string[],
  correctAnswer: number,
  explainText: string,
): BlockSpec => ({
  type: LessonBlockType.QUIZ,
  payload: { question, answers, correctAnswer, explanation: explainText },
});

// ── Spec types ──────────────────────────────────────────────────────────────

interface LessonSpec {
  slug: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  xpReward: number;
  difficulty: LessonDifficulty;
  isFree?: boolean;
  blocks: BlockSpec[];
}

interface SectionSpec {
  title: string;
  description: string;
  lessons: LessonSpec[];
}

interface CourseSpec {
  slug: string;
  title: string;
  description: string;
  language: ProgrammingLanguage;
  difficulty: LessonDifficulty;
  sections: SectionSpec[];
}

// ── Python Course content ───────────────────────────────────────────────────

const PYTHON_COURSE: CourseSpec = {
  slug: 'python-programming',
  title: 'Python Programming',
  description:
    'Learn Python from zero to writing real programs — variables, loops, functions, classes, and beyond.',
  language: ProgrammingLanguage.PYTHON,
  difficulty: LessonDifficulty.BEGINNER,
  sections: [
    {
      title: 'First Steps in Python',
      description: 'Output, variables, data types, and the basics of writing Python code.',
      lessons: [
        // ── Module 1 / Lesson 1 ─────────────────────────────────────────────
        {
          slug: 'python-print-and-first-output',
          title: 'print() and First Output',
          description: 'Understand how Python displays information using the print() function.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          isFree: true,
          blocks: [
            theory(
              'What is print()?',
              "Every program needs a way to communicate results. In Python, the simplest form of output is the print() function. When Python encounters print(), it evaluates whatever is inside the parentheses and sends it to the standard output — typically your terminal. You can print plain text (a string), numbers, or even the result of a calculation. print() always adds a newline at the end, so each call starts on a new line.",
            ),
            analogy(
              'A megaphone',
              "Think of print() as a megaphone. Your program runs silently inside the computer, and print() is how it shouts its results out to the world. Without it, the program would finish its work without you ever seeing the result.",
            ),
            code(
              'hello.py',
              `print('Hello, world!')\nprint(42)\nprint(3 + 5)\nprint('Welcome to Codiqo!')`,
            ),
            explanation(
              { line: "print('Hello, world!')", explanation: "Prints the string 'Hello, world!' — the classic first program." },
              { line: 'print(42)', explanation: 'Prints the integer 42 directly.' },
              { line: 'print(3 + 5)', explanation: 'Evaluates the expression 3 + 5 first, then prints 8.' },
              { line: "print('Welcome to Codiqo!')", explanation: 'Prints a motivational message — useful for user-facing programs.' },
            ),
            mistake(
              'Forgetting the parentheses',
              "Writing print 'Hello' works in very old Python 2 but causes a SyntaxError in Python 3. Always use print('Hello') with parentheses.",
            ),
            quiz(
              "What will the following code print?\nprint(10 + 5)\nprint('Codiqo')",
              ['10 + 5 and Codiqo', '15 and Codiqo on separate lines', '15Codiqo on one line', 'An error'],
              1,
              "Python evaluates 10 + 5 to 15 first, then prints it. The second print call outputs 'Codiqo' on a new line because print() always adds a newline.",
            ),
          ],
        },
        // ── Lesson 2 ─────────────────────────────────────────────────────────
        {
          slug: 'python-variables',
          title: 'Variables',
          description: 'Variables as named containers — assign, reassign, and use values.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'Variables — named containers',
              'A variable is a named location in memory where a program stores a value. You create one by writing its name, then =, then the value. Variable names should be meaningful: score is clearer than x. Names are case-sensitive — Score and score are two different variables.',
            ),
            analogy(
              'Labels on boxes',
              'Imagine a label maker. You write a name on a label, stick it on a box, and put something inside. Later, when you need the contents, you find the box by its label. Variables are labels for boxes of data in memory.',
            ),
            code(
              'variables.py',
              `username = 'alex'\nscore = 120\nlevel = 3\n\nprint(username)\nprint('Level:', level)\nprint('Score:', score)`,
            ),
            explanation(
              { line: "username = 'alex'", explanation: "Three variables are created and assigned values." },
              { line: 'print(username)', explanation: "Prints the contents of 'username' — outputs alex." },
              { line: "print('Level:', level)", explanation: "Prints a label and the value of 'level' — outputs Level: 3." },
              { line: "print('Score:', score)", explanation: 'Outputs Score: 120.' },
            ),
            mistake(
              '= vs ==',
              'Confusing = (assignment) with == (comparison). Writing score == 120 does NOT store 120 in score — it checks whether score already equals 120. Always use a single = to assign.',
            ),
            quiz(
              "Which statement correctly stores the player's name 'Maya' in a variable and then prints it?",
              [
                "name == 'Maya' / print(name)",
                "'Maya' = name / print(name)",
                "name = 'Maya' / print(name)",
                "print(name = 'Maya')",
              ],
              2,
              "Use a single = to assign 'Maya' to the variable name, then pass that variable to print().",
            ),
          ],
        },
        // ── Lesson 3 ─────────────────────────────────────────────────────────
        {
          slug: 'python-data-types',
          title: 'Data Types',
          description: "Strings, integers, floats, and Booleans — Python's core types.",
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'Every value has a type',
              "The four most important basic types are: str (text in quotes), int (whole numbers), float (decimal numbers), and bool (True or False). Even though 10 and '10' look similar, Python treats them very differently. The integer 10 can be used in arithmetic; the string '10' cannot — it is just text that happens to contain digits.",
            ),
            analogy(
              'Containers in a kitchen',
              'A bowl is for solids, a jug is for liquids. You cannot pour water into a flour bowl without making a mess. Python types work the same way — each kind of data has its own rules.',
            ),
            code(
              'types.py',
              `name = 'Codiqo'        # str\nlessons_done = 5       # int\ncompletion = 0.75      # float\nis_premium = True      # bool\n\nprint(type(name))\nprint(type(lessons_done))\nprint(type(completion))\nprint(type(is_premium))`,
            ),
            explanation(
              { line: "name = 'Codiqo'", explanation: 'Each variable is assigned a value of a different type.' },
              { line: 'type(name)', explanation: 'type() is a built-in function that tells you what type a value belongs to.' },
              { line: 'Output', explanation: "Prints <class 'str'>, <class 'int'>, <class 'float'>, <class 'bool'>." },
            ),
            mistake(
              'Mixing types in operations',
              "Writing '5' + 3 raises a TypeError because Python cannot add a string and an integer. Use int('5') + 3 to convert first.",
            ),
            quiz(
              'Which value is a float?',
              ['True', "'3.14'", '3.14', '314'],
              2,
              "3.14 is a float because it contains a decimal point. '3.14' is a string (in quotes), 314 is an int, and True is a bool.",
            ),
          ],
        },
        // ── Lesson 4 ─────────────────────────────────────────────────────────
        {
          slug: 'python-comments',
          title: 'Comments in Code',
          description: 'Write comments that explain code without affecting how it runs.',
          estimatedMinutes: 4,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'What is a comment?',
              'A comment is a line Python ignores when running the program. Comments exist for humans — to explain what the code does or why a decision was made. In Python, a comment starts with the # symbol; everything after # on that line is a comment.',
            ),
            analogy(
              'Sticky notes on a recipe',
              'The cooking instructions (the code) stay the same, but the sticky notes help the chef remember why a step is done in a particular way.',
            ),
            code(
              'comments.py',
              `# This program greets the user\nusername = 'Alex'     # store the player name\n\n# Display the greeting\nprint('Hello,', username)`,
            ),
            explanation(
              { line: '# This program greets the user', explanation: "A standalone comment describing the program's purpose." },
              { line: "username = 'Alex'", explanation: 'An inline comment after the code on the same line.' },
              { line: '# Display the greeting', explanation: 'A comment above the print call explaining what follows.' },
              { line: "print('Hello,', username)", explanation: 'The actual code — the comments have no effect on output.' },
            ),
            mistake(
              'Commenting out broken code',
              'Using comments to hide broken or unnecessary code clutters files and confuses other developers. Use comments to explain, not to archive.',
            ),
            quiz(
              'Which line correctly adds a comment in Python?',
              ['// This is a comment', '/* This is a comment */', '# This is a comment', '-- This is a comment'],
              2,
              'Python uses # for single-line comments. // and /* */ are JavaScript/C-family. -- is SQL.',
            ),
          ],
        },
        // ── Lesson 5 ─────────────────────────────────────────────────────────
        {
          slug: 'python-math-operations',
          title: 'Mathematical Operations',
          description: "Arithmetic operators in Python and how each one behaves.",
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'Arithmetic operators',
              'Python supports + - * / for addition, subtraction, multiplication, and division. It also has // (integer division, returns whole number) and % (modulo, returns remainder). Regular division / always returns a float, even when dividing two integers that divide evenly. ** is the exponentiation operator.',
            ),
            analogy(
              'Splitting a pizza',
              'Integer division is like splitting a pizza. If you have 7 slices among 2 people, each gets 3 (7 // 2 = 3) and 1 is left over (7 % 2 = 1).',
            ),
            code(
              'math.py',
              `print(10 + 3)    # 13\nprint(10 - 3)    # 7\nprint(10 * 3)    # 30\nprint(10 / 3)    # 3.3333...\nprint(10 // 3)   # 3\nprint(10 % 3)    # 1\nprint(2 ** 8)    # 256  (exponentiation)`,
            ),
            explanation(
              { line: '10 / 3', explanation: 'Returns a float: 3.3333…' },
              { line: '10 // 3', explanation: 'Returns an int: 3 (whole number division).' },
              { line: '10 % 3', explanation: 'Returns the remainder: 1.' },
              { line: '2 ** 8', explanation: '2 to the power of 8 = 256.' },
            ),
            mistake(
              '/ vs //',
              'Expecting / to behave like //. In Python 3, 10 / 2 returns 5.0 (a float), not 5 (an int). Use // when you need a whole number.',
            ),
            quiz(
              'What does print(17 % 5) output?',
              ['3', '2', '3.4', '0'],
              1,
              '17 divided by 5 equals 3 with a remainder of 2. The modulo operator (%) returns only the remainder.',
            ),
          ],
        },
        // ── Lesson 6 ─────────────────────────────────────────────────────────
        {
          slug: 'python-working-with-text',
          title: 'Working with Text',
          description: 'Strings, concatenation, and formatting dynamic text with f-strings.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'Strings and f-strings',
              "A string is a sequence of characters wrapped in single or double quotes. Concatenation joins two strings using +. The safer and more readable approach for dynamic text is the f-string. An f-string starts with f before the opening quote; expressions inside curly braces {} are evaluated and inserted automatically.",
            ),
            analogy(
              'A form letter',
              "An f-string is like a form letter with blank fields. You write 'Dear ___, you earned ___ XP' and Python fills in the values from your variables.",
            ),
            code(
              'text.py',
              `first = 'Code'\nsecond = 'iqo'\ncombined = first + second\nprint(combined)              # Codiqo\n\nusername = 'Maya'\nxp = 250\nmessage = f'Hello, {username}! You have {xp} XP.'\nprint(message)`,
            ),
            explanation(
              { line: 'combined = first + second', explanation: 'String concatenation joins two strings with +.' },
              { line: "f'Hello, {username}! You have {xp} XP.'", explanation: "An f-string embeds variable values directly into the string." },
              { line: 'print(message)', explanation: 'Output: Hello, Maya! You have 250 XP.' },
            ),
            mistake(
              "Joining a string and a number with +",
              "'Score: ' + 100 raises a TypeError. Use an f-string: f'Score: {100}', or convert: 'Score: ' + str(100).",
            ),
            quiz(
              "Complete the f-string to display 'Level 5 unlocked!' when level = 5:\nprint(f'Level ___ unlocked!')",
              ['5', '{level}', "'level'", 'level'],
              1,
              'Inside an f-string, variable names are placed inside curly braces {}. {level} is replaced by the value 5 at runtime.',
            ),
          ],
        },
        // ── Lesson 7 ─────────────────────────────────────────────────────────
        {
          slug: 'python-user-input',
          title: 'User Input with input()',
          description: "Receive data from the user and convert it to the right type.",
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'input() returns a string',
              "Python's input() function pauses the program, displays an optional prompt, and waits for the user to type something and press Enter. input() always returns the response as a string. To use it as a number, you must convert with int() or float() — this is called type conversion or casting.",
            ),
            analogy(
              'A receptionist with a form',
              'input() is like a receptionist asking a visitor to fill in a form. The visitor always writes in text, even if the answer is a number. Before the information can be used in calculations, someone must convert the written text into usable data.',
            ),
            code(
              'input.py',
              `name = input('What is your name? ')\nprint(f'Welcome, {name}!')\n\nage_text = input('Enter your age: ')\nage = int(age_text)\nprint(f'You will be {age + 1} next year.')`,
            ),
            explanation(
              { line: "input('What is your name? ')", explanation: "Displays the prompt and stores the response as a string in 'name'." },
              { line: 'age_text = input(...)', explanation: 'Stores the raw string input.' },
              { line: 'age = int(age_text)', explanation: 'Converts the string to an integer.' },
              { line: 'age + 1', explanation: 'Uses age in arithmetic — only possible after conversion.' },
            ),
            mistake(
              'Forgetting to convert before arithmetic',
              "If you write age = input('Age: ') and then try age + 1, Python raises a TypeError because you cannot add a string and an integer.",
            ),
            quiz(
              "The user types '30'. What expression prints their age plus 10?\nage = input('Enter age: ')\nprint(___)",
              ['age + 10', "'age' + 10", 'int(age) + 10', 'age * 10'],
              2,
              'input() returns a string. To add 10, you must first convert with int(age). Then int(age) + 10 evaluates to 40.',
            ),
          ],
        },
      ],
    },
    // ── Section 2: Program Logic ───────────────────────────────────────────
    {
      title: 'Program Logic',
      description: 'Conditions, comparisons, and Boolean reasoning — making decisions in code.',
      lessons: [
        {
          slug: 'python-if-else',
          title: 'if / else Conditions',
          description: 'Make a decision based on whether a condition is True or False.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'if and else',
              'An if statement runs its block when the condition is True. An else clause runs when the condition is False — every situation is handled. Indentation defines which code belongs inside each block; it is not optional in Python.',
            ),
            analogy(
              'A gate with a keycard',
              'If your card is valid, the gate opens. If it is not, the gate stays closed and you are redirected. The gate always makes a decision — it never ignores you.',
            ),
            code(
              'if_else.py',
              `score = 85\n\nif score >= 60:\n    print('Lesson passed! +50 XP')\nelse:\n    print('Try again. Keep going!')`,
            ),
            explanation(
              { line: 'score = 85', explanation: 'score holds the value 85.' },
              { line: 'if score >= 60:', explanation: 'Python checks 85 >= 60 — True.' },
              { line: "print('Lesson passed! +50 XP')", explanation: 'Runs because the condition was True.' },
              { line: 'else: ...', explanation: 'Skipped because the condition was True.' },
            ),
            mistake(
              'Forgetting the colon',
              'Forgetting the colon (:) after if or else. Python requires a colon at the end of every conditional header — omitting it causes a SyntaxError.',
            ),
            quiz(
              "Which output does this print?\nlevel = 7\nif level >= 5:\n    print('Access granted')\nelse:\n    print('Access denied')",
              ['Access denied', 'Access granted', 'Both lines', 'Nothing'],
              1,
              '7 >= 5 is True, so the if block runs and prints Access granted. The else block is skipped.',
            ),
          ],
        },
        {
          slug: 'python-elif',
          title: 'elif and Multiple Decisions',
          description: 'Handle three or more outcomes with elif chains.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'elif chains',
              "Python's elif (short for 'else if') adds additional conditions to check in sequence. Python evaluates conditions top to bottom and stops at the first True one. An elif chain should end with a plain else to catch any uncovered case.",
            ),
            analogy(
              'A tiered reward system',
              'If a player earns 100+ XP, they get gold. Else if 50+, silver. Else if 25+, bronze. Otherwise, encouragement. The game checks each tier in order and stops at the first match.',
            ),
            code(
              'elif.py',
              `xp = 70\n\nif xp >= 100:\n    print('Gold rank')\nelif xp >= 50:\n    print('Silver rank')\nelif xp >= 25:\n    print('Bronze rank')\nelse:\n    print('Keep earning XP!')`,
            ),
            explanation(
              { line: 'xp = 70', explanation: 'Python checks 70 >= 100 — False. Moves to next.' },
              { line: 'elif xp >= 50:', explanation: 'Checks 70 >= 50 — True. Prints Silver rank and exits the chain.' },
              { line: 'elif xp >= 25 / else:', explanation: 'Never evaluated once a True branch is found.' },
            ),
            mistake(
              'Wrong condition order',
              'Placing more general conditions before more specific ones. If xp >= 25 comes first, a player with 150 XP matches it and never reaches the gold tier. Order from most specific to least.',
            ),
            quiz(
              "What prints if score = 45?\nif score >= 80: print('A')\nelif score >= 60: print('B')\nelif score >= 40: print('C')\nelse: print('F')",
              ['A', 'B', 'C', 'F'],
              2,
              '45 does not meet >= 80 or >= 60. It does meet >= 40, so Python prints C and exits the chain.',
            ),
          ],
        },
        {
          slug: 'python-comparison-operators',
          title: 'Comparison Operators',
          description: "Python's six comparison operators and the Boolean values they return.",
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'The six operators',
              'Comparison operators always return True or False. Python has six: == (equal), != (not equal), > (greater), < (less), >= (greater or equal), <= (less or equal). The result is what if statements evaluate. The most important distinction: = is assignment, == is comparison.',
            ),
            analogy(
              "A judge's verdict",
              'You present two values, the operator applies the rule, and Python hands down a verdict of True or False. The verdict guides the next move.',
            ),
            code(
              'comparison.py',
              `score = 80\nhigh_score = 100\n\nprint(score == high_score)   # False\nprint(score != high_score)   # True\nprint(score > 50)            # True\nprint(score <= high_score)   # True\nprint(score >= 80)           # True`,
            ),
            explanation(
              { line: 'score == high_score', explanation: 'Checks if 80 equals 100 — it does not, so False.' },
              { line: 'score != high_score', explanation: 'Checks if they differ — they do, so True.' },
              { line: 'score >= 80', explanation: '80 is greater than or equal to 80 — True.' },
            ),
            mistake(
              'Using = where == is needed',
              'Writing if score = 100 instead of if score == 100. A single = is assignment, not comparison. Python raises a SyntaxError to remind you.',
            ),
            quiz(
              "Which operator means 'not equal to' in Python?",
              ['<>', '!=', '=/=', 'not='],
              1,
              "!= is Python's not-equal operator. The condition lives != 0 is True whenever lives is any value other than 0.",
            ),
          ],
        },
        {
          slug: 'python-logical-operators',
          title: 'Logical Operators: and, or, not',
          description: 'Combine multiple conditions into a single logical expression.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'and, or, not',
              "and returns True only if both conditions are True. or returns True if at least one is True. not inverts: not True becomes False, and not False becomes True.",
            ),
            analogy(
              'Keycard, ticket, and toggle',
              "and is like a secure room needing a keycard AND a fingerprint. or is an event that allows entry with a ticket OR an invitation. not is a toggle switch flipping the current state.",
            ),
            code(
              'logic.py',
              `is_logged_in = True\nhas_streak = False\n\nprint(is_logged_in and has_streak)   # False\nprint(is_logged_in or has_streak)    # True\nprint(not is_logged_in)              # False\n\nlevel = 3\nxp = 200\nif level >= 3 and xp >= 150:\n    print('Advanced content unlocked!')`,
            ),
            explanation(
              { line: 'True and False', explanation: 'Evaluates to False — both must be True for and.' },
              { line: 'True or False', explanation: 'Evaluates to True — at least one is True.' },
              { line: 'not True', explanation: 'Evaluates to False — the value is inverted.' },
              { line: 'level >= 3 and xp >= 150', explanation: 'Two conditions checked simultaneously with and.' },
            ),
            mistake(
              "Mixing up 'and' and 'or'",
              "Read the requirement carefully: 'both must be true' means and; 'at least one must be true' means or.",
            ),
            quiz(
              'What does True and (not False) evaluate to?',
              ['True', 'False', 'None', 'Error'],
              0,
              'not False evaluates to True. Then True and True evaluates to True.',
            ),
          ],
        },
        {
          slug: 'python-boolean-values',
          title: 'Boolean Values',
          description: 'True and False as the foundation of decision-making.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'Booleans and truthiness',
              'Boolean is a data type with exactly two values: True and False. Many Python values are automatically treated as True or False in a Boolean context. Zero, empty strings, and empty lists are falsy. Non-zero numbers and non-empty collections are truthy.',
            ),
            analogy(
              'A light switch',
              "A Boolean is like a light switch — either on (True) or off (False). Your program's decisions are controlled by checking which switches are on at any given moment.",
            ),
            code(
              'bool.py',
              `is_completed = True\nis_premium = False\n\nprint(bool(0))       # False\nprint(bool(1))       # True\nprint(bool(''))      # False  (empty string)\nprint(bool('hello')) # True\n\nif is_completed:\n    print('Lesson done! XP awarded.')`,
            ),
            explanation(
              { line: 'bool(0)', explanation: '0 is falsy → False.' },
              { line: "bool('')", explanation: 'Empty string is falsy → False.' },
              { line: "bool('hello')", explanation: 'Non-empty string is truthy → True.' },
              { line: 'if is_completed:', explanation: 'Shorthand for if is_completed == True:.' },
            ),
            mistake(
              'Verbose Boolean checks',
              "Writing if is_completed == True: instead of if is_completed:. Both work, but the shorter form is more Pythonic. Worse: if is_completed == False: — use if not is_completed: instead.",
            ),
            quiz(
              'In Python, the value 0 is treated as False in a Boolean context — true or false?',
              ['True — 0 is treated as False', 'False — 0 is treated as True'],
              0,
              'Python treats 0, empty strings, empty lists, and None as falsy. Any non-zero number, non-empty string, or non-empty collection is truthy.',
            ),
          ],
        },
        {
          slug: 'python-score-calculator-mini',
          title: 'Mini Project: Simple Score Calculator',
          description: 'Combine variables, arithmetic, input, and conditions in one interactive program.',
          estimatedMinutes: 15,
          xpReward: 50,
          difficulty: LessonDifficulty.BEGINNER,
          blocks: [
            theory(
              'Input → process → output',
              'This mini project brings together everything from the Beginner level. The pattern — input, process, output with conditions — is the foundation of almost every interactive application. The learner enters their number of correct answers; the program calculates a percentage, assigns XP, and decides whether the quiz was passed.',
            ),
            analogy(
              "Codiqo's lesson grader",
              'This project is a miniature version of what Codiqo does when you finish a lesson quiz. Behind the scenes, the platform receives your answers, calculates a result, decides whether you passed, and awards XP.',
            ),
            code(
              'score.py',
              `# Codiqo Quiz Score Calculator\ntotal = int(input('Total questions: '))\ncorrect = int(input('Correct answers: '))\n\npercentage = (correct / total) * 100\nprint(f'Score: {percentage:.1f}%')\n\nif percentage >= 80:\n    xp = 100\n    print('Excellent! +100 XP')\nelif percentage >= 60:\n    xp = 60\n    print('Good job! +60 XP')\nelse:\n    xp = 20\n    print('Keep practicing! +20 XP')`,
            ),
            explanation(
              { line: 'int(input(...))', explanation: 'Accepts two integers from the user — convert immediately to avoid string math.' },
              { line: '(correct / total) * 100', explanation: 'Calculates the percentage score.' },
              { line: '{percentage:.1f}%', explanation: 'Displays it with one decimal place using format spec.' },
              { line: 'if/elif/else', explanation: 'Awards XP based on performance tier.' },
            ),
            mistake(
              'Dividing strings',
              'Dividing before converting to int. If total and correct are still strings from input(), the division raises a TypeError. Always convert immediately with int().',
            ),
            quiz(
              "How would you also print 'Perfect score!' when the percentage is exactly 100?",
              [
                "Add elif percentage == 100 inside the existing chain",
                "Add a separate if percentage == 100: print('Perfect score!') statement",
                "Change the last else to elif percentage == 100",
                "Remove the existing chain and use a single if",
              ],
              1,
              "A separate if statement (not elif) means it runs independently — both 'Perfect score!' and the tier message can trigger together.",
            ),
          ],
        },
      ],
    },
    // ── Section 3: Data Collections ────────────────────────────────────────
    {
      title: 'Data Collections',
      description: 'Lists, dictionaries, tuples, sets, and the loops that traverse them.',
      lessons: [
        {
          slug: 'python-lists',
          title: 'Lists',
          description: 'Ordered, mutable collections that hold any kind of data.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'What is a list?',
              'A list is an ordered collection of values stored under a single name. Lists are defined with square brackets [], items separated by commas. Lists preserve order — the first item stays first unless explicitly moved. Lists can grow or shrink while a program runs and can hold any mix of data types.',
            ),
            analogy(
              'A numbered playlist',
              'Each track has a position; you can add new songs, remove old ones, or rearrange them. The playlist remembers every entry and its place.',
            ),
            code(
              'lists.py',
              `lessons = ['Variables', 'Data Types', 'Comments', 'print()']\nscores = [85, 92, 78, 100, 67]\nmixed = ['Maya', 3, True, 9.5]\n\nprint(lessons)          # entire list\nprint(len(scores))      # 5 — number of items`,
            ),
            explanation(
              { line: 'lessons = [...]', explanation: 'A list of strings.' },
              { line: 'mixed = [...]', explanation: 'A list mixing different data types — Python allows this.' },
              { line: 'len(scores)', explanation: 'Returns the number of items in the list.' },
            ),
            mistake(
              'Lists vs strings',
              "len(['hello']) returns 1 (one item in the list); len('hello') returns 5 (five characters in the string). They are not the same.",
            ),
            quiz(
              "What does len(['apple', 'banana', 'cherry']) return?",
              ['19 (total characters)', '3 (number of items)', '0 (empty)', 'Error'],
              1,
              'len() counts items in the list, not characters in strings. There are 3 items.',
            ),
          ],
        },
        {
          slug: 'python-indexes-and-slices',
          title: 'Indexes and Slices',
          description: 'Access individual items with indexes and extract ranges with slices.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Zero-based indexing and slicing',
              'Every item has a position called an index. Python indexes start at 0. Negative indexes count from the end: -1 is the last item, -2 the second to last. Slicing extracts a portion using list[start:end] — the slice includes start up to (but not including) end.',
            ),
            analogy(
              'Cinema seat numbers',
              "If the first row is row 0, seat 0 is the leftmost seat. Slicing is like booking a range of seats — 'give me seats 2 through 5' — counted from the start up to but not including the end.",
            ),
            code(
              'index.py',
              `lessons = ['print()', 'Variables', 'Data Types', 'Comments', 'Math']\n\nprint(lessons[0])      # print()\nprint(lessons[2])      # Data Types\nprint(lessons[-1])     # Math  (last item)\n\nprint(lessons[1:4])    # ['Variables', 'Data Types', 'Comments']\nprint(lessons[:3])     # first 3 items\nprint(lessons[2:])     # from index 2 to end`,
            ),
            explanation(
              { line: 'lessons[0]', explanation: 'Accesses the first item.' },
              { line: 'lessons[-1]', explanation: 'Accesses the last item without needing the length.' },
              { line: 'lessons[1:4]', explanation: 'Returns items at indexes 1, 2, 3 — not 4.' },
            ),
            mistake(
              'Off-by-one errors',
              'Indexing starts at 0, so lessons[5] on a 5-item list raises an IndexError. The last valid index is len(list) - 1.',
            ),
            quiz(
              'What does this print?\nscores = [70, 85, 90, 55, 100]\nprint(scores[-2])',
              ['55', '100', '90', '85'],
              0,
              'Negative indexes count from the end. -1 is 100, -2 is 55.',
            ),
          ],
        },
        {
          slug: 'python-list-methods',
          title: 'List Methods',
          description: 'Mutate lists with append, remove, pop, insert, sort, and reverse.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Mutating list methods',
              'append() adds to the end. remove() deletes a specific value. pop() removes by index and returns it. insert() adds at a specific position. These methods mutate the original list — they do not create a new one. sort() and reverse() reorder items in place.',
            ),
            analogy(
              'Music queue controls',
              'append() adds a song to the end. insert() puts a song at a specific position. remove() deletes a track by name. pop() removes the last item and hands it back to you.',
            ),
            code(
              'methods.py',
              `achievements = ['first_login', 'lesson_1']\n\nachievements.append('streak_3')\nprint(achievements)    # adds to end\n\nachievements.insert(1, 'quiz_pass')\nprint(achievements)    # inserts at index 1\n\nachievements.remove('first_login')\nprint(achievements)    # removes by value\n\nlast = achievements.pop()\nprint(last)            # removed item returned`,
            ),
            explanation(
              { line: "append('streak_3')", explanation: "Adds 'streak_3' to the end of the list." },
              { line: "insert(1, 'quiz_pass')", explanation: 'Places the value at index 1, shifting others right.' },
              { line: "remove('first_login')", explanation: "Finds and deletes the first occurrence." },
              { line: 'pop()', explanation: 'Removes and returns the last item by default.' },
            ),
            mistake(
              'Removing values that do not exist',
              "Calling remove() with a value that is not in the list raises a ValueError. Check first with: if 'item' in my_list: before removing.",
            ),
            quiz(
              "Which line adds 'badge_gold' to the end of the achievements list?",
              [
                "achievements.add('badge_gold')",
                "achievements.append('badge_gold')",
                "achievements.push('badge_gold')",
                "achievements.insert('badge_gold')",
              ],
              1,
              'append() is the standard method for adding a single item to the end of a list.',
            ),
          ],
        },
        {
          slug: 'python-for-loop',
          title: 'for Loop',
          description: 'Repeat an action for every item in a collection.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Iterating with for',
              'A for loop iterates over a sequence — a list, string, or range — running its block once per item. The loop variable takes on each value in turn. range(5) produces 0, 1, 2, 3, 4 and is commonly used when you need a specific number of repetitions.',
            ),
            analogy(
              'Calling out attendance',
              'A for loop is like a teacher calling out names on an attendance list. For each name, they call it out and mark it. They just work through the list until it is done.',
            ),
            code(
              'for.py',
              `lessons = ['Variables', 'Loops', 'Functions']\n\nfor lesson in lessons:\n    print(f'Studying: {lesson}')\n\n# Loop with range\nfor i in range(3):\n    print(f'Round {i + 1}')`,
            ),
            explanation(
              { line: 'for lesson in lessons:', explanation: "lesson takes the value of each item in 'lessons' in turn." },
              { line: "print(f'Studying: {lesson}')", explanation: 'Runs once per item, printing each lesson name.' },
              { line: 'range(3)', explanation: 'Generates 0, 1, 2. i + 1 displays as 1, 2, 3.' },
            ),
            mistake(
              'Modifying a list while iterating',
              'This causes unpredictable behavior. If you need to modify a list while looping, iterate over a copy: for item in lessons[:].',
            ),
            quiz(
              "What value does total hold after this loop?\nscores = [80, 90, 70]\ntotal = 0\nfor s in scores:\n    total += s",
              ['170', '240', '0', '80'],
              1,
              '0 + 80 + 90 + 70 = 240. The accumulator pattern adds each score into total.',
            ),
          ],
        },
        {
          slug: 'python-while-loop',
          title: 'while Loop',
          description: 'Repeat code based on a condition — and avoid infinite loops.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'while continues until False',
              'A while loop repeats as long as its condition stays True. Useful when you do not know in advance how many repetitions you need. Critical: something inside the loop must eventually make the condition False, or the loop runs forever — an infinite loop.',
            ),
            analogy(
              'A vending machine',
              "A while loop is like a vending machine waiting for the right amount of money. It keeps asking 'has enough been inserted?' until the condition is finally met.",
            ),
            code(
              'while.py',
              `attempts = 0\nmax_attempts = 3\n\nwhile attempts < max_attempts:\n    print(f'Attempt {attempts + 1}')\n    attempts += 1\n\nprint('Done!')`,
            ),
            explanation(
              { line: 'while attempts < max_attempts:', explanation: 'Condition checks if attempts is less than 3.' },
              { line: 'attempts += 1', explanation: 'Increments the counter each iteration — eventually makes the condition False.' },
              { line: "print('Done!')", explanation: 'Runs after the loop finishes.' },
            ),
            mistake(
              'Forgetting to update the condition',
              'If attempts += 1 is missing, the loop checks 0 < 3 forever — an infinite loop. Always ensure something changes inside the loop.',
            ),
            quiz(
              "What does this code print?\nx = 5\nwhile x > 0:\n    print(x)\n    x -= 2\nprint('done')",
              ['5, 3, 1, done', '5, 3, done', '5, 4, 3, 2, 1, done', 'Infinite loop'],
              0,
              '5 → 3 → 1 → -1. When x reaches -1, the condition is False and the loop exits, then done prints.',
            ),
          ],
        },
        {
          slug: 'python-dictionaries',
          title: 'Dictionaries',
          description: 'Key-value pairs for organizing named data.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Key-value collections',
              "A dictionary stores data as key-value pairs. Defined with curly braces {}, each pair written as key: value. Keys must be unique. You access a value with dict['key']. The get() method is safer — it returns None (or a default) instead of raising KeyError if the key is missing.",
            ),
            analogy(
              'A user profile page',
              "Instead of data[0] and data[1], you access profile['name'] and profile['xp']. The keys are labels that make the data self-describing.",
            ),
            code(
              'dict.py',
              `user = {\n    'username': 'Maya',\n    'xp': 350,\n    'level': 4,\n    'is_premium': True\n}\n\nprint(user['username'])        # Maya\nprint(user.get('streak', 0))   # 0 (key missing, default returned)\n\nuser['xp'] += 50               # update value\nuser['badge'] = 'gold'         # add new key\ndel user['is_premium']         # remove key`,
            ),
            explanation(
              { line: "user['username']", explanation: "Retrieves the value associated with the key 'username'." },
              { line: "get('streak', 0)", explanation: "Safely returns 0 if 'streak' does not exist." },
              { line: "user['badge'] = 'gold'", explanation: 'Adds a new key/value pair.' },
              { line: "del user['is_premium']", explanation: 'Removes a key from the dictionary.' },
            ),
            mistake(
              'KeyError on missing keys',
              "Using a key that doesn't exist with bracket notation. user['streak'] raises KeyError if 'streak' isn't there. Use user.get('streak', 0) for a safe default.",
            ),
            quiz(
              "Which expression retrieves the player's level?\nplayer = {'name': 'Alex', 'level': 7, 'xp': 500}",
              ['player.level', "player['level']", "player(level)", "player[level]"],
              1,
              "Dictionary keys are accessed with bracket notation and the key in quotes (when the key is a string): player['level'].",
            ),
          ],
        },
        {
          slug: 'python-tuples',
          title: 'Tuples',
          description: 'Ordered, immutable collections — fixed grouped data.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Tuples are immutable',
              'A tuple is similar to a list but immutable — once created, contents cannot change. Defined with parentheses (). You can index, slice, and measure length, but cannot add, remove, or modify items. Use tuples for data that should remain constant: coordinates, color values, settings.',
            ),
            analogy(
              'A published ISBN',
              'A tuple is like a published book\'s ISBN and title — fixed facts that should never change. A list is like a to-do list you update regularly.',
            ),
            code(
              'tuples.py',
              `coordinates = (51.5074, -0.1278)   # London lat/lon\nrgb_red = (255, 0, 0)\n\nprint(coordinates[0])   # 51.5074\nprint(len(rgb_red))     # 3\n\n# Tuples support unpacking\nlat, lon = coordinates\nprint(f'Latitude: {lat}')`,
            ),
            explanation(
              { line: 'coordinates = (...)', explanation: 'Tuples look like lists but use parentheses.' },
              { line: 'coordinates[0], len(rgb_red)', explanation: 'Indexing and len() work the same as with lists.' },
              { line: 'lat, lon = coordinates', explanation: 'Tuple unpacking assigns each value to a separate variable in one line.' },
            ),
            mistake(
              'Modifying a tuple',
              'Writing coordinates[0] = 48.8 raises a TypeError because tuples are immutable. If you need to change values, use a list instead.',
            ),
            quiz(
              'Which statement about tuples is correct?',
              [
                'Tuples use square brackets []',
                'Tuples can be modified after creation',
                'Tuples are immutable — values cannot be changed',
                'Tuples cannot be indexed',
              ],
              2,
              'Tuples use parentheses () and are immutable. They support indexing, slicing, and len() just like lists.',
            ),
          ],
        },
        {
          slug: 'python-sets',
          title: 'Sets',
          description: 'Unordered collections of unique values — fast membership checks.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Unique, unordered',
              'A set is an unordered collection of unique values. Defined with {} or set(). Cannot contain duplicates — adding the same value twice keeps only one copy. Cannot index by position. Sets are extremely fast for membership testing (in) and for removing duplicates from a list.',
            ),
            analogy(
              'A guest list',
              'A set is like a guest list where each person can only appear once. Adding someone twice has no effect.',
            ),
            code(
              'sets.py',
              `completed = {'lesson_1', 'lesson_2', 'lesson_3'}\ncompleted.add('lesson_4')\ncompleted.add('lesson_1')   # duplicate — ignored\n\nprint(len(completed))       # still 4\nprint('lesson_2' in completed)   # True\n\n# Deduplicate a list\nscores = [85, 90, 85, 70, 90]\nunique_scores = set(scores)\nprint(unique_scores)        # {85, 90, 70}`,
            ),
            explanation(
              { line: "completed.add('lesson_1')", explanation: 'Has no effect — duplicates are silently ignored.' },
              { line: "'lesson_2' in completed", explanation: 'Membership check is O(1) — extremely fast regardless of size.' },
              { line: 'set(scores)', explanation: 'Converting a list to a set removes all duplicate values.' },
            ),
            mistake(
              'Expecting ordered output',
              'Sets are unordered — print() may display items in any order. If order matters, use a list instead.',
            ),
            quiz(
              "What is len(s) after this?\ns = {1, 2, 3}\ns.add(2)\ns.add(4)",
              ['3', '4', '5', 'Error'],
              1,
              'Adding 2 has no effect (duplicate). Adding 4 brings the count to 4 unique values: {1, 2, 3, 4}.',
            ),
          ],
        },
      ],
    },
    // ── Section 4: Functions and Code Structure ────────────────────────────
    {
      title: 'Functions and Code Structure',
      description: 'Reusable named blocks of code — define them, parameterize them, return values, and handle errors.',
      lessons: [
        {
          slug: 'python-what-is-function',
          title: 'What is a Function?',
          description: 'Reusable named blocks of code that perform a specific task.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'def keyword',
              "A function is a named block of code that performs a task. Defined using def, followed by the function name, parentheses, and a colon. The body is indented. Benefits: less repetition (DRY), better readability, easier testing.",
            ),
            analogy(
              'A recipe',
              "A function is like a recipe. You write it once — 'bake a cake: mix, pour, bake 35 minutes'. Then whenever you want a cake, you follow the recipe instead of reinventing it.",
            ),
            code(
              'function.py',
              `def greet_user():\n    print('Welcome to Codiqo!')\n    print('Start your learning streak today.')\n\n# Call the function\ngreet_user()\ngreet_user()   # call it again — no rewriting needed`,
            ),
            explanation(
              { line: 'def greet_user():', explanation: 'Defines the function. Nothing runs yet.' },
              { line: 'indented body', explanation: 'Only runs when the function is called.' },
              { line: 'greet_user()', explanation: 'Calls the function and executes its body.' },
            ),
            mistake(
              'Defining without calling',
              'A function definition only stores the code — it does not execute it. You must call the function by writing its name followed by parentheses.',
            ),
            quiz(
              "Which keyword defines a function in Python?",
              ['function', 'def', 'fun', 'func'],
              1,
              'def is the keyword used to define a function. Without it, Python raises a SyntaxError.',
            ),
          ],
        },
        {
          slug: 'python-function-parameters',
          title: 'Function Parameters',
          description: 'Make functions flexible by accepting input values.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Parameters and arguments',
              'Parameters are variables listed inside the parentheses of a function definition — placeholders for the values that will be passed in. The values supplied at call time are arguments. Functions can have multiple parameters and default values: a parameter with a default is optional.',
            ),
            analogy(
              'A coffee order form',
              'The form has fields: size, milk type, extra shots. Each time someone fills in the form, the barista uses those specific values to make that customer\'s drink. The form is the function; the filled values are the arguments.',
            ),
            code(
              'parameters.py',
              `def award_xp(username, xp_earned):\n    print(f'{username} earned {xp_earned} XP!')\n\naward_xp('Maya', 50)\naward_xp('Alex', 100)\n\n# Default parameter\ndef level_up(username, new_level=1):\n    print(f'{username} reached level {new_level}')\n\nlevel_up('Sam')        # uses default: level 1\nlevel_up('Sam', 5)     # overrides default: level 5`,
            ),
            explanation(
              { line: 'def award_xp(username, xp_earned):', explanation: 'Two parameters — both required.' },
              { line: "award_xp('Maya', 50)", explanation: 'Each call passes different arguments, producing a different message.' },
              { line: 'new_level=1', explanation: 'Default — used if the caller does not provide that argument.' },
            ),
            mistake(
              'Wrong argument order',
              "award_xp(50, 'Maya') would assign 50 to username and 'Maya' to xp_earned. Python matches arguments to parameters by position.",
            ),
            quiz(
              "What does this print?\ndef greet(name, points=10):\n    print(f'{name}: {points} pts')\ngreet('Leo')",
              ['Leo: pts', 'Leo: 10 pts', 'Error — points not provided', 'Leo: 0 pts'],
              1,
              "Since no argument is provided for points, Python uses the default value of 10. Output: 'Leo: 10 pts'.",
            ),
          ],
        },
        {
          slug: 'python-return-statement',
          title: 'return',
          description: 'Send results back from a function so they can be reused.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'return vs print',
              'A function with only print() shows output but does not produce a value you can use elsewhere. return exits the function and sends a value back to the caller. The caller can assign it, use it in expressions, or pass it on. print() is for humans; return is for the program.',
            ),
            analogy(
              'Calculating the tip',
              'If a friend says the number out loud, only people nearby hear it (print). If they write it on a piece of paper and hand it back, you can use it — add it to the total, save it, or pass it on (return).',
            ),
            code(
              'return.py',
              `def calculate_xp(correct, total):\n    percentage = (correct / total) * 100\n    return percentage\n\nresult = calculate_xp(8, 10)\nprint(f'You scored {result}%')\n\n# Use returned value in another calculation\nbonus = calculate_xp(8, 10) * 2\nprint(f'Bonus XP: {bonus}')`,
            ),
            explanation(
              { line: 'return percentage', explanation: 'Sends the value back to wherever the function was called.' },
              { line: 'result = calculate_xp(8, 10)', explanation: 'The returned value (80.0) is stored in result.' },
              { line: 'calculate_xp(8, 10) * 2', explanation: 'Returned value used directly in arithmetic.' },
            ),
            mistake(
              'Discarding the return value',
              'Calling calculate_xp(8, 10) without capturing the result means the value is calculated and immediately thrown away.',
            ),
            quiz(
              "What does this code print?\ndef double(n):\n    return n * 2\nx = double(7)\nprint(x + 1)",
              ['14', '15', '7', 'Error'],
              1,
              'double(7) returns 14. x + 1 is 14 + 1 = 15.',
            ),
          ],
        },
        {
          slug: 'python-scope',
          title: 'Scope',
          description: 'Where variables can and cannot be accessed.',
          estimatedMinutes: 5,
          xpReward: 10,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Local vs global',
              "A variable created inside a function has local scope — it only exists within that function and is destroyed when the function returns. A variable at the top level of a script has global scope. Reading a global from inside a function works; modifying it requires the global keyword.",
            ),
            analogy(
              'Lobby and private offices',
              'Variables in the lobby (global) are visible to everyone. Variables in a private office (local) are only visible inside that room. People in offices can read the lobby noticeboard, but cannot change it without authorization.',
            ),
            code(
              'scope.py',
              `platform = 'Codiqo'   # global variable\n\ndef show_info():\n    level = 5          # local variable\n    print(platform)    # can read global\n    print(level)\n\nshow_info()\nprint(platform)        # global — accessible\n# print(level)         # ERROR: level not defined here`,
            ),
            explanation(
              { line: 'platform = ...', explanation: 'Global variable — accessible inside and outside functions.' },
              { line: 'level = 5 (inside)', explanation: "Local variable — only exists inside show_info()." },
              { line: 'print(level) outside', explanation: 'Raises a NameError — local variables don\'t exist outside their function.' },
            ),
            mistake(
              'Expecting locals to leak',
              'Creating a variable inside a function and expecting to use it outside. Local variables are invisible outside their function. Return the value if you need it elsewhere.',
            ),
            quiz(
              'What happens if you try to access a local variable outside the function that created it?',
              ['It returns None', 'It raises a NameError', 'It returns 0', 'It works fine'],
              1,
              "Local variables only exist within their function. Accessing them outside raises a NameError: name 'variable' is not defined.",
            ),
          ],
        },
        {
          slug: 'python-try-except',
          title: 'Error Handling with try / except',
          description: 'Prevent program crashes by handling exceptions gracefully.',
          estimatedMinutes: 7,
          xpReward: 15,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'Catching exceptions',
              'When Python encounters an error, it raises an exception. Without handling, the exception crashes the program. A try/except block lets you intercept exceptions before they crash. Code that might fail goes in try; if an exception occurs, Python jumps to the matching except block. Catch specific exception types like ValueError or ZeroDivisionError — bare except: is bad practice.',
            ),
            analogy(
              'A safety net',
              'try/except is like a safety net under a tightrope walker. The performer attempts the crossing (try). If they fall, the net catches them (except) safely.',
            ),
            code(
              'try_except.py',
              `try:\n    age = int(input('Enter your age: '))\n    print(f'You are {age} years old.')\nexcept ValueError:\n    print('Please enter a valid number.')\n\n# Multiple except blocks\ntry:\n    result = 10 / int(input('Divisor: '))\n    print(result)\nexcept ValueError:\n    print('Not a number!')\nexcept ZeroDivisionError:\n    print('Cannot divide by zero!')`,
            ),
            explanation(
              { line: "int(input(...))", explanation: "If the input is 'hello', a ValueError occurs." },
              { line: 'except ValueError:', explanation: 'Instead of crashing, Python runs this block.' },
              { line: 'except ZeroDivisionError:', explanation: 'Multiple except blocks handle different exception types independently.' },
            ),
            mistake(
              'Bare except',
              'Catching Exception or using bare except: without logging. This swallows all errors silently, making debugging extremely difficult. Always catch specific exceptions.',
            ),
            quiz(
              "The user types 'abc' when a number is expected. Which except block catches the error?\ntry:\n    x = int(input('Number: '))\nexcept ___:\n    print('Invalid input')",
              ['ZeroDivisionError', 'TypeError', 'ValueError', 'IndexError'],
              2,
              "int('abc') raises a ValueError because 'abc' cannot be converted to an integer.",
            ),
          ],
        },
        {
          slug: 'python-xp-tracker-mini',
          title: 'Mini Project: User XP Tracker',
          description: 'Combine functions, dictionaries, conditions, and error handling.',
          estimatedMinutes: 20,
          xpReward: 75,
          difficulty: LessonDifficulty.INTERMEDIATE,
          blocks: [
            theory(
              'XP tracker pattern',
              "This mini project consolidates Intermediate concepts. You'll create a system that stores user XP in a dictionary, provides functions to award XP and check level. The pattern — data in a structure, operations as functions, input validated — is the foundation of professional development.",
            ),
            analogy(
              "Codiqo's backend",
              "This is a simplified version of Codiqo's own backend. When you complete a lesson, the platform updates your XP, checks if you leveled up, and displays a result. You're now building that logic from scratch.",
            ),
            code(
              'tracker.py',
              `users = {}\n\ndef add_user(name):\n    users[name] = {'xp': 0, 'level': 1}\n\ndef award_xp(name, amount):\n    if name not in users:\n        print('User not found.')\n        return\n    users[name]['xp'] += amount\n    check_level(name)\n\ndef check_level(name):\n    xp = users[name]['xp']\n    users[name]['level'] = xp // 100 + 1\n    print(f"{name}: {xp} XP — Level {users[name]['level']}")\n\nadd_user('Maya')\naward_xp('Maya', 120)\naward_xp('Maya', 50)`,
            ),
            explanation(
              { line: 'users = {}', explanation: 'Global dictionary mapping names to profile dicts.' },
              { line: 'add_user(name)', explanation: 'Initializes a new user with 0 XP and level 1.' },
              { line: 'award_xp(name, amount)', explanation: 'Validates the user exists, adds XP, then calls check_level.' },
              { line: 'check_level(name)', explanation: 'Recalculates and displays the current level (every 100 XP = 1 level).' },
            ),
            mistake(
              'Skipping existence checks',
              "Not checking if the user exists before accessing users[name]. Accessing a missing key raises a KeyError. Always validate first with if name not in users.",
            ),
            quiz(
              "What does this function do?\ndef show_all_users():\n    for name, data in users.items():\n        print(f\"{name}: {data['xp']} XP, Level {data['level']}\")",
              [
                "Lists all users with their XP and level",
                "Adds a new user to the system",
                "Removes inactive users",
                "Sorts users by XP",
              ],
              0,
              "dict.items() returns key-value pairs. Each pair is unpacked into name and data, then displayed.",
            ),
          ],
        },
      ],
    },
    // ── Section 5: Writing Code Like a Developer ───────────────────────────
    {
      title: 'Writing Code Like a Developer',
      description: 'Comprehensions, lambdas, files, modules, and the basics of object-oriented Python.',
      lessons: [
        {
          slug: 'python-list-comprehension',
          title: 'List Comprehension',
          description: 'Concise list transformations and filtering in one line.',
          estimatedMinutes: 10,
          xpReward: 20,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'Comprehensions',
              "List comprehension is a compact way to create a new list by transforming or filtering an iterable. Syntax: [expression for item in iterable] or [expression for item in iterable if condition]. Valued for readability when the transformation is simple. For complex multi-step logic, a regular for loop is often clearer.",
            ),
            analogy(
              'A factory conveyor belt with a filter',
              'Items go in, a transformation is applied to each one that passes the filter, and the processed items come out as a new collection — all in one automated pass.',
            ),
            code(
              'comprehension.py',
              `scores = [45, 82, 91, 38, 76, 60]\n\n# Regular loop approach\npassing = []\nfor s in scores:\n    if s >= 60:\n        passing.append(s)\n\n# List comprehension — same result\npassing = [s for s in scores if s >= 60]\nprint(passing)    # [82, 91, 76, 60]\n\n# Transform: multiply each score by 1.1\nboosted = [round(s * 1.1) for s in scores]\nprint(boosted)`,
            ),
            explanation(
              { line: 'Traditional loop', explanation: 'Filters and builds a list manually.' },
              { line: '[s for s in scores if s >= 60]', explanation: 'Equivalent list comprehension — more concise.' },
              { line: '[round(s * 1.1) for s in scores]', explanation: 'Transforms every score — no if needed.' },
            ),
            mistake(
              'Over-using comprehensions',
              'When the expression grows long with multiple conditions or nested operations, a regular loop is more readable and maintainable.',
            ),
            quiz(
              "What does this print?\nwords = ['hello', 'world', 'codiqo']\nresult = [w.upper() for w in words if len(w) > 5]\nprint(result)",
              ["['HELLO', 'WORLD', 'CODIQO']", "['CODIQO']", "['WORLD', 'CODIQO']", "['HELLO', 'CODIQO']"],
              1,
              "Only 'codiqo' has more than 5 characters. 'hello' and 'world' each have 5, which doesn't satisfy len(w) > 5.",
            ),
          ],
        },
        {
          slug: 'python-lambda-functions',
          title: 'Lambda Functions',
          description: 'Concise anonymous functions for transformations and sorting.',
          estimatedMinutes: 10,
          xpReward: 20,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'Anonymous functions',
              "A lambda is a small, anonymous function defined in a single line using the lambda keyword. Syntax: lambda parameters: expression. Lambdas are not meant to replace full functions — they're used for short, throwaway functions, most often as arguments to sorted(), map(), or filter(). Limited to a single expression.",
            ),
            analogy(
              'A sticky note instruction',
              "Rather than a printed manual. If someone asks you to sort cards by number, you don't write a procedure — you say 'by number'. That quick instruction is the lambda.",
            ),
            code(
              'lambda.py',
              `# Regular function\ndef double(x):\n    return x * 2\n\n# Equivalent lambda\ndouble = lambda x: x * 2\nprint(double(5))    # 10\n\n# Lambda in sorted()\nusers = [('Maya', 350), ('Alex', 500), ('Sam', 200)]\nsorted_users = sorted(users, key=lambda u: u[1])\nprint(sorted_users)    # sorted by XP ascending`,
            ),
            explanation(
              { line: 'def double(x): vs lambda x: x * 2', explanation: 'Both define identical functions — one with def, one with lambda.' },
              { line: 'sorted(..., key=lambda u: u[1])', explanation: 'Uses the lambda to extract the XP value as the sort key.' },
              { line: 'tuple comparison by second element', explanation: 'Each user tuple is compared by XP instead of name.' },
            ),
            mistake(
              'Lambdas with complex logic',
              'Lambda accepts only one expression — no if/else blocks, no multiple lines. For anything beyond a simple transformation, use def.',
            ),
            quiz(
              "What does this print?\nf = lambda x, y: x ** y\nprint(f(2, 10))",
              ['20', '12', '1024', 'Error'],
              2,
              'The lambda raises x to the power of y. 2 ** 10 = 1024.',
            ),
          ],
        },
        {
          slug: 'python-map-filter-sorted',
          title: 'map, filter, sorted',
          description: "Python's built-in functional tools for transforming data.",
          estimatedMinutes: 10,
          xpReward: 20,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'Functional helpers',
              'map(function, iterable) applies a function to every item. filter(function, iterable) keeps items for which the function returns True. sorted(iterable, key=..., reverse=...) returns a new sorted list without modifying the original. The key parameter accepts a function (often a lambda) that extracts the comparison value.',
            ),
            analogy(
              'Assembly line, quality check, distribution center',
              'map is an assembly line that transforms each product. filter is a quality check that keeps only passing items. sorted is a distribution center that arranges products before shipping.',
            ),
            code(
              'functional.py',
              `scores = [45, 82, 91, 38, 76]\n\n# map — apply a function to every item\nboosted = list(map(lambda s: round(s * 1.1), scores))\nprint(boosted)\n\n# filter — keep items matching a condition\npassing = list(filter(lambda s: s >= 60, scores))\nprint(passing)    # [82, 91, 76]\n\n# sorted — order without modifying original\ntop = sorted(scores, reverse=True)\nprint(top)        # descending`,
            ),
            explanation(
              { line: 'list(map(...))', explanation: 'map() returns an iterator — wrap with list() to see the results.' },
              { line: 'list(filter(...))', explanation: 'filter() also returns an iterator. Lazy evaluation.' },
              { line: 'sorted(reverse=True)', explanation: 'Orders from highest to lowest, returns a new list.' },
            ),
            mistake(
              'Forgetting list()',
              'Without list(), you get a map or filter object, not a list. These objects are lazy — they only compute values when iterated.',
            ),
            quiz(
              'Which built-in keeps only items where a function returns True?',
              ['map()', 'filter()', 'sorted()', 'reduce()'],
              1,
              'filter() selects items where the function returns True. map() transforms; sorted() orders.',
            ),
          ],
        },
        {
          slug: 'python-working-with-files',
          title: 'Working with Files',
          description: 'Read and write text files safely with the with statement.',
          estimatedMinutes: 10,
          xpReward: 20,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'open() and with',
              "Python reads and writes files with open(filename, mode). Modes: 'r' read, 'w' write (overwrites), 'a' append, 'rb'/'wb' binary. The with statement is recommended — it automatically closes the file when the block exits, even if an error occurs. file.read() returns the entire content; iterating over the file yields lines.",
            ),
            analogy(
              'A library with auto-return',
              'Opening a file without with is like checking out a library book and forgetting to return it. The with statement is a library system that automatically reclaims the book when you are done.',
            ),
            code(
              'files.py',
              `# Write to a file\nwith open('progress.txt', 'w') as f:\n    f.write('Maya: Level 4, 350 XP\\n')\n    f.write('Alex: Level 6, 580 XP\\n')\n\n# Read from a file\nwith open('progress.txt', 'r') as f:\n    content = f.read()\n    print(content)\n\n# Read line by line\nwith open('progress.txt', 'r') as f:\n    for line in f:\n        print(line.strip())`,
            ),
            explanation(
              { line: "open('progress.txt', 'w')", explanation: "Creates the file (or overwrites it). 'as f' gives it the alias f." },
              { line: 'f.write(...)', explanation: 'Writes strings. \\n adds a newline character.' },
              { line: 'f.read()', explanation: 'Returns the entire content as a string.' },
              { line: 'for line in f', explanation: 'Iterates one line at a time. strip() removes trailing whitespace.' },
            ),
            mistake(
              "Wrong mode",
              "Using 'w' when you want to add to an existing file. 'w' deletes all existing content before writing. Use 'a' (append) to add without erasing.",
            ),
            quiz(
              "Which mode opens a file for appending without erasing existing content?\nwith open('log.txt', ___) as f:",
              ["'r'", "'w'", "'a'", "'b'"],
              2,
              "'a' opens in append mode. New data is added to the end. 'w' would erase the file before writing.",
            ),
          ],
        },
        {
          slug: 'python-modules-and-imports',
          title: 'Modules and Imports',
          description: "Organize code into modules and use Python's standard library.",
          estimatedMinutes: 10,
          xpReward: 20,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'import',
              "As programs grow, splitting code into modules (separate .py files) keeps it manageable. import module_name loads a module — call its contents with module_name.function_name. from module_name import function_name imports a specific item directly. The standard library provides math, random, datetime, os, json and more.",
            ),
            analogy(
              'Specialized toolboxes',
              'Modules are specialized toolboxes. Instead of carrying every tool in your pockets, you store them in labeled boxes and grab the right one when needed. import opens a toolbox.',
            ),
            code(
              'imports.py',
              `import math\nimport random\nfrom datetime import datetime\n\nprint(math.sqrt(144))      # 12.0\nprint(math.pi)             # 3.14159...\n\nxp_bonus = random.randint(10, 50)\nprint(f'Bonus XP: {xp_bonus}')\n\nnow = datetime.now()\nprint(f'Session started: {now.strftime("%H:%M")}')`,
            ),
            explanation(
              { line: 'import math', explanation: 'Gives access to all functions in the math module.' },
              { line: 'from datetime import datetime', explanation: 'Imports only the datetime class.' },
              { line: 'random.randint(10, 50)', explanation: 'Returns a random integer between 10 and 50 inclusive.' },
              { line: 'now.strftime("%H:%M")', explanation: 'Formats the datetime as a readable string.' },
            ),
            mistake(
              'from module import *',
              'Imports everything into your namespace without labels — name conflicts and unclear origin. Always import specifically.',
            ),
            quiz(
              'Which statement lets you call sqrt(16) directly without the module prefix?',
              ['import math', 'import math.sqrt', 'from math import sqrt', 'import sqrt from math'],
              2,
              'from math import sqrt imports only sqrt into the local namespace. With import math, you must write math.sqrt(16).',
            ),
          ],
        },
        {
          slug: 'python-classes-and-objects',
          title: 'Classes and Objects',
          description: 'Classes as blueprints, objects as instances.',
          estimatedMinutes: 10,
          xpReward: 20,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'class and __init__',
              "A class is a template defining the data (attributes) and behavior (methods) of a type of object. An object is a specific instance. Classes are defined with the class keyword. __init__ is the constructor — called automatically on object creation. self is a reference to the instance being created or used; every method receives self as its first parameter.",
            ),
            analogy(
              'Building blueprint',
              'A class is like a blueprint for a building — it defines rooms, measurements, features. Each actual building is an object — a unique instance with the same structure but its own values.',
            ),
            code(
              'class.py',
              `class User:\n    def __init__(self, username, xp=0):\n        self.username = username\n        self.xp = xp\n        self.level = 1\n\n    def show_profile(self):\n        print(f'{self.username} — XP: {self.xp} — Level: {self.level}')\n\n# Create instances\nuser1 = User('Maya', 350)\nuser2 = User('Alex')\n\nuser1.show_profile()\nuser2.show_profile()`,
            ),
            explanation(
              { line: '__init__ runs automatically', explanation: "When User('Maya', 350) is called, __init__ runs." },
              { line: 'self.username = username', explanation: 'Stores instance-specific data.' },
              { line: 'show_profile(self)', explanation: 'A method — a function that belongs to the User class.' },
              { line: 'user1 vs user2', explanation: 'Independent objects — changing one does not affect the other.' },
            ),
            mistake(
              'Forgetting self',
              "Forgetting self in method definitions. A method without self cannot access the object's attributes. Trying to use just 'username' instead of self.username causes a NameError.",
            ),
            quiz(
              'Which definition correctly creates a Course class with a title attribute and a method to print it?',
              [
                "class Course: title = '' / def show(): print(title)",
                "class Course:\n  def __init__(self, title):\n    self.title = title\n  def show(self):\n    print(self.title)",
                "def Course(title): self.title = title",
                "Course = class: def init(title): self.title = title",
              ],
              1,
              'A proper class uses class, __init__ with self, and self.attribute. Methods include self as the first parameter.',
            ),
          ],
        },
        {
          slug: 'python-class-methods',
          title: 'Class Methods',
          description: 'How methods give objects behavior, and how self ties it together.',
          estimatedMinutes: 10,
          xpReward: 20,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'Methods and self',
              "Methods are functions inside a class — they define what objects can do. Every instance method receives self as its first parameter. Methods can read/modify the object's attributes through self and call other methods using self.method(). Well-designed methods perform a single, clear action.",
            ),
            analogy(
              'Buttons on a device',
              'A User object might have buttons: award_xp, level_up, reset. Pressing a button (calling a method) triggers a specific action on that particular device (object).',
            ),
            code(
              'methods.py',
              `class User:\n    def __init__(self, username):\n        self.username = username\n        self.xp = 0\n        self.level = 1\n\n    def award_xp(self, amount):\n        self.xp += amount\n        print(f'+{amount} XP awarded to {self.username}')\n        self._check_level()\n\n    def _check_level(self):\n        new_level = self.xp // 100 + 1\n        if new_level > self.level:\n            self.level = new_level\n            print(f'{self.username} reached Level {self.level}!')\n\nu = User('Maya')\nu.award_xp(120)\nu.award_xp(50)`,
            ),
            explanation(
              { line: 'award_xp', explanation: 'Modifies self.xp and calls self._check_level().' },
              { line: '_check_level (underscore prefix)', explanation: 'Private helper method — signals internal use.' },
              { line: 'level recalculated on every XP award', explanation: 'Clean, encapsulated logic.' },
            ),
            mistake(
              'Calling without instance',
              'Writing award_xp(50) instead of u.award_xp(50) causes a NameError — methods must be called on an object.',
            ),
            quiz(
              'How do you call award_xp on the user object with 75 XP?\nuser = User("Sam")',
              ['award_xp(75)', 'User.award_xp(75)', 'user.award_xp(75)', 'user::award_xp(75)'],
              2,
              'Methods are called using dot notation: object.method(arguments). Python automatically passes the object as self.',
            ),
          ],
        },
        {
          slug: 'python-inheritance',
          title: 'Inheritance',
          description: 'Build new classes that extend existing ones.',
          estimatedMinutes: 12,
          xpReward: 25,
          difficulty: LessonDifficulty.ADVANCED,
          blocks: [
            theory(
              'Child classes',
              "Inheritance lets a child class acquire the attributes and methods of a parent class. Use class Child(Parent). The child can use parent methods as-is, override them, or add new methods. The child's __init__ should call super().__init__() to run the parent's setup. Inheritance models 'is-a' relationships: a PremiumUser is a User.",
            ),
            analogy(
              'Job title hierarchy',
              "A SeniorDeveloper inherits all the skills of a Developer but adds responsibilities on top. They don't start from scratch — they extend what already exists.",
            ),
            code(
              'inheritance.py',
              `class User:\n    def __init__(self, username, xp=0):\n        self.username = username\n        self.xp = xp\n\n    def show(self):\n        print(f'{self.username}: {self.xp} XP')\n\nclass PremiumUser(User):\n    def __init__(self, username, xp=0):\n        super().__init__(username, xp)\n        self.is_premium = True\n\n    def show(self):\n        super().show()\n        print('  — Premium member')\n\nu = PremiumUser('Maya', 500)\nu.show()`,
            ),
            explanation(
              { line: 'class PremiumUser(User):', explanation: 'PremiumUser inherits everything from User.' },
              { line: 'super().__init__(username, xp)', explanation: "Calls User's __init__ to set username and xp." },
              { line: 'self.is_premium = True', explanation: 'PremiumUser adds a new attribute.' },
              { line: 'super().show()', explanation: "Calls the parent's show() before adding the premium label." },
            ),
            mistake(
              'Skipping super().__init__()',
              "Without it, parent attributes (username, xp) are never initialized — accessing them later causes AttributeError.",
            ),
            quiz(
              "Which class definition correctly inherits from User and adds an admin_level attribute?",
              [
                "class AdminUser:\n  def __init__(self):\n    self.admin_level = 10",
                "class AdminUser(User):\n  def __init__(self, username):\n    super().__init__(username)\n    self.admin_level = 10",
                "AdminUser inherits User { admin_level = 10 }",
                "class AdminUser extends User:\n  admin_level = 10",
              ],
              1,
              'Use class Child(Parent), call super().__init__() to initialize the parent, then add child-specific attributes.',
            ),
          ],
        },
      ],
    },
  ],
};

// ── Seed runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding course content…');

  // Wipe existing course data — cascades clean up sections, lessons, blocks, progress, XP txns
  await prisma.course.deleteMany();

  let courseTotalXp = 0;
  let courseTotalMin = 0;

  const course = await prisma.course.create({
    data: {
      slug: PYTHON_COURSE.slug,
      title: PYTHON_COURSE.title,
      description: PYTHON_COURSE.description,
      language: PYTHON_COURSE.language,
      difficulty: PYTHON_COURSE.difficulty,
      isPublished: true,
      estimatedMinutes: 0,
      totalXp: 0,
    },
  });

  for (const [sIdx, section] of PYTHON_COURSE.sections.entries()) {
    let secXp = 0;
    let secMin = 0;

    const sec = await prisma.courseSection.create({
      data: {
        courseId: course.id,
        title: section.title,
        description: section.description,
        order: sIdx + 1,
        estimatedMinutes: 0,
        totalXp: 0,
      },
    });

    for (const [lIdx, lesson] of section.lessons.entries()) {
      secXp += lesson.xpReward;
      secMin += lesson.estimatedMinutes;

      const less = await prisma.lesson.create({
        data: {
          slug: lesson.slug,
          sectionId: sec.id,
          title: lesson.title,
          description: lesson.description,
          order: lIdx + 1,
          estimatedMinutes: lesson.estimatedMinutes,
          xpReward: lesson.xpReward,
          difficulty: lesson.difficulty,
          isPublished: true,
          isFree: lesson.isFree ?? false,
        },
      });

      for (const [bIdx, block] of lesson.blocks.entries()) {
        await prisma.lessonBlock.create({
          data: {
            lessonId: less.id,
            type: block.type,
            order: bIdx + 1,
            payload: block.payload as object,
          },
        });
      }
    }

    await prisma.courseSection.update({
      where: { id: sec.id },
      data: { estimatedMinutes: secMin, totalXp: secXp },
    });

    courseTotalXp += secXp;
    courseTotalMin += secMin;

    console.log(`  Section "${section.title}" — ${section.lessons.length} lessons, ${secXp} XP`);
  }

  await prisma.course.update({
    where: { id: course.id },
    data: { estimatedMinutes: courseTotalMin, totalXp: courseTotalXp },
  });

  const lessonCount = PYTHON_COURSE.sections.reduce((acc, s) => acc + s.lessons.length, 0);
  console.log(`\nSeeded: ${PYTHON_COURSE.title}`);
  console.log(`  ${PYTHON_COURSE.sections.length} sections, ${lessonCount} lessons, ${courseTotalXp} XP, ${courseTotalMin} min`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
