/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { parseBrazilianDate } from "@/lib/utils";
import {
  CognitoIdentityProviderClient,
  AdminDeleteUserCommand,
  AdminUpdateUserAttributesCommand,
  AdminSetUserPasswordCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { prisma } from "@/db";
import { Prisma } from "@prisma/client";
import { getAuthenticatedUser } from "@/lib/server-utils";
import {
  exMemberUpdateSchema,
  ExMemberUpdateType,
  memberUpdateSchema,
  MemberUpdateType,
} from "@/lib/schemas/profileUpdateSchema";
import { revalidatePath } from "next/cache";
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { s3Client } from "@/lib/aws";
import bcrypt from "bcrypt";
import z from "zod";
import { UserProfileValues } from "@/lib/schemas/memberFormSchema";

// Configuração do cliente Cognito
const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.REGION,
});

// Schema de validação Zod para a atualização de um utilizador (todos os campos são opcionais)

// --- FUNÇÃO GET: Obter um utilizador específico ---
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      // Seleciona os campos a serem retornados, excluindo a senha
      include: {
        roles: true,
        currentRole: true,
        roleHistory: {
          include: { role: { select: { name: true } }, managementReport: true },
        },
        professionalInterests: { include: { category: true } },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "Utilizador não encontrado." },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao buscar utilizador:", error);
    return NextResponse.json(
      { message: "Erro ao buscar utilizador." },
      { status: 500 }
    );
  }
}

