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
      isWorking,
      workplace,
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

    const existingPhoneUser = await prisma.user.findFirst({
      where: {
        phone: phone,
      },
    });

    const existingPhoneRequest = await prisma.registrationRequest.findFirst({
      where: {
        phone: phone,
      },
    });

    if (existingRequest || existingUser) {
      return NextResponse.json(
        { message: "Este e-mail pessoal ou EJ já foi utilizado." },
        { status: 409 }
      );
    }

    if (existingPhoneRequest || existingPhoneUser) {
      return NextResponse.json(
        { message: "Este telefone já está em uso." },
        { status: 409 }
      );
    }

    if (semesterLeaveEj) {
      if (!semesterLeaveEj.match(/^\d{4}\.\d{1,2}$/)) {
        return NextResponse.json(
          {
            message:
              "Formato de semestre de saída inválido. Use o formato AAAA.S | Ex.: 2025.2",
          },
          { status: 400 }
        );
      }
      const partsSemesterLeave = semesterLeaveEj.trim().split(".");
      const semesterLeave = partsSemesterLeave[1];
      const yearSemesterLeave = partsSemesterLeave[0];
      const partsSemesterEntry = semesterEntryEj.trim().split(".");
      const semesterEntry = partsSemesterEntry[1];
      const yearSemesterEntry = partsSemesterEntry[0];

      if (
        yearSemesterEntry > new Date().getFullYear() ||
        yearSemesterLeave > new Date().getFullYear()
      ) {
        return NextResponse.json(
          {
            message:
              "O semestre de semestre de entrada e saída devem ser anterior ao semestre atual.",
          },
          { status: 400 }
        );
      }

      if (
        yearSemesterLeave < yearSemesterEntry ||
        (yearSemesterLeave === yearSemesterEntry &&
          semesterLeave < semesterEntry)
      ) {
        return NextResponse.json(
          {
            message:
              "O semestre de saída deve ser posterior ao semestre de entrada.",
          },
          { status: 400 }
        );
      }
    }

    const parsedBirthDate =
      typeof birthDate === "string" ? parseBrazilianDate(birthDate) : null;

    if (!parsedBirthDate) {
      return NextResponse.json(
        { message: "Data de nascimento inválida. Use o formato DD/MM/AAAA." },
        { status: 400 }
      );
    }

    const finalRoleIds = [];

    // 2. Adiciona os cargos anteriores (`roles`), garantindo que não haja duplicatas.
    if (roles && Array.isArray(roles)) {
      // Filtra os cargos anteriores para incluir apenas IDs que não sejam o `roleId` principal.
      if (roleId) finalRoleIds.push(roleId);
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
        roleId,
        about,
        aboutEj,
        workplace,
        isWorking: isWorking === "Sim" ? true : false,
        alumniDreamer: alumniDreamer === "Sim" ? true : false,
        otherRole,
        isExMember: "aboutEj" in body,
        roles: {
          connect: rolesToConnect,
        }, // << USANDO A LÓGICA DE CONEXÃO CORRETA
      },
    });
    const allDirectorsID = await prisma.user.findMany({
      where: { currentRole: { area: { has: "DIRETORIA" } } },
      select: { id: true },
    });
    const notification = await prisma.notification.create({
      data: {
        link: "/minhas-pendencias",
        type: "NEW_MENTION",
        notification: `O utilizador ${name} fez uma nova solicitação de registo.`,
      },
    });

    await prisma.notificationUser.createMany({
      data: allDirectorsID.map((user) => ({
        notificationId: notification.id,
        userId: user.id,
      })),
    })

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
