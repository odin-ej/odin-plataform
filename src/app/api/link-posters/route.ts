import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { LinkPosterArea } from "@prisma/client";
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
