/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from "@/db";
import { getGoogleAuthToken } from "@/lib/google-auth";
import { apiReservationSchema } from "@/lib/schemas/roomSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
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
    const { id } = await params;

    const body = await request.json();
    const validation = apiReservationSchema.partial().safeParse(body); // .partial() torna todos os campos opcionais

    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }

    const updatedReservation = await prisma.roomReservation.update({
      where: { id },
      data: validation.data,
      select: {
        room: { select: { name: true } },
        date: true,
        hourEnter: true,
        hourLeave: true,
        googleCalendarEventId: true,
      },
    });

    // const googleApiResponse = await fetch(
    //   `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${updatedReservation.googleCalendarEventId}`,
    //   {
    //     method: "PATCH",
    //     headers: {
    //       "Content-Type": "application/json",
    //       // A forma correta de obter o token será explicada na próxima seção
    //       Authorization: `Bearer ${await getGoogleAuthToken()}`,
    //     },
    //     body: JSON.stringify({
    //       summary: `Reserva da sala ${updatedReservation.room.name}`,
    //       start: {
    //         dateTime: updatedReservation.hourEnter,
    //         timeZone: "America/Sao_Paulo",
    //       },
    //       end: {
    //         dateTime: updatedReservation.hourLeave,
    //         timeZone: "America/Sao_Paulo",
    //       },
    //     }),
    //   }
    // );

    // // VERIFICAÇÃO CRÍTICA
    // if (!googleApiResponse.ok) {
    //   // Se a API do Google falhou, precisamos reverter a alteração no nosso banco de dados
    //   // ou registrar o erro para uma correção manual.
    //   // Por simplicidade, vamos apenas logar e retornar um erro.
    //   console.error(
    //     "Falha ao atualizar o evento no Google Calendar:",
    //     await googleApiResponse.json()
    //   );
    //   return NextResponse.json(
    //     { message: "Erro ao sincronizar com o Google Calendar." },
    //     { status: 502 } // 502 Bad Gateway é uma boa opção aqui
    //   );
    // }
    revalidatePath("/reserva-salinhas");
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
    const { id } = await params;

    const roomToDelete = await prisma.roomReservation.delete({ where: { id } });

    // const googleApiResponse = await fetch(
    //   `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${roomToDelete.googleCalendarEventId}`,
    //   {
    //     method: "DELETE",
    //     headers: {
    //       Authorization: `Bearer ${await getGoogleAuthToken()}`,
    //     },
    //   }
    // );

    // if (!googleApiResponse.ok) {
    //   console.error(
    //     "Falha ao atualizar evento no Google Calendar:",
    //     await googleApiResponse.text()
    //   );
    //   // Idealmente, você deveria tentar reverter a alteração no seu banco de dados aqui.
    //   // Por agora, vamos apenas retornar um erro claro.
    //   return NextResponse.json(
    //     { message: "Erro ao sincronizar com o Google Calendar." },
    //     { status: 502 } // Bad Gateway
    //   );
    // }
    revalidatePath("/reserva-salinhas");
    return new NextResponse(null, { status: 204 });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao apagar reserva." },
      { status: 500 }
    );
  }
}
