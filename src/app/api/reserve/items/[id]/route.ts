import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { itemReservationSchema } from "../../../../../lib/schemas/reservationsSchema";


export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const validation = itemReservationSchema.partial().safeParse(body);
    if (!validation.success) return NextResponse.json({ message: "Dados inválidos", status: 400 });

    const timezoneOffset = "-03:00";
    const startDate = new Date(
        `${validation.data.startDate}T${validation.data.startTime}:00${timezoneOffset}`
    );
    const endDate = new Date(
        `${validation.data.endDate}T${validation.data.endTime}:00${timezoneOffset}`
    );

    const item = await prisma.reservableItem.findUnique({
      where: { id: validation.data.itemId },
    });
    if (!item)
      return NextResponse.json(
        { message: "Item não encontrado" },
        { status: 404 }
      );

    const dataToUpdate = {
      title: validation.data.title,
      startDate,
      endDate,
      itemId: item.id,
    };

    const updatedReservation = await prisma.itemReservation.update({ where: { id }, data: dataToUpdate, include: { item: true, user: true } });

    revalidatePath("/central-de-reservas");

    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao atualizar reserva." }, { status: 500 });
  }
}

// --- DELETE: apagar reserva de item ---
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const { id } = await params;
    await prisma.itemReservation.delete({ where: { id } });

    revalidatePath("/central-de-reservas");

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Erro ao apagar reserva." }, { status: 500 });
  }
}