-- CreateTable
CREATE TABLE "LinkPoster" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "isForExMember" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkPoster_pkey" PRIMARY KEY ("id")
);
