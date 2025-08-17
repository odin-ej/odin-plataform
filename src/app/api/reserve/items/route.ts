import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { itemReservationSchema } from "@/lib/schemas/reservationsSchema";
import { revalidatePath } from "next/cache";

// --- GET: Listar todas as reservas de itens ---
export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const reservations = await prisma.itemReservation.findMany({
      include: {
        user: { select: { id: true, name: true, imageUrl: true } },
        item: true,
      },
      orderBy: { startDate: "desc" },
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao buscar reservas." },
      { status: 500 }
    );
  }
}

// --- POST: criar reserva de item ---
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const body = await request.json();

    const validation = itemReservationSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const startDate = new Date(`${body.startDate}T${body.startTime}`);
    const endDate = new Date(`${body.endDate}T${body.endTime}`);

    const item = await prisma.reservableItem.findUnique({
      where: { id: validation.data.itemId },
    });
    if (!item)
      return NextResponse.json(
        { message: "Item não encontrado" },
        { status: 404 }
      );

    const dataToPost = {
      title: validation.data.title,
      startDate,
      endDate,
      userId: authUser.id,
      itemId: item.id,
    };

    const newReservation = await prisma.itemReservation.create({
      data: dataToPost,
      include: { item: true, user: true },
    });

    revalidatePath("/central-de-reservas");

    return NextResponse.json(newReservation, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao criar reserva de item." },
      { status: 500 }
    );
  }
}
