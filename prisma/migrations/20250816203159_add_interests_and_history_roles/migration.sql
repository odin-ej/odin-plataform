-- CreateTable
CREATE TABLE "InterestCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "InterestCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalInterest" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProfessionalInterest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProfessionalInterestToUser" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfessionalInterestToUser_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "InterestCategory_name_key" ON "InterestCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProfessionalInterest_name_key" ON "ProfessionalInterest"("name");

-- CreateIndex
CREATE INDEX "_ProfessionalInterestToUser_B_index" ON "_ProfessionalInterestToUser"("B");

-- AddForeignKey
ALTER TABLE "ProfessionalInterest" ADD CONSTRAINT "ProfessionalInterest_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "InterestCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessionalInterestToUser" ADD CONSTRAINT "_ProfessionalInterestToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "ProfessionalInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessionalInterestToUser" ADD CONSTRAINT "_ProfessionalInterestToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
