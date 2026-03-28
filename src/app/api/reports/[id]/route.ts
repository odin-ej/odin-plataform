import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { ReportStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import z from "zod";

const reportUpdateSchema = z.object({
  recipientNotes: z.string().min(2, "A descricao precisa de mais detalhes."),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Nao autorizado" }, { status: 401 });
  }
  try {
    // 1. Busca o report para verificar autorizacao
    const report = await prisma.report.findUnique({
      where: { id },
    });

    if (!report) {
      return NextResponse.json(
        { message: "Report nao encontrado." },
        { status: 404 }
      );
    }

    // 2. Verifica autorizacao: recipientUser, users com role correspondente, ou Diretores
    const isRecipientUser = report.recipientUserId === authUser.id;
    const hasRecipientRole = report.recipientRoleId
      ? authUser.roles.some((role) => role.id === report.recipientRoleId)
      : false;
    const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!isRecipientUser && !hasRecipientRole && !isDirector) {
      return NextResponse.json(
        { message: "Sem permissao para atualizar este report." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = reportUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados invalidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }

    const { recipientNotes, status } = validation.data;

    const updateData: {
      recipientNotes: string;
      status: ReportStatus;
      resolvedAt?: Date;
    } = {
      recipientNotes,
      status: status as ReportStatus,
    };

    if (status === "APPROVED" || status === "REJECTED") {
      updateData.resolvedAt = new Date();
    }

    const updatedReport = await prisma.report.update({
      where: { id },
      data: updateData,
    });

    // 3. Notifica o remetente (referent) do report
    if (updatedReport.referentId) {
      const notification = await prisma.notification.create({
        data: {
          link: `/reports`,
          notification: `O report ${updatedReport.title} foi atualizado. Clique no link para ver os detalhes.`,
          type: "NEW_MENTION",
        },
      });

      await prisma.notificationUser.create({
        data: {
          notificationId: notification.id,
          userId: updatedReport.referentId,
        },
      });
    }

    return NextResponse.json(updatedReport);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao atualizar relatorio.", error },
      { status: 500 }
    );
  }
}
