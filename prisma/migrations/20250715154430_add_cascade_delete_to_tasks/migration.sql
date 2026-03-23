-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomReservation" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "RoomReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Room_name_key" ON "Room"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoomReservation_roomId_date_key" ON "RoomReservation"("roomId", "date");

-- AddForeignKey
ALTER TABLE "RoomReservation" ADD CONSTRAINT "RoomReservation_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoomReservation" ADD CONSTRAINT "RoomReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
