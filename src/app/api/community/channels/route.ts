import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { z } from "zod";
import { AreaRoles, ChannelMemberRole } from "@prisma/client";
import { revalidatePath } from "next/cache";

const channelSchema = z.object({
  name: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(["PUBLIC", "PRIVATE"]),
  allowExMembers: z.boolean().default(false),
  restrictedToAreas: z.array(z.nativeEnum(AreaRoles)).optional(),
  memberIds: z.array(z.string()).optional(),
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

    const allUsers = await prisma.user.findMany({
      where: {
        OR: [
          {
            currentRole: {
              area: { hasSome: restrictedToAreas || [] },
            },
          },
          {
            isExMember: allowExMembers,
          },
        ],
      },
    });

    // Prepare members to create (private: selected ids + creator, public: all matched users)
    const membersToCreate =
      type === "PRIVATE"
        ? Array.from(new Set([authUser.id, ...(memberIds || [])])).map(
            (userId) => ({
              user: { connect: { id: userId } },
              role:
                userId === authUser.id
                  ? ChannelMemberRole.ADMIN
                  : ChannelMemberRole.MEMBER, // O criador é o admin
            })
          )
        : allUsers.map((user) => ({
            user: { connect: { id: user.id } },
            role:
              user.id === authUser.id
                ? ChannelMemberRole.ADMIN
                : ChannelMemberRole.MEMBER,
          }));

    const newChannel = await prisma.channel.create({
      data: {
        name,
        description,
        type,
        allowExMembers,
        restrictedToAreas: type === "PUBLIC" ? restrictedToAreas : [],
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
