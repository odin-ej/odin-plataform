import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const file = await prisma.oraculoFile.findUnique({
      where: { id },
    });
    if (!file)
      return NextResponse.json(
        { message: "Arquivo não encontrado." },
        { status: 404 }
      );
    const updatedFile = await prisma.oraculoFile.update({
      where: { id },
      data: { isFavorite: !file.isFavorite },
      include: { owner: true, folder: true },
    });
    revalidatePath("/oraculo");
    return NextResponse.json(updatedFile);
  } catch (error) {
    console.error("Erro ao favoritar arquivo:", error);
    return NextResponse.json(
      { message: "Erro ao favoritar arquivo." },
      { status: 500 }
    );
  }
}
