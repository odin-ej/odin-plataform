/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import z from "zod";
import { apiReservationSchema } from "@/lib/schemas/roomSchema";
import { revalidatePath } from "next/cache";
import { getGoogleAuthToken } from "@/lib/google-auth";


// --- FUNÇÃO GET: Listar todas as reservas ---
export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const reservations = await prisma.roomReservation.findMany({
      include: {
        user: { select: { name: true, imageUrl: true, id: true } },
        room: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    const rooms = await prisma.room.findMany();

    const response = {
      rooms,
      reservations,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar reservas." },
      { status: 500 }
    );
  }
}

// --- FUNÇÃO POST: Criar uma nova reserva ---
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    console.log(rawBody)
    console.log(body)
    // CORREÇÃO: Usando o novo schema (apiReservationSchema) para validar o payload da API.
    const validation = apiReservationSchema.safeParse({
      ...body,
      userId: authUser.id, // Adiciona o userId para validação
    });
    if (!validation.success) {
      console.error(
        "Erro de validação da API:",
        validation.error.flatten().fieldErrors
    );
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const roomName = await prisma.room.findUnique({
      where: { id: validation.data.roomId },
      select: { name: true },
    });

    // const googleRes = await fetch(
    //   `https://www.googleapis.com/calendar/v3/calendars/${process.env.GOOGLE_CALENDAR_ID}/events`,
    //   {
    //     method: "POST",
    //     headers: {
    //       "Content-Type": "application/json",
    //       Authorization: `Bearer ${await getGoogleAuthToken()}`,
    //     },
    //     body: JSON.stringify({
    //       summary: `Reserva da sala ${roomName!.name}`, // Pode usar o ID da sala aqui
    //       description: `Reservado por: ${authUser.name}`,
    //       start: {
    //         dateTime: validation.data.hourEnter,
    //         timeZone: "America/Sao_Paulo",
    //       },
    //       end: {
    //         dateTime: validation.data.hourLeave,
    //         timeZone: "America/Sao_Paulo",
    //       },
    //     }),
    //   }
    // );
    // // 2. Verifique se a criação no Google funcionou. Se não, pare aqui.
    // if (!googleRes.ok) {
    //   const errorDetails = await googleRes.json();
    //   console.error(
    //     "Falha ao criar evento no Google Calendar:",
    //     JSON.stringify(errorDetails, null, 2) // <-- MUDANÇA AQUI
    //   );
    //   return NextResponse.json(
    //     { message: "Erro ao agendar no Google Calendar." },
    //     { status: 502 } // 502 Bad Gateway é apropriado
    //   );
    // }

    // const googleData = await googleRes.json();

    // 3. AGORA, se tudo deu certo com o Google, crie a reserva no seu DB de uma só vez
    const newReservation = await prisma.roomReservation.create({
      data: {
        ...validation.data, // Todos os dados validados
        // googleCalendarEventId: googleData.id, // Incluindo o ID do evento do Google googleData.id 
      },
    });

    // revalidatePath("/");
    // revalidatePath("/reserva-salinhas");
    console.log('criado com sucesso')
    return NextResponse.json(newReservation, { status: 201 });
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { message: "Erro ao criar reserva." },
      { status: 500 }
    );
  }
}
