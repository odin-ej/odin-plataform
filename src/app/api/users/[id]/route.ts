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

    const isExMember = body.isExMember === "Sim";
    // A validação usa o schema correto
    const validation = isExMember
      ? exMemberUpdateSchema.safeParse(body)
      : memberUpdateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          message: "Dados de atualização inválidos.",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const userToUpdate = await prisma.user.findUnique({ where: { id } });
    if (!userToUpdate) {
      return NextResponse.json(
        { message: "Utilizador não encontrado." },
        { status: 404 }
      );
    }
    const currentUser = await prisma.user.findUnique({ where: { id } });
    if (!currentUser) {
      return NextResponse.json(
        { message: "Utilizador não encontrado." },
        { status: 404 }
      );
    }

    const oldImageUrl = currentUser.imageUrl;

    // 2. Se a nova `imageUrl` for diferente da antiga, apaga a antiga do S3.
    if (body.imageUrl && oldImageUrl && body.imageUrl !== oldImageUrl) {
      try {
        const oldKey = oldImageUrl.split("/").pop();
        if (oldKey) {
          await s3Client.send(
            new DeleteObjectCommand({
              Bucket: process.env.AWS_S3_BUCKET_NAME!,
              Key: oldKey,
            })
          );
        }
      } catch (s3Error) {
        console.error("Falha ao apagar a imagem antiga do S3:", s3Error);
        // Continua o processo mesmo que a exclusão da imagem antiga falhe.
      }
    }



    // CORREÇÃO: A desestruturação foi removida para tratar os tipos de união corretamente.
    const validatedData = validation.data;

    const parsedBirthDate =
      typeof validatedData.birthDate === "string"
        ? parseBrazilianDate(validatedData.birthDate)
        : null;

    // 1. Prepara os dados escalares para a atualização do Prisma
    const updateData: Prisma.UserUpdateInput = {
      name: validatedData.name,
      email: validatedData.email,
      emailEJ: validatedData.emailEJ,
      birthDate: parsedBirthDate as Date, // Converte a string para um objeto Date
      phone: validatedData.phone,
      semesterEntryEj: validatedData.semesterEntryEj,
      course: validatedData.course,
      about: validatedData.about,
      instagram: validatedData.instagram,
      linkedin: validatedData.linkedin,
      isExMember, // Já é um booleano
      alumniDreamer: validatedData.alumniDreamer === "Sim",
    };

    if (body.imageUrl) {
      updateData.imageUrl = body.imageUrl;
    }

    // Atualiza a senha apenas se uma nova foi fornecida
    if (validatedData.password && validatedData.password.length > 0) {
      await cognitoClient.send(
        new AdminSetUserPasswordCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: userToUpdate.email, // O e-mail é o username no Cognito
          Password: validatedData.password, // Envia a senha em texto plano
          Permanent: true, // Define a senha como permanente (não expira)
        })
      );

      updateData.password = await bcrypt.hash(validatedData.password, 10);
    }

    // 2. Prepara os atributos para o AWS Cognito
    const attributesToUpdate = [];
    if (validatedData.name)
      attributesToUpdate.push({ Name: "name", Value: validatedData.name });
    if (validatedData.phone)
      attributesToUpdate.push({
        Name: "phone_number",
        Value: `+55${validatedData.phone.replace(/\D/g, "")}`,
      });

    if (validatedData.email && validatedData.email !== userToUpdate.email) {
      attributesToUpdate.push({ Name: "email", Value: validatedData.email });
      // É uma boa prática definir o e-mail como não verificado após a alteração.
      attributesToUpdate.push({ Name: "email_verified", Value: "true" });
    }

    // 3. Implementa a lógica de cargos de forma coerente com o schema
    if (isExMember) {
      const exMemberData = validatedData as ExMemberUpdateType;
      updateData.semesterLeaveEj = exMemberData.semesterLeaveEj;
      updateData.aboutEj = exMemberData.aboutEj;
      updateData.otherRole = exMemberData.otherRole;

      if (exMemberData.roles && exMemberData.roles.length > 0) {
        updateData.roles = { set: exMemberData.roles.map((id) => ({ id })) };
        // Ex-membros não têm um 'currentRole' ativo
        updateData.currentRole = { disconnect: true };
      }

      if (!exMemberData.roles.includes(process.env.OTHER_ROLE_ID as string)) {
        updateData.otherRole = null;
      }
    } else {
      // Lógica para Membros Ativos
      const memberData = validatedData as MemberUpdateType;
      updateData.isExMember = false;

      const uniqueRoleIds = new Set<string>();

      // 1. Adiciona o cargo ATUAL (obrigatório para membros ativos)
      if (memberData.roleId) {
        uniqueRoleIds.add(memberData.roleId);
        updateData.currentRole = { connect: { id: memberData.roleId } };

        // Atualiza o atributo customizado no Cognito com o cargo atual
        const currentRole = await prisma.role.findUnique({
          where: { id: memberData.roleId },
        });
        if (currentRole) {
          attributesToUpdate.push({
            Name: "custom:role",
            Value: currentRole.name,
          });
        }
      }

      // 2. Adiciona os cargos ANTERIORES (opcional)
      if (memberData.roles && Array.isArray(memberData.roles)) {
        memberData.roles.forEach((id) => uniqueRoleIds.add(id));
      }

      // 3. Define a lista completa de cargos para a relação
      updateData.roles = {
        set: Array.from(uniqueRoleIds).map((id) => ({ id })),
      };
    }

    // 4. Atualiza os atributos no Cognito se houver alterações
    if (attributesToUpdate.length > 0) {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: process.env.AWS_COGNITO_USER_POOL_ID!,
          Username: userToUpdate.email,
          UserAttributes: attributesToUpdate,
        })
      );
    }

    // 5. Atualiza o utilizador na base de dados
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    const { password: _, ...userWithoutPassword } = updatedUser;

    if (updatedUser.id === authUser.id) revalidatePath(`/perfil`);
    revalidatePath("/");
    revalidatePath("/usuarios");
    revalidatePath("/cultural");
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
