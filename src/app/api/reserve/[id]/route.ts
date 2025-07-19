import { apiReservationSchema } from "@/lib/schemas/roomSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const {id} = await params

    const body = await request.json();
    const validation = apiReservationSchema.partial().safeParse(body); // .partial() torna todos os campos opcionais

    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    const updatedReservation = await prisma.roomReservation.update({
      where: { id },
      data: validation.data,
    });
    return NextResponse.json(updatedReservation);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao atualizar reserva." },
      { status: 500 }
    );
  }
}

// --- FUNÇÃO DELETE: Apagar uma reserva ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const {id} = await params

    await prisma.roomReservation.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao apagar reserva." },
      { status: 500 }
    );
  }
}
