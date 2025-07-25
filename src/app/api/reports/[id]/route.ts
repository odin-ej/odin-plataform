import { getAuthenticatedUser } from "@/lib/server-utils";
import { NextResponse } from "next/server";
import z from "zod";

const reportUpdateSchema = z.object({
  recipientNotes: z.string().min(5, "A descrição precisa de mais detalhes."),
  status: z.enum(["DRAFT", "SUBMITTED", "APPROVED", "REVIEWED"]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const validation = reportUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }
    const updatedReport = await prisma.report.update({
      where: { id },
      data: validation.data,
    });
    return NextResponse.json(updatedReport);
  } catch (error) {
    return NextResponse.json(
      { message: "Erro ao atualizar relatório.", error },
      { status: 500 }
    );
  }
}
