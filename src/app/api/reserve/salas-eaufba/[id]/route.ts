import { NextResponse } from "next/server";
import { z } from "zod";
import { reserveRequestToConectionsSchema } from "@/lib/schemas/requestToConectionsSchema";
import { checkUserPermission } from "@/lib/utils"; // Sua função de verificação de permissão
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { prisma } from "@/db";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";

/**
 * @swagger
 * /api/reserve/salas-eaufba/{id}:
 * patch:
 * summary: Atualiza uma solicitação de reserva.
 * description: Atualiza uma solicitação existente. Um usuário pode editar sua própria solicitação se ela estiver pendente. Um Assessor/Diretor pode alterar o status de qualquer solicitação.
 * tags: [Salas EAUFBA]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ReserveRequestConectionsValues'
 * responses:
 * 200:
 * description: Solicitação atualizada com sucesso.
 * 400:
 * description: Dados inválidos.
 * 401:
 * description: Não autorizado.
 * 403:
 * description: Proibido (ação não permitida).
 * 404:
 * description: Solicitação não encontrada.
 * 500:
 * description: Erro interno do servidor.
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return new NextResponse(" Não autorizado", { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const originalRequest = await prisma.reserveRequestToConections.findUnique({
      where: { id },
    });

    if (!originalRequest) {
      return new NextResponse("Solicitação não encontrada", { status: 404 });
    }

    const userIsAssessor = checkUserPermission(authUser, {
      ...DIRECTORS_ONLY,
      allowedRoles: ["Assessor(a) de Conexões"],
    });

    let updatedRequest;

    if (userIsAssessor) {
      // Assessores podem alterar o status
      const { status } = reserveRequestToConectionsSchema.partial().parse(body);
      if (!status) {
        return new NextResponse("Status é obrigatório para esta ação", {
          status: 400,
        });
      }
      updatedRequest = await prisma.reserveRequestToConections.update({
        where: { id },
        data: { status },
      });

      const notification = await prisma.notification.create({
        data: {
          link: `/salas-eaufba`,
          type: 'NEW_MENTION',
          notification: `A solicitação de reserva: ${originalRequest.title} foi alterada para ${status === 'PENDING' ? 'Pendente' : status === 'APPROVED' ? 'Aprovada' : 'Rejeitada'}.`,
        },
      })

      await prisma.notificationUser.create({
        data: {
          notificationId: notification.id,
          userId: originalRequest.applicantId,
        },
      })

    } else {
      // Usuário comum só pode editar a própria solicitação se estiver PENDENTE
      if (originalRequest.applicantId !== authUser.id) {
        return new NextResponse(
          "Proibido: Você não pode editar a solicitação de outro usuário.",
          { status: 403 }
        );
      }

      const { title, description, date } =
        reserveRequestToConectionsSchema.parse(body);
      console.log(fromZonedTime(date, "America/Sao_Paulo").toISOString())
      updatedRequest = await prisma.reserveRequestToConections.update({
        where: { id },
        data: { title, description, date: fromZonedTime(date, "America/Sao_Paulo").toISOString(), },
      });
    }

    revalidatePath('/central-de-reservas')
    return NextResponse.json(updatedRequest);
  } catch (error) {
    console.error("[SALAS_EAUFBA_PATCH]", error);
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.errors), { status: 400 });
    }
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

/**
 * @swagger
 * /api/reserve/salas-eaufba/{id}:
 * delete:
 * summary: Deleta uma solicitação de reserva.
 * description: Deleta uma solicitação de reserva. Apenas o criador da solicitação pode deletá-la, e somente se o status for 'PENDING'.
 * tags: [Salas EAUFBA]
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * responses:
 * 200:
 * description: Solicitação deletada com sucesso.
 * 401:
 * description: Não autorizado.
 * 403:
 * description: Proibido (ação não permitida).
 * 404:
 * description: Solicitação não encontrada.
 * 500:
 * description: Erro interno do servidor.
 */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const { id } = await params;

    const requestToDelete = await prisma.reserveRequestToConections.findUnique({
      where: { id },
    });

    if (!requestToDelete) {
      return new NextResponse("Solicitação não encontrada", { status: 404 });
    }

    // Apenas o criador pode deletar, e somente se estiver pendente
    if (requestToDelete.applicantId !== authUser.id) {
      return new NextResponse(
        "Proibido: Você não tem permissão para deletar esta solicitação.",
        { status: 403 }
      );
    }

    await prisma.reserveRequestToConections.delete({
      where: { id },
    });
    revalidatePath('/central-de-reservas')
    return NextResponse.json({ message: "Solicitação deletada com sucesso." });
  } catch (error) {
    console.error("[SALAS_EAUFBA_DELETE]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
