-- CreateTable
CREATE TABLE "OraculoFile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "googleDriveModifiedTime" TIMESTAMP(3),
    "googleDriveFileId" TEXT,

    CONSTRAINT "OraculoFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OraculoFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ownerId" TEXT NOT NULL,
    "parentId" TEXT,
    "restrictedToArea" "AreaRoles"[],
    "googleDriveFolderId" TEXT,

    CONSTRAINT "OraculoFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OraculoFile_googleDriveFileId_key" ON "OraculoFile"("googleDriveFileId");

-- CreateIndex
CREATE UNIQUE INDEX "OraculoFolder_googleDriveFolderId_key" ON "OraculoFolder"("googleDriveFolderId");

-- AddForeignKey
ALTER TABLE "OraculoFile" ADD CONSTRAINT "OraculoFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OraculoFile" ADD CONSTRAINT "OraculoFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "OraculoFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OraculoFolder" ADD CONSTRAINT "OraculoFolder_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OraculoFolder" ADD CONSTRAINT "OraculoFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OraculoFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
