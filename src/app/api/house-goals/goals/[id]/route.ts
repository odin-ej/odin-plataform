import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { goalUpdateSchema } from "@/lib/schemas/strategyUpdateSchema";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    // Adicione aqui a lógica de permissão, se necessário

    const body = await request.json();
    const validation = goalUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const dataToUpdate = validation.data;

    const updatedGoal = await prisma.goal.update({
      where: { id },
      data: dataToUpdate,
    });

    const allMembersId = await prisma.user.findMany({
      where: {
        isExMember: false,
      },
      select: { id: true },
    });

    const notification = await prisma.notification.create({
      data: {
        link: `/metas`,
        notification: `A meta ${updatedGoal.title} foi atualizada por ${authUser.name}. Clique no link para ver os detalhes.`,
        type: "GENERAL_ALERT",
      },
    });

    await prisma.notificationUser.createMany({
      data: allMembersId
        .filter((member) => member.id !== authUser.id)
        .map((member) => ({
          notificationId: notification.id,
          userId: member.id,
          isRead: false,
        })),
    });

    revalidatePath("/atualizar-estrategia");
    revalidatePath("/metas");

    return NextResponse.json(updatedGoal);
  } catch (error) {
    console.error("Erro ao atualizar meta:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro no servidor." },
      { status: 500 }
    );
  }
}
