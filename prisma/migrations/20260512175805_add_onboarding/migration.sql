-- CreateEnum
CREATE TYPE "ProgrammingLanguage" AS ENUM ('JAVASCRIPT', 'TYPESCRIPT', 'PYTHON', 'HTML_CSS');

-- CreateEnum
CREATE TYPE "UserLearningLevel" AS ENUM ('BEGINNER', 'BASIC', 'INTERMEDIATE');

-- CreateEnum
CREATE TYPE "LearningGoal" AS ENUM ('CAREER', 'STUDY', 'PET_PROJECT', 'JUST_FOR_FUN');

-- CreateEnum
CREATE TYPE "DailyLearningTime" AS ENUM ('FIVE_MIN', 'TEN_MIN', 'FIFTEEN_MIN', 'THIRTY_MIN');

-- CreateEnum
CREATE TYPE "PreferredLearningFormat" AS ENUM ('THEORY_FIRST', 'PRACTICE_FIRST', 'MIXED');

-- CreateTable
CREATE TABLE "onboardings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedLanguage" "ProgrammingLanguage" NOT NULL,
    "currentLevel" "UserLearningLevel" NOT NULL,
    "learningGoal" "LearningGoal" NOT NULL,
    "dailyTime" "DailyLearningTime" NOT NULL,
    "preferredFormat" "PreferredLearningFormat" NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboardings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboardings_userId_key" ON "onboardings"("userId");

-- AddForeignKey
ALTER TABLE "onboardings" ADD CONSTRAINT "onboardings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
