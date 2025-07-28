import { prisma } from "@/db";
import { parseBrazilianDate } from "@/lib/utils";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Extrai os dados do corpo do pedido
    const {
      name,
      email,
      emailEJ,
      password,
      birthDate,
      phone,
      semesterEntryEj,
      semesterLeaveEj,
      course,
      instagram,
      linkedin,
      about,
      aboutEj,
      alumniDreamer,
      roles,
      roleId,
      imageUrl,
      otherRole,
    } = body;

    // Validação básica
    if (!email || !password || !name) {
      return NextResponse.json(
        { message: "Campos essenciais em falta." },
        { status: 400 }
      );
    }

    // Verifica se já existe um pedido ou um utilizador com este e-mail
    const existingRequest = await prisma.registrationRequest.findFirst({
      where: {
        OR: [{ email: email }, { emailEJ: emailEJ }],
      },
    });

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { emailEJ: emailEJ }],
      },
    });

    if (existingRequest || existingUser) {
      return NextResponse.json(
        { message: "Este e-mail já foi utilizado." },
        { status: 409 }
      );
    }
    const parsedBirthDate =
      typeof birthDate === "string" ? parseBrazilianDate(birthDate) : null;

    if (!parsedBirthDate) {
      return NextResponse.json(
        { message: "Data de nascimento inválida. Use o formato DD/MM/AAAA." },
        { status: 400 }
      );
    }

    if (!roleId || typeof roleId !== "string") {
      return NextResponse.json(
        { message: "O cargo principal (roleId) é obrigatório." },
        { status: 400 }
      );
    }

    // 1. Inicia a lista de IDs com o `roleId` principal, garantindo que ele seja o primeiro.
    const finalRoleIds = [roleId];

    // 2. Adiciona os cargos anteriores (`roles`), garantindo que não haja duplicatas.
    if (roles && Array.isArray(roles)) {
      // Filtra os cargos anteriores para incluir apenas IDs que não sejam o `roleId` principal.
      const otherRoles = roles.filter((id) => id && id !== roleId);

      // Usa um Set para remover duplicatas internas da lista `otherRoles` e depois adiciona ao array final.
      finalRoleIds.push(...new Set(otherRoles));
    }

    // 3. Constrói o objeto de conexão para o Prisma.
    const rolesToConnect = finalRoleIds.map((id) => ({ id }));

    // CORREÇÃO 3: Usar a data convertida (`parsedBirthDate`) ao criar o registro.
    await prisma.registrationRequest.create({
      data: {
        name,
        email,
        emailEJ,
        password, // Lembre-se de fazer o hash da senha em produção!
        birthDate: parsedBirthDate, // << USANDO A DATA CORRETA
        phone,
        semesterEntryEj,
        semesterLeaveEj,
        course,
        instagram,
        imageUrl,
        linkedin,
        about,
        aboutEj,
        alumniDreamer: alumniDreamer === "Sim" ? true : false,
        otherRole,
        isExMember: "aboutEj" in body,
        roles: {
          connect: rolesToConnect,
        }, // << USANDO A LÓGICA DE CONEXÃO CORRETA
      },
    });

    return NextResponse.json(
      { message: "Pedido de registo enviado com sucesso!" },
      { status: 201 }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao criar pedido de registo:", error);
    return NextResponse.json(
      { message: `Ocorreu um erro interno no servidor: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const requests = await prisma.registrationRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: {
        roles: true,
      },
    });
    return NextResponse.json({ requests });
  } catch (error) {
    console.error("Erro ao buscar pedidos de registo:", error);
    return NextResponse.json(
      { message: "Erro ao buscar pedidos." },
      { status: 500 }
    );
  }
}
