import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const [
      rooms,
      roomReservations,
      eaufbaRequests,
      reservableItems,
      itemReservations,
    ] = await Promise.all([
      await prisma.room.findMany({}),
      await prisma.roomReservation.findMany({
        include: {
          user: { select: { name: true, imageUrl: true, id: true } },
          room: { select: { name: true } },
        },
        orderBy: { date: "desc" },
      }),
      await prisma.reserveRequestToConections.findMany({
        include: {
          applicant: true, // Inclui os dados do usuário que fez a solicitação
        },
        orderBy: {
          date: "desc", // Ordena pelas mais recentes
        },
      }),
      await prisma.reservableItem.findMany({ orderBy: { name: "asc" } }),
      await prisma.itemReservation.findMany({
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
          item: true,
        },
        orderBy: { startDate: "desc" },
      }),
    ]);

    return NextResponse.json({
      rooms,
      roomReservations,
      eaufbaRequests,
      reservableItems,
      itemReservations,
    })

  } catch (error) {
    console.error(error);
    return NextResponse.json({
      message: "Houve um erro ao puxar os dados da central de reservas",
    });
  }
}
