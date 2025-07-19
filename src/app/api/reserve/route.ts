/* eslint-disable @typescript-eslint/no-unused-vars */
import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import z from "zod";
import { apiReservationSchema } from "@/lib/schemas/roomSchema";
import { revalidatePath } from "next/cache";

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

    const body = await request.json();
    
    // CORREÇÃO: Usando o novo schema (apiReservationSchema) para validar o payload da API.
    const validation = apiReservationSchema.safeParse({
      ...body,
      userId: authUser.id, // Adiciona o userId para validação
    });

    if (!validation.success) {
      console.error("Erro de validação da API:", validation.error.flatten().fieldErrors);
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    // CORREÇÃO: Os dados já estão no formato string ISO correto, não precisa de `new Date()`.
    // O Prisma converte a string ISO para o tipo DateTime do banco de dados automaticamente.
    const newReservation = await prisma.roomReservation.create({
      data: {
        date: validation.data.date,
        hourEnter: validation.data.hourEnter,
        hourLeave: validation.data.hourLeave,
        roomId: validation.data.roomId,
        userId: validation.data.userId,
        status: validation.data.status,
      },
    });

    revalidatePath('/reserva-salinhas')

    return NextResponse.json(newReservation, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao criar reserva." },
      { status: 500 }
    );
  }
}