// --- FUNÇÃO PATCH: Atualizar um utilizador ---
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const userToUpdate = await prisma.user.findUnique({
      where: { id },
      include: {
        roleHistory: { include: { managementReport: true } },
        currentRole: true,
      },
    });
    if (!userToUpdate) {
      return NextResponse.json(
        { message: "Usuário não encontrado." },
        { status: 404 }
      );
    }

    const { currentRoleId, roleId, isExMember, ...rest } = body;
    const bodyToValidate = currentRoleId
      ? { ...rest, currentRoleId: currentRoleId }
      : roleId
      ? { ...rest, currentRoleId: roleId }
      : { ...rest };
    const idOfCurrentRole = currentRoleId ?? roleId;

    if (!userToUpdate.isExMember && !idOfCurrentRole) {
      return NextResponse.json(
        { message: "Selecione um cargo atual." },
        { status: 400 }
      );
    }

    // A validação Zod usa o schema correto com base no status do usuário no banco

    const validation = userToUpdate.isExMember
      ? exMemberUpdateSchema.safeParse(bodyToValidate)
      : memberUpdateSchema.safeParse(bodyToValidate);

    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors);
      return NextResponse.json(
        {
          message: "Dados de atualização inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const validatedData = validation.data;
    const { professionalInterests, roleHistory, ...restOfUserData } =
      validatedData;
    // --- Inicia a transação do Prisma ---
    const updatedUser = await prisma.$transaction(
      async (tx) => {
        // Objeto base para a atualização do Prisma
        const updateData: Prisma.UserUpdateInput = {
          name: validatedData.name,
          email: validatedData.email,
          emailEJ: validatedData.emailEJ,
          birthDate: parseBrazilianDate(validatedData.birthDate)!,
          phone: validatedData.phone,
          semesterEntryEj: validatedData.semesterEntryEj,
          course: validatedData.course,
          about: validatedData.about,
          instagram: validatedData.instagram,
          linkedin: validatedData.linkedin,
          imageUrl: body.imageUrl,
        };

        if (validatedData.password) {
          updateData.password = await bcrypt.hash(validatedData.password, 10);
        }

        // Lógica de sincronização para Interesses e Histórico
        if (validatedData.professionalInterests) {
          updateData.professionalInterests = {
            set: validatedData.professionalInterests.map((id) => ({ id })),
          };
        }
        if (roleHistory) {
          // 1. Identifica os relatórios que foram REMOVIDOS no frontend
          const incomingReportIds = new Set(
            roleHistory.map((h) => h.managementReport?.id).filter(Boolean)
          );

          const reportsToDelete = userToUpdate.roleHistory
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
          await tx.userRoleHistory.deleteMany({ where: { userId: id } });

          // 4. Cria os novos registros de histórico
          if (roleHistory.length > 0) {
            for (const historyItem of roleHistory) {
              const { managementReport, ...historyData } = historyItem;

              const createdHistory = await tx.userRoleHistory.create({
                data: {
                  user: { connect: { id } },
                  role: { connect: { id: historyData.roleId } },
                  managementReportLink: historyData.managementReportLink,
                  semester: historyData.semester,
                },
              });

              // Se houver um relatório (novo ou antigo mantido), conecta ou cria
              if (managementReport) {
                if (managementReport.id) {
                  // Conecta um relatório existente
                  await tx.userRoleHistory.update({
                    where: { id: createdHistory.id },
                    data: {
                      managementReport: {
                        connect: { id: managementReport.id },
                      },
                    },
                  });
                } else if (managementReport.url) {
                  // Cria um novo anexo para um relatório recém-enviado
                  const newReport = await tx.fileAttachment.create({
                    data: {
                      url: managementReport.url,
                      fileName: managementReport.fileName,
                      fileType: managementReport.fileType,
                    },
                  });
                  await tx.userRoleHistory.update({
                    where: { id: createdHistory.id },
                    data: { managementReportId: newReport.id },
                  });
                }
              }
            }
          }
        }

        // Lógica específica para o tipo de membro
        if (userToUpdate.isExMember) {
          const exMemberData = validatedData as z.infer<
            typeof exMemberUpdateSchema
          >;
          updateData.semesterLeaveEj = exMemberData.semesterLeaveEj;
          updateData.aboutEj = exMemberData.aboutEj;
          updateData.isWorking = exMemberData.isWorking === "Sim";
          updateData.workplace = exMemberData.workplace;
          updateData.alumniDreamer = exMemberData.alumniDreamer === "Sim";
          updateData.roles = {
            set: exMemberData?.roles?.map((id) => ({ id })),
          };
          updateData.currentRole = { disconnect: true }; // Ex-membro não tem cargo atual
        } else {
          const memberData = validatedData as z.infer<
            typeof memberUpdateSchema
          >;
          if (memberData.currentRoleId) {
            updateData.currentRole = {
              connect: { id: memberData.currentRoleId },
            };
          }
          if (isExMember === "Sim" && !userToUpdate.isExMember) {
            updateData.currentRole = {
              disconnect: { id: memberData.currentRoleId },
            };
            updateData.isExMember = true;
            const actualSemester = await prisma.semester.findFirst({
              where: { isActive: true },
            });

            updateData.semesterLeaveEj = actualSemester?.name;
          }
          updateData.roles = {
            set: memberData?.roles?.map((id) => ({ id })),
          };
        }

        // Atualiza o usuário no Prisma
        return await tx.user.update({ where: { id }, data: updateData });
      },

      { timeout: 20000 }
    );

    // --- Operações Externas (Cognito, S3) - Feitas após a transação do DB ser bem-sucedida ---

    // Atualiza a senha no Cognito se uma nova foi fornecida
    if (validatedData.password) {
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: userToUpdate.email,
          Password: validatedData.password,
          Permanent: true,
        })
      );
    }

    //Atualizar Atributos do Cognito
    const cognitoAttributesToUpdate: any[] = [];
    if (isExMember !== undefined && isExMember !== userToUpdate.isExMember) {
      cognitoAttributesToUpdate.push({
        Name: "custom:isExMember",
        Value: isExMember,
      });
    }

    if (
      currentRoleId !== undefined &&
      !userToUpdate.isExMember &&
      currentRoleId !== userToUpdate.currentRole?.id
    ) {
      cognitoAttributesToUpdate.push({
        Name: "custom:role",
        Value: currentRoleId,
      });
    }

    if (validatedData.name !== userToUpdate.name) {
      cognitoAttributesToUpdate.push({
        Name: "name",
        Value: validatedData.name,
      });
    }

    if (validatedData.email !== userToUpdate.email) {
      cognitoAttributesToUpdate.push({
        Name: "email",
        Value: validatedData.email,
      });
      cognitoAttributesToUpdate.push({
        Name: "email_verified",
        Value: "true",
      });
    }

    if (validatedData.phone !== userToUpdate.phone) {
      cognitoAttributesToUpdate.push({
        Name: "phone_number",
        Value: `+55${validatedData.phone.replace(/\D/g, "")}`,
      });
    }

    const parsedBirthDate = parseBrazilianDate(validatedData.birthDate)!;
    if (parsedBirthDate !== userToUpdate.birthDate) {
      cognitoAttributesToUpdate.push({
        Name: "birthdate",
        Value: parsedBirthDate.toISOString().split("T")[0],
      });
    }

    // Prepara e atualiza atributos no Cognito
    if (cognitoAttributesToUpdate.length > 0) {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: userToUpdate.email,
          UserAttributes: cognitoAttributesToUpdate,
        })
      );
    }

    // Deleta imagem antiga do S3 se uma nova foi enviada
    if (
      body.imageUrl &&
      userToUpdate.imageUrl &&
      body.imageUrl !== userToUpdate.imageUrl
    ) {
      const oldKey = new URL(userToUpdate.imageUrl).pathname.substring(1);
      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Key: oldKey,
        })
      );
    }

    revalidatePath(`/perfil`);
    revalidatePath("/");
    revalidatePath("/usuarios");
    revalidatePath("/cultural");
    const { password, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: `O campo ${error.meta?.target} já está em uso.` },
        { status: 409 }
      );
    }
    console.error("Erro ao atualizar utilizador:", error);
    return NextResponse.json(
      { message: "Erro ao atualizar utilizador." },
      { status: 500 }
    );
  }
}

