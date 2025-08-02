import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { linkSchema } from "@/lib/schemas/linksSchema";
import { revalidatePath } from "next/cache";

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    if (authUser.isExMember) return NextResponse.json({ links: [] });

    const {isGlobal, ...body } = await request.json();

    const validation = linkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }
    const data = validation.data;

    const newLink = await prisma.usefulLink.create({
      data: {
        ...data,
        isGlobal,
        userId: authUser.id,
      },
    });
    revalidatePath('/')
    return NextResponse.json(newLink, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro ao criar link.", error },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

    const links = await prisma.usefulLink.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        isGlobal: true, // Filtra apenas links globais
      },
    });
    return NextResponse.json({ links });
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao buscar links.", error },
      { status: 500 }
    );
  }
}
