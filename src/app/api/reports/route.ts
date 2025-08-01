import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/server-utils";
// O seu utilitário de servidor

// Schema para criar um novo report
const reportCreateSchema = z
  .object({
    title: z.string().min(5, "O título deve ter pelo menos 5 caracteres."),
    content: z.string().min(20, "A descrição precisa de mais detalhes."),
    recipientUserId: z.string().optional(),
    userId: z.string().optional(),
    recipientRoleId: z.string().optional(),
  })
  .refine((data) => data.recipientUserId || data.recipientRoleId, {
    message: "É necessário selecionar um destinatário.",
    path: ["recipientUserId"],
  });

// --- FUNÇÃO POST: Criar um novo report ---
export async function POST(request: Request) {
  try {
    // 1. Garante que o utilizador está autenticado para poder enviar um report
    const user = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const validation = reportCreateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }

    const { title, content, recipientUserId, recipientRoleId } =
      validation.data;
    // 2. Cria o report na base de dados, ligando o 'referent' ao utilizador logado
    const newReport = await prisma.report.create({
      data: {
        title,
        content,
        status: "SUBMITTED", // Inicia com o status "SUBMITTED"
        referentId: user.id!, // O remetente é o utilizador logado
        recipientUserId: recipientUserId,
        recipientNotes: "",
        recipientRoleId: recipientRoleId,
      },
    });

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
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  try {
    const reportsForMe = await prisma.report.findMany({
      where: { recipientUserId: authUser.id },
      include: {
        recipientUser: {
          select: { name: true },
        },
      },
    });
    const myReports = await prisma.report.findMany({
      where: { referentId: authUser.id },
      include: {
        recipientUser: {
          select: { name: true },
        },
      },
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
