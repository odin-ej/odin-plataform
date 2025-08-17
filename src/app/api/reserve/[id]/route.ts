import { prisma } from "@/db";
import { getGoogleAuthToken } from "@/lib/google-auth";
import { roomReservationSchema } from "@/lib/schemas/reservationsSchema";
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
    const validation = roomReservationSchema.partial().safeParse(body); // .partial() torna todos os campos opcionais

    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos" }, { status: 400 });
    }
    let startDateTime: Date | undefined = undefined;
    let endDateTime: Date | undefined = undefined;

    if (
      !validation.data.date ||
      !validation.data.hourEnter ||
      !validation.data.hourLeave
    )
      return NextResponse.json(
        {
          message: "Preencha os campos de dado e/ou horário",
        },
        { status: 400 }
      );

    if (validation.data.date && validation.data.hourEnter) {
      startDateTime = new Date(
        `${validation.data.date}T${validation.data.hourEnter}:00-03:00`
      );
    }

    if (validation.data.date && validation.data.hourLeave) {
      endDateTime = new Date(
        `${validation.data.date}T${validation.data.hourLeave}:00-03:00`
      );
    }

    const dataToUpdate = {
      title: validation.data.title,
      status: validation.data.status,
      roomId: validation.data.roomId,
    };

    // --- Atualizar no Prisma (não tocar em startDate/endDate) ---
    const updatedReservation = await prisma.roomReservation.update({
      where: { id },
      data: {
        ...dataToUpdate,
        date: new Date(validation.data.date),
        hourEnter: startDateTime,
        hourLeave: endDateTime,
      },
      select: {
        room: { select: { name: true } },
        title: true,
        date: true,
        hourEnter: true,
        hourLeave: true,
        googleCalendarEventId: true,
      },
    });

    const googleApiResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${updatedReservation.googleCalendarEventId}`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          // A forma correta de obter o token será explicada na próxima seção
          Authorization: `Bearer ${await getGoogleAuthToken()}`,
        },
        body: JSON.stringify({
          summary: `Reserva da sala ${updatedReservation.room.name}: ${updatedReservation.title}`,
          start: {
            dateTime: startDateTime!.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
          end: {
            dateTime: endDateTime!.toISOString(),
            timeZone: "America/Sao_Paulo",
          },
        }),
      }
    );

    // VERIFICAÇÃO CRÍTICA
    if (!googleApiResponse.ok) {
      // Se a API do Google falhou, precisamos reverter a alteração no nosso banco de dados
      // ou registrar o erro para uma correção manual.
      // Por simplicidade, vamos apenas logar e retornar um erro.
      console.error(
        "Falha ao atualizar o evento no Google Calendar:",
        await googleApiResponse.json()
      );
      return NextResponse.json(
        { message: "Erro ao sincronizar com o Google Calendar." },
        { status: 502 } // 502 Bad Gateway é uma boa opção aqui
      );
    }
    revalidatePath("/reserva-salinhas");
    return NextResponse.json(updatedReservation);
  } catch (error) {
    console.error(error);
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

    const googleApiResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events/${roomToDelete.googleCalendarEventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${await getGoogleAuthToken()}`,
        },
      }
    );

    if (!googleApiResponse.ok) {
      console.error(
        "Falha ao atualizar evento no Google Calendar:",
        await googleApiResponse.text()
      );
      // Idealmente, você deveria tentar reverter a alteração no seu banco de dados aqui.
      // Por agora, vamos apenas retornar um erro claro.
      return NextResponse.json(
        { message: "Erro ao sincronizar com o Google Calendar." },
        { status: 502 } // Bad Gateway
      );
    }
    revalidatePath("/reserva-salinhas");
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao apagar reserva." },
      { status: 500 }
    );
  }
}
