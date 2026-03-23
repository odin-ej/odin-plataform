-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);
