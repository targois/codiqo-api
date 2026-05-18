-- CreateEnum
CREATE TYPE "ChallengeValidationType" AS ENUM ('EXACT_MATCH', 'NORMALIZED_MATCH');

-- AlterEnum: replace UserLearningLevel { BEGINNER, BASIC, INTERMEDIATE }
-- with { BEGINNER, INTERMEDIATE, ADVANCED }. Safe in dev — no rows hold BASIC.
CREATE TYPE "UserLearningLevel_new" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');
ALTER TABLE "onboardings" ALTER COLUMN "currentLevel" TYPE "UserLearningLevel_new" USING (
  CASE "currentLevel"::text
    WHEN 'BASIC' THEN 'BEGINNER'::"UserLearningLevel_new"
    ELSE "currentLevel"::text::"UserLearningLevel_new"
  END
);
ALTER TYPE "UserLearningLevel" RENAME TO "UserLearningLevel_old";
ALTER TYPE "UserLearningLevel_new" RENAME TO "UserLearningLevel";
DROP TYPE "UserLearningLevel_old";

-- AlterTable
ALTER TABLE "onboardings" ADD COLUMN     "startingLessonId" TEXT;

-- CreateTable
CREATE TABLE "daily_challenges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 25,
    "language" TEXT NOT NULL,
    "starterCode" TEXT NOT NULL,
    "expectedOutput" TEXT NOT NULL,
    "hint" TEXT,
    "validationType" "ChallengeValidationType" NOT NULL,
    "expectedSolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_daily_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "submittedCode" TEXT,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_daily_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "daily_challenges_slug_key" ON "daily_challenges"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "user_daily_challenges_userId_challengeId_key" ON "user_daily_challenges"("userId", "challengeId");

-- CreateIndex
CREATE INDEX "xp_transactions_userId_createdAt_idx" ON "xp_transactions"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "user_daily_challenges" ADD CONSTRAINT "user_daily_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_daily_challenges" ADD CONSTRAINT "user_daily_challenges_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "daily_challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

