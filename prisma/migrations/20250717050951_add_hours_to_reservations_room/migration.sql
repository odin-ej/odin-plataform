/*
  Warnings:

  - Added the required column `hourEnter` to the `RoomReservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hourLeave` to the `RoomReservation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `RoomReservation` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('FREE', 'BUSY', 'RESTRICTED');

-- AlterTable
ALTER TABLE "RoomReservation" ADD COLUMN     "hourEnter" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "hourLeave" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "status" "RoomStatus" NOT NULL;
