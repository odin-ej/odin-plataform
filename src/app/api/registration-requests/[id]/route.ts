/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { prisma } from "@/db"; // Supondo que o seu singleton do Prisma está aqui
import { userProfileSchema } from "@/lib/schemas/memberFormSchema";
import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { checkUserPermission, parseBrazilianDate } from "@/lib/utils";
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/aws";

// --- FUNÇÃO GET: Obter um pedido de registo específico ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const registrationRequest = await prisma.registrationRequest.findUnique({
      where: { id },
      include: {
        roles: true, // Inclui os cargos que o utilizador selecionou
      },
    });

    if (!registrationRequest) {
      return NextResponse.json(
        { message: "Pedido de registo não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(registrationRequest);
  } catch (error) {
    console.error("Erro ao buscar pedido de registo:", error);
    return NextResponse.json(
      { message: "Erro ao buscar pedido de registo." },
      { status: 500 }
    );
  }
}

// --- FUNÇÃO PATCH: Atualizar o status de um pedido (ex: para REJECTED) ---
export async function PATCH(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    if (!body.image || typeof body.image !== "object" || "path" in body.image) {
      delete body.image;
    }
    console.log(body)

    const validation = userProfileSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados de atualização inválidos.",
          errors: validation.error.formErrors.fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      id,
      roleId,
      roles,
      image,
      otherRole,
      imageUrl,
      birthDate,
      isExMember,
      alumniDreamer,
      confPassword,
      isWorking,
      professionalInterests,
      roleHistory,
      ...dataToUpdate
    } = validation.data;



    const parsedBirthDate = parseBrazilianDate(birthDate);
    if (!parsedBirthDate) {
        return NextResponse.json({ message: "Formato de data inválido. Use DD/MM/AAAA." }, { status: 400 });
    }


    // Caso 1: Membro comum (envia apenas roleId)
    const singleRoleArray = roleId && !roles ? [{ id: roleId }] : undefined;

    // Caso 2: Ex-membro (envia vários roles)
    const multipleRolesArray =
      roles && Array.isArray(roles)
        ? roles.map((id: string) => ({ id }))
        : undefined;

    const realOtherRole = !roles?.includes(process.env.OTHER_ROLE_ID as string)
      ? null
      : otherRole;

    const registrationRequest = await prisma.registrationRequest.findUnique({
      where: { id },
      include: { roleHistory: { include: { managementReport: true } }, roles: true },
    });

    if (!registrationRequest) {
      return NextResponse.json(
        { message: "Pedido de registo nao encontrado." },
        { status: 404 }
      );
    }

            if (roleHistory) {
              // 1. Identifica os relatórios que foram REMOVIDOS no frontend
              const incomingReportIds = new Set(
                roleHistory.map((h) => h.managementReport?.id).filter(Boolean)
              );
    
              const reportsToDelete = registrationRequest.roleHistory
                .map((h) => h.managementReport)
                .filter((report) => report && !incomingReportIds.has(report.id));
    
              // 2. Se houver relatórios para deletar, remove-os do S3
              if (reportsToDelete.length > 0) {
                console.log(
                  `Deletando ${reportsToDelete.length} relatório(s) do S3...`
                );
    
                await s3Client.send(
                  new DeleteObjectsCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME!,
                    Delete: {
                      Objects: reportsToDelete.map((r) => {
                        const url = new URL(r!.url);
                        const key = decodeURIComponent(url.pathname.slice(1));
                        return { Key: key };
                      }), // Use a 'key' do seu schema
                    },
                  })
                );
              }
    
              // 3. Apaga todo o histórico de cargos antigo do banco de dados.
              // A cascata cuidará de apagar os FileAttachments associados.
              await prisma.userRoleHistory.deleteMany({ where: { registrationId: id } });
    
              // 4. Cria os novos registros de histórico
              if (roleHistory.length > 0) {
                for (const historyItem of roleHistory) {
                  const { managementReport, ...historyData } = historyItem;
    
                  const createdHistory = await prisma.userRoleHistory.create({
                    data: {
                      registration: { connect: { id } },
                      role: { connect: { id: historyData.roleId } },
                      managementReportLink: historyData.managementReportLink,
                      semester: historyData.semester,
                    },
                  });
    
                  // Se houver um relatório (novo ou antigo mantido), conecta ou cria
                  if (managementReport) {
                    if (managementReport.id) {
                      // Conecta um relatório existente
                      await prisma.userRoleHistory.update({
                        where: { id: createdHistory.id },
                        data: {
                          managementReport: {
                            connect: { id: managementReport.id },
                          },
                        },
                      });
                    } else if (managementReport.url) {
                      // Cria um novo anexo para um relatório recém-enviado
                      const newReport = await prisma.fileAttachment.create({
                        data: {
                          url: managementReport.url,
                          fileName: managementReport.fileName,
                          fileType: managementReport.fileType,
                        },
                      });
                      await prisma.userRoleHistory.update({
                        where: { id: createdHistory.id },
                        data: { managementReportId: newReport.id },
                      });
                    }
                  }
                }
              }
            }

    const updatedRequest = await prisma.registrationRequest.update({
      where: { id },
      data: {
        ...dataToUpdate,
        professionalInterests: {
          set: professionalInterests?.map((id: string) => ({ id })) || [],
        },
        ...(isExMember && { isExMember: isExMember === "Sim" ? true : false }),
        ...(alumniDreamer && {
          alumniDreamer: alumniDreamer === "Sim" ? true : false,
        }),
        ...(isWorking && { isWorking: isWorking === "Sim" ? true : false }),
        ...(imageUrl && { imageUrl }),
        ...(otherRole && { otherRole: realOtherRole }), // só atualiza se vier
        ...(singleRoleArray && {
          roles: { set: singleRoleArray },
        }),
        roleId: roleId ?? null,
        ...(multipleRolesArray && {
          roles: { set: multipleRolesArray },
        }),
        birthDate: parsedBirthDate,
      },
      include: { roles: true },
    });
    revalidatePath("/aprovacao-cadastro");
    return NextResponse.json(updatedRequest);
  } catch (error: any) {
    console.error("Erro ao atualizar pedido de registo:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar pedido de registo." },
      { status: 500 }
    );
  }
}

// --- FUNÇÃO DELETE: Apagar um pedido de registo ---
// Esta função é útil para limpar pedidos rejeitados ou antigos.
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

    if (!hasPermission) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    // Verifica se o pedido existe antes de tentar apagar
    const existingRequest = await prisma.registrationRequest.findUnique({
      where: { id },
    });
    if (!existingRequest) {
      return NextResponse.json(
        { message: "Pedido de registo não encontrado." },
        { status: 404 }
      );
    }

    if (existingRequest.imageUrl) {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: existingRequest.imageUrl,
      });
      await s3Client.send(command);
    }

    await prisma.registrationRequest.delete({
      where: { id },
    });

    revalidatePath("/aprovacao-cadastro");
    return new NextResponse(null, { status: 204 }); // 204 No Content é a resposta padrão para um delete bem-sucedido
  } catch (error) {
    console.error("Erro ao apagar pedido de registo:", error);
    return NextResponse.json(
      { message: "Erro ao apagar pedido de registo." },
      { status: 500 }
    );
  }
}
