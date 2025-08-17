import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { AreaRoles, LinkPosterArea, } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

const apiCreateLinkPosterSchema = z.object({
  isActive: z.enum(["Sim", "Não"]),
  title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
  imageUrl: z.string().min(5, "A imagem deve ter pelo menos 5 caracteres."),
  link: z.string().min(5, "O link deve ter pelo menos 5 caracteres."),
  areas: z
    .array(z.nativeEnum(LinkPosterArea))
    .min(1, "Selecione pelo menos uma área."),
});

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const linkPosters = await prisma.linkPoster.findMany({
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(linkPosters);
  } catch (error) {
    console.error("Erro ao buscar postagens de links:", error);
    return NextResponse.json(
      { message: "Erro ao buscar postagens de links." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { image, ...body } = await request.json();
    const validation = apiCreateLinkPosterSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos." },
        { status: 400 }
      );
    }

    const { isActive, ...validatedData } = validation.data;

    const poster = await prisma.linkPoster.create({
      data: {
        ...validatedData,
        isActive: isActive === "Sim",
        imageUrl: validatedData.imageUrl as string,
      },
    });

    const allMembersId = await prisma.user.findMany({
      include: {currentRole: true}
    });

    const membersCanSee = allMembersId.filter(member => {
      const userRole = member.currentRole;
      if (!userRole) return false;
      if(userRole.area.includes(AreaRoles.DIRETORIA) || validatedData.areas.includes(LinkPosterArea.YGGDRASIL) || validatedData.areas.includes(LinkPosterArea.HOME) || validatedData.areas.includes(LinkPosterArea.GERAL)) return true;
      if(authUser.isExMember && validatedData.areas.includes(LinkPosterArea.EXMEMBROS)) return true;
      if(!authUser.isExMember && validatedData.areas.includes(LinkPosterArea.MEMBROS)) return true;
      if(userRole.area.includes(AreaRoles.TATICO) && validatedData.areas.includes(LinkPosterArea.TATICO)) return true;
      if(userRole.area.includes(AreaRoles.CONSULTORIA) && validatedData.areas.includes(LinkPosterArea.CONSULTORIA)) return true;
      if(userRole.area.includes(AreaRoles.TATICO) && validatedData.areas.includes(LinkPosterArea.TATICO)) return true;
      {

      }
    });

    const notification = await prisma.notification.create({
      data: {
        link: "/",
        type: "GENERAL_ALERT",
        notification: `${authUser.name} criou um novo poster.`,
      
      },
    });

    await prisma.notificationUser.createMany({
      data: membersCanSee.filter((member) => member.id !== authUser.id).map((member) => ({
        notificationId: notification.id,
        userId: member.id,
      })),
    });

    revalidatePath("/gerenciar-link-posters");
    revalidatePath("/");
    return NextResponse.json(poster);
  } catch (error) {
    console.error("Erro ao criar postagem de link:", error);
    return NextResponse.json(
      { message: "Erro ao criar postagem de link." },
      { status: 500 }
    );
  }
}
