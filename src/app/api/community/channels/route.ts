// src/app/api/community/channels/[id]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { z } from "zod";
import {
  AreaRoles,
  ChannelMemberRole,
  ChannelType,
} from "@prisma/client"; // Importe Prisma
import { revalidatePath } from "next/cache";

const channelSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  type: z.nativeEnum(ChannelType), // Use nativeEnum para tipos do Prisma
  allowExMembers: z.boolean().default(false),
  restrictedToAreas: z.array(z.nativeEnum(AreaRoles)).optional().default([]), // Adicione default
  memberIds: z.array(z.string()).optional().default([]), // Adicione default
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const validation = channelSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.flatten() },
        { status: 400 }
      );
    }
    const {
      name,
      description,
      type,
      allowExMembers,
      restrictedToAreas,
      memberIds,
    } = validation.data;

    let membersToCreate = [];

    if (type === ChannelType.PRIVATE) {
      // --- LÓGICA PARA CANAL PRIVADO ---
      // Adiciona apenas os membros selecionados + o criador
      const allMemberIds = Array.from(
        new Set([authUser.id, ...(memberIds || [])])
      );
      membersToCreate = allMemberIds.map((userId) => ({
        user: { connect: { id: userId } },
        role:
          userId === authUser.id
            ? ChannelMemberRole.ADMIN
            : ChannelMemberRole.MEMBER,
      }));
    } else {
      // --- LÓGICA PARA CANAL PÚBLICO (CORRIGIDA) ---
      membersToCreate = [
        {
          user: { connect: { id: authUser.id } },
          role: ChannelMemberRole.ADMIN,
        },
      ];
    }

    // Cria o canal com a lista de membros correta
    const newChannel = await prisma.channel.create({
      data: {
        name,
        description,
        type,
        allowExMembers,
        restrictedToAreas: type === ChannelType.PUBLIC ? restrictedToAreas : [], // Garante que privado não tenha áreas
        createdById: authUser.id,
        members: {
          create: membersToCreate,
        },
      },
    });

    revalidatePath("/comunidade");
    return NextResponse.json(newChannel, { status: 201 });
  } catch (error) {
    console.error("[CHANNELS_POST_ERROR]", error);
    return NextResponse.json(
      { message: "Erro ao criar canal." },
      { status: 500 }
    );
  }
}
