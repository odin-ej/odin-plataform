/* eslint-disable @typescript-eslint/no-unused-vars */
import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

const semesterCreateSchema = z.object({
  name: z
    .string()
    .min(3, "O nome do semestre é obrigatório.")
    .regex(
      /^\d{4}\.[12]$/,
      "O formato do nome deve ser AAAA.S (ex: 2025.1 ou 2025.2)"
    ),
  startDate: z.coerce.date({
    required_error: "A data de início é obrigatória.",
  }),
  endDate: z.coerce.date(),
});

// --- CRIAR UM NOVO SEMESTRE (POST) ---
export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = semesterCreateSchema.parse(body);

    // Verifica se já existe um semestre com o mesmo nome
    const existingSemester = await prisma.semester.findUnique({
      where: { name: validatedData.name },
    });
    if (existingSemester) {
      return NextResponse.json(
        {
          message: `Um semestre com o nome '${validatedData.name}' já existe.`,
        },
        { status: 409 }
      ); // 409 Conflict
    }

    const performedStartDateObject = fromZonedTime(validatedData.startDate, 'America/Sao_Paulo');
    const performedEndDateObject = fromZonedTime(validatedData.endDate, 'America/Sao_Paulo');

    const newSemester = await prisma.semester.create({
      data: {
        name: validatedData.name,
        startDate: performedStartDateObject,
        endDate: performedEndDateObject,
        isActive: false, // Novos semestres são criados como inativos por padrão
      },
    });

    revalidatePath("/gerenciar-jr-points"); // Atualiza a lista no admin

    return NextResponse.json(newSemester, { status: 201 }); // 201 Created
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: error.flatten() },
        { status: 400 }
      );
    }
    console.error("[SEMESTER_CREATE_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}

// --- LISTAR TODOS OS SEMESTRES (GET) ---
// É útil ter esta função no mesmo arquivo para preencher a tabela no admin
export async function GET(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado." }, { status: 401 });
    }

    const semesters = await prisma.semester.findMany({
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json(semesters);
  } catch (error) {
    console.error("[SEMESTERS_GET_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
