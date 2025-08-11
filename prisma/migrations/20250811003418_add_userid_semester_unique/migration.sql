/*
  Warnings:

  - A unique constraint covering the columns `[userId,semester]` on the table `UserSemesterScore` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserSemesterScore_userId_semester_key" ON "UserSemesterScore"("userId", "semester");
