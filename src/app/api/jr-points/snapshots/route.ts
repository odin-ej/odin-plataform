import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

const snapshotSchema = z.object({
  semesterId: z.string().uuid("O ID do semestre é inválido."),
});

// --- CRIAR/ATUALIZAR SNAPSHOT E ZERAR PONTOS ---
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const { semesterId } = snapshotSchema.parse(body);

    const semesterToSnapshot = await prisma.semester.findUnique({
      where: { id: semesterId },
    });
    if (!semesterToSnapshot) {
      return NextResponse.json(
        { message: "O semestre selecionado não foi encontrado." },
        { status: 404 }
      );
    }

    const existingSnapshot = await prisma.enterpriseSemesterScore.findUnique({
      where: { semesterPeriodId: semesterId },
    });

    if (existingSnapshot) {
      return NextResponse.json(
        {
          message: `Um snapshot para o semestre '${semesterToSnapshot.name}' já existe e não pode ser sobrescrito.`,
        },
        { status: 409 } // 409 Conflict
      );
    }

    const usersWithPoints = await prisma.user.findMany({
      where: { points: { isNot: null } },
      include: { points: true },
    });
    const enterprisePoints = await prisma.enterprisePoints.findUnique({
      where: { id: 1 },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Salva os scores FINAIS dos usuários no placar daquele semestre
      if (usersWithPoints.length > 0) {
        const userSnapshotOps = usersWithPoints.map((user) =>
          tx.userSemesterScore.upsert({
            where: {
              userId_semesterPeriodId: {
                userId: user.id,
                semesterPeriodId: semesterId,
              },
            },
            update: { totalPoints: user.points!.totalPoints },
            create: {
              userId: user.id,
              semester: semesterToSnapshot.name,
              totalPoints: user.points!.totalPoints,
              semesterPeriodId: semesterId,
            },
          })
        );
        await Promise.all(userSnapshotOps);
      }

      // 2. Salva o score FINAL da empresa no placar daquele semestre
      if (enterprisePoints) {
        await tx.enterpriseSemesterScore.upsert({
          where: { semesterPeriodId: semesterId },
          update: { value: enterprisePoints.value },
          create: {
            semester: semesterToSnapshot.name,
            value: enterprisePoints.value,
            semesterPeriodId: semesterId,
          },
        });
      }

      // 3. ZERA os placares ATUAIS para o próximo período
      if (usersWithPoints.length > 0) {
        await tx.userPoints.updateMany({
          where: { id: { in: usersWithPoints.map((u) => u.points!.id) } },
          data: { totalPoints: 0 },
        });
      }
      if (enterprisePoints) {
        await tx.enterprisePoints.update({
          where: { id: 1 },
          data: { value: 0 },
        });
      }
    });
    const allMembersId = await prisma.user.findMany({
      where: { isExMember: false },
      select: { id: true },
    });

    const notification = await prisma.notification.create({
      data: {
        link: "/jr-points",
        type: "GENERAL_ALERT",
        notification: `Um snapshot foi criado/atualizado para o semestre ${semesterToSnapshot.name} por ${authUser.name}. Todos os pontos foram zerados.`,
      },
    });

    await prisma.notificationUser.createMany({
      data: allMembersId.map((member) => ({
        notificationId: notification.id,
        userId: member.id,
        isRead: false,
      })),
    });

    revalidatePath('/jr-points')
    revalidatePath('/gerenciar-jr-points')
    return NextResponse.json({
      message: `Snapshot para o semestre ${semesterToSnapshot.name} criado/atualizado para ${usersWithPoints.length} usuários.`,
    });
  } catch (error) {
    console.error("[SNAPSHOT_CREATE_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
