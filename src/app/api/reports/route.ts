import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { ReportCategory } from "@prisma/client";

// Schema para criar um novo report
const reportCreateSchema = z
  .object({
    title: z.string().min(5, "O titulo deve ter pelo menos 5 caracteres."),
    content: z.string().min(20, "A descricao precisa de mais detalhes."),
    category: z.nativeEnum(ReportCategory).default("OUTRO"),
    isAnonymous: z.boolean().default(false),
    recipientUserId: z.string().optional(),
    userId: z.string().optional(),
    recipientRoleId: z.string().optional(),
  })
  .refine((data) => data.recipientUserId || data.recipientRoleId, {
    message: "E necessario selecionar um destinatario.",
    path: ["recipientUserId"],
  });

const reportInclude = {
  referent: {
    select: { id: true, name: true, imageUrl: true },
  },
  recipientUser: {
    select: { id: true, name: true, imageUrl: true },
  },
  recipientRole: {
    select: { id: true, name: true },
  },
} as const;

// --- FUNCAO POST: Criar um novo report ---
export async function POST(request: Request) {
  try {
    // 1. Garante que o utilizador esta autenticado para poder enviar um report
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Nao autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = reportCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados invalidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }

    const {
      title,
      content,
      category,
      isAnonymous,
      recipientUserId,
      recipientRoleId,
    } = validation.data;

    // 2. Cria o report na base de dados, ligando o 'referent' ao utilizador logado
    const newReport = await prisma.report.create({
      data: {
        title,
        content,
        category,
        isAnonymous,
        status: "SUBMITTED",
        referentId: user.id!,
        recipientUserId,
        recipientNotes: "",
        recipientRoleId,
      },
    });

    // 3. Notifica o(s) destinatario(s)
    const notificationMessage = isAnonymous
      ? "Um report anonimo foi enviado para voce"
      : `Um novo report foi criado por ${user.name.split(" ")[0]}.`;

    const notification = await prisma.notification.create({
      data: {
        link: `/reports`,
        type: "NEW_MENTION",
        notification: notificationMessage,
      },
    });

    if (recipientUserId) {
      await prisma.notificationUser.create({
        data: {
          notificationId: notification.id,
          userId: recipientUserId,
        },
      });
    } else if (recipientRoleId) {
      const usersWithRole = await prisma.user.findMany({
        where: {
          roles: {
            some: { id: recipientRoleId },
          },
        },
        select: { id: true },
      });

      if (usersWithRole.length > 0) {
        await prisma.notificationUser.createMany({
          data: usersWithRole.map((u) => ({
            notificationId: notification.id,
            userId: u.id,
          })),
        });
      }
    }

    return NextResponse.json(newReport, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar report:", error);
    return NextResponse.json(
      { message: "Erro ao criar report." },
      { status: 500 }
    );
  }
}

export async function GET() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Nao autorizado" }, { status: 401 });
  }
  try {
    const reportsForMe = await prisma.report.findMany({
      where: { recipientUserId: authUser.id },
      include: reportInclude,
      orderBy: { createdAt: "desc" },
    });
    const myReports = await prisma.report.findMany({
      where: { referentId: authUser.id },
      include: reportInclude,
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      reportsForMe,
      myReports,
    });
  } catch (error) {
    console.error("Erro ao buscar reports:", error);
    return NextResponse.json(
      { message: "Erro ao buscar reports." },
      { status: 500 }
    );
  }
}
