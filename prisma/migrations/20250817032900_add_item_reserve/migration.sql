-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "ReservableItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" "ItemStatus" NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "ReservableItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemReservation" (
    "id" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReservableItem_name_key" ON "ReservableItem"("name");

-- AddForeignKey
ALTER TABLE "ItemReservation" ADD CONSTRAINT "ItemReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ReservableItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemReservation" ADD CONSTRAINT "ItemReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
