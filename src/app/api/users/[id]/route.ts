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
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
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

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      return NextResponse.json(
        { message: "Usuário não encontrado." },
        { status: 404 }
      );
    }
    console.log(body)
    // A validação Zod usa o schema correto com base no status do usuário no banco
    const validation = userToUpdate.isExMember
      ? exMemberUpdateSchema.safeParse(body)
      : memberUpdateSchema.safeParse(body);

    if (!validation.success) {
      console.error(validation.error.flatten().fieldErrors)
      return NextResponse.json(
        {
          message: "Dados de atualização inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }
    const validatedData = validation.data;

    // --- Inicia a transação do Prisma ---
    const updatedUser = await prisma.$transaction(async (tx) => {
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
      if (validatedData.roleHistory) {
        await tx.userRoleHistory.deleteMany({ where: { userId: id } });
        if (validatedData.roleHistory.length > 0) {
          await tx.userRoleHistory.createMany({
            data: validatedData.roleHistory.map((h) => ({ ...h, userId: id })),
          });
        }
      }

      // Lógica específica para o tipo de membro
      if (userToUpdate.isExMember) {
        const exMemberData = validatedData as z.infer<typeof exMemberUpdateSchema>;
        updateData.semesterLeaveEj = exMemberData.semesterLeaveEj;
        updateData.aboutEj = exMemberData.aboutEj;
        updateData.isWorking = exMemberData.isWorking === "Sim";
        updateData.workplace = exMemberData.workplace;
        updateData.alumniDreamer = exMemberData.alumniDreamer === "Sim";
        updateData.roles = { set: exMemberData?.roles?.map((id) => ({ id })) };
        updateData.currentRole = { disconnect: true }; // Ex-membro não tem cargo atual
      } else {
        const memberData = validatedData as z.infer<typeof memberUpdateSchema>;
        if (memberData.currentRoleId) {
          updateData.currentRole = { connect: { id: memberData.currentRoleId } };
        }
      }

      // Atualiza o usuário no Prisma
      return await tx.user.update({ where: { id }, data: updateData });
    });

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

    // Prepara e atualiza atributos no Cognito
    const attributesToUpdate: any[] = [];
    if (validatedData.name !== userToUpdate.name)
      attributesToUpdate.push({ Name: "name", Value: validatedData.name });
    if (validatedData.email !== userToUpdate.email) {
      attributesToUpdate.push({ Name: "email", Value: validatedData.email });
      attributesToUpdate.push({ Name: "email_verified", Value: "true" });
    }
    if (attributesToUpdate.length > 0) {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: userToUpdate.email,
          UserAttributes: attributesToUpdate,
        })
      );
    }

    // Deleta imagem antiga do S3 se uma nova foi enviada
    if (body.imageUrl && userToUpdate.imageUrl && body.imageUrl !== userToUpdate.imageUrl) {
      const oldKey = new URL(userToUpdate.imageUrl).pathname.substring(1);
      await s3Client.send(new DeleteObjectCommand({ Bucket: process.env.AWS_S3_BUCKET_NAME!, Key: oldKey }));
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
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json(
        { message: "Utilizador não encontrado." },
        { status: 404 }
      );
    }

    if (user.imageUrl) {
      const command = new DeleteObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: user.imageUrl,
      });
      await s3Client.send(command);
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