// --- FUNÇÃO DELETE: Apagar um utilizador ---
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  try {
    const { id } = await params;

    // 1. Encontra o utilizador no Prisma para obter o seu e-mail (username do Cognito)
    const user = await prisma.user.findUnique({
      where: { id },
      include: { roleHistory: { include: { managementReport: true } } },
    });
    if (!user) {
      return NextResponse.json(
        { message: "Utilizador não encontrado." },
        { status: 404 }
      );
    }

    const s3KeysToDelete: string[] = [];

    // Adiciona a key do avatar, se existir
    if (user.imageUrl) {
      try {
        const url = new URL(user.imageUrl);
        s3KeysToDelete.push(decodeURIComponent(url.pathname.substring(1)));
      } catch (e) {
        console.error("URL de avatar inválida:", user.imageUrl);
      }
    }

    // Adiciona as keys dos relatórios de gestão, se existirem
    user.roleHistory.forEach((history) => {
      if (history.managementReport?.url) {
        try {
          const url = new URL(history.managementReport.url);
          s3KeysToDelete.push(decodeURIComponent(url.pathname.substring(1)));
        } catch (e) {
          console.error(
            "URL de relatório inválida:",
            history.managementReport.url
          );
        }
      }
    });

    // 3. Deleta os arquivos do S3 em um único lote, se houver algum
    if (s3KeysToDelete.length > 0) {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME!,
          Delete: {
            Objects: s3KeysToDelete.map((key) => ({ Key: key })),
          },
        })
      );
    }

    // 2. Apaga o utilizador do AWS Cognito
    await cognitoClient.send(
      new AdminDeleteUserCommand({
        UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
        Username: user.email, // O username no Cognito é o e-mail
      })
    );

    // 3. Apaga o utilizador da sua base de dados Prisma
    // A relação em cascata (onDelete: Cascade) no modelo UserPoints irá apagar os pontos automaticamente.
    await prisma.user.delete({
      where: { id },
    });
    revalidatePath("/usuarios");
    revalidatePath("/cultural");
    revalidatePath("/");
    return new NextResponse(null, { status: 204 }); // 204 No Content
  } catch (error) {
    console.error("Erro ao apagar utilizador:", error);
    return NextResponse.json(
      { message: "Erro ao apagar utilizador." },
      { status: 500 }
    );
  }
}
