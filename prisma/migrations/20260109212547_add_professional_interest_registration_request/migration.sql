-- CreateTable
CREATE TABLE "_ProfessionalInterestToRegistrationRequest" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfessionalInterestToRegistrationRequest_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProfessionalInterestToRegistrationRequest_B_index" ON "_ProfessionalInterestToRegistrationRequest"("B");

-- AddForeignKey
ALTER TABLE "_ProfessionalInterestToRegistrationRequest" ADD CONSTRAINT "_ProfessionalInterestToRegistrationRequest_A_fkey" FOREIGN KEY ("A") REFERENCES "ProfessionalInterest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProfessionalInterestToRegistrationRequest" ADD CONSTRAINT "_ProfessionalInterestToRegistrationRequest_B_fkey" FOREIGN KEY ("B") REFERENCES "RegistrationRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
