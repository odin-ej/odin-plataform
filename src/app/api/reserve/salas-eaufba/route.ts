import { NextResponse } from "next/server"; // Sua função para obter o usuário da sessão
import { reserveRequestToConectionsSchema } from "@/lib/schemas/requestToConectionsSchema";
import { z } from "zod";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { prisma } from "@/db";

/**
 * @swagger
 * /api/reserve/salas-eaufba:
 * get:
 * summary: Lista todas as solicitações de reserva.
 * description: Retorna uma lista de todas as solicitações de reserva de salas da EAUFBA, incluindo informações do solicitante. Requer autenticação.
 * tags: [Salas EAUFBA]
 * responses:
 * 200:
 * description: Lista de solicitações retornada com sucesso.
 * 401:
 * description: Não autorizado (usuário não autenticado).
 * 500:
 * description: Erro interno do servidor.
 */
export async function GET() {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return new NextResponse("Não autorizado", { status: 401 });
    }

    const reserveRequests = await prisma.reserveRequestToConections.findMany({
      include: {
        applicant: true, // Inclui os dados do usuário que fez a solicitação
      },
      orderBy: {
        date: "desc", // Ordena pelas mais recentes
      },
    });

    return NextResponse.json(reserveRequests);
  } catch (error) {
    console.error("[SALAS_EAUFBA_GET]", error);
    return NextResponse.json({ message: "Erro ao buscar solicitações." }, { status: 500 });
  }
}

/**
 * @swagger
 * /api/reserve/salas-eaufba:
 * post:
 * summary: Cria uma nova solicitação de reserva.
 * description: Cria uma nova solicitação de reserva de sala. O ID do solicitante e do cargo são extraídos da sessão do usuário autenticado.
 * tags: [Salas EAUFBA]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/ReserveRequestConectionsValues'
 * responses:
 * 201:
 * description: Solicitação criada com sucesso.
 * 400:
 * description: Dados inválidos.
 * 401:
 * description: Não autorizado.
 * 500:
 * description: Erro interno do servidor.
 */
export async function POST(req: Request) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return  NextResponse.json({message:" Não autorizado"}, { status: 401 });
    }

    const body = await req.json();

    // Valida o corpo da requisição com o schema Zod
    const validatedBody = reserveRequestToConectionsSchema.parse(body);
    const { title, description, date } = validatedBody;

    const conectionsRole = await prisma.role.findUnique({
      where: { name: "Assessor(a) de Conexões" },
    });
    if (!conectionsRole) {
      return NextResponse.json(
        { message: "Cargo de Conexões não encontrado" },
        { status: 404 }
      );
    }

    const newRequest = await prisma.reserveRequestToConections.create({
      data: {
        title,
        description,
        date: new Date(date),
        applicantId: authUser.id, // ID do usuário vem da sessão, não do body
        roleId: conectionsRole.id,
        status: "PENDING", // O status inicial é sempre pendente
      },
    });
    revalidatePath("/salas-eaufba");
    return NextResponse.json(newRequest, { status: 201 });
  } catch (error) {
    console.error("[SALAS_EAUFBA_POST]", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(JSON.stringify(error.issues), { status: 400 });
    }

    return NextResponse.json("Erro Interno do Servidor", { status: 500 });
  }
}