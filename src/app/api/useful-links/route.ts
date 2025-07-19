import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";

export async function POST(request: Request) {
try {
     const authUser = await getAuthenticatedUser();
  if (!authUser) return NextResponse.json({ message: "Não autorizado" }, { status: 401 });

  const { title, url } = await request.json();
  if (!title || !url) return NextResponse.json({ message: "Título e URL são obrigatórios." }, { status: 400 });

  const newLink = await prisma.usefulLink.create({
    data: { title, url, userId: authUser.id },
  });
  return NextResponse.json(newLink, { status: 201 });
} catch (error) {
  return NextResponse.json({ message: "Erro ao criar link.", error }, { status: 500 });
}
}
