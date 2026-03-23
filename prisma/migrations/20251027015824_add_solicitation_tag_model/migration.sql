-- CreateTable
CREATE TABLE "SolicitationTag" (
    "id" TEXT NOT NULL,
    "solicitationId" TEXT NOT NULL,
    "tagTemplateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitationTag_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SolicitationTag" ADD CONSTRAINT "SolicitationTag_solicitationId_fkey" FOREIGN KEY ("solicitationId") REFERENCES "JRPointsSolicitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitationTag" ADD CONSTRAINT "SolicitationTag_tagTemplateId_fkey" FOREIGN KEY ("tagTemplateId") REFERENCES "TagTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
