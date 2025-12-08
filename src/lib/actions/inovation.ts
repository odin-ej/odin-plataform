"use server";
import { prisma } from "@/db";
import { checkUserPermission } from "../utils";
import { INOVATION_LEADERS } from "../permissions";
import { InovationInitiativeStatus } from "@prisma/client";
import { getAuthenticatedUser } from "../server-utils";
import { CreateInovationValues } from "../schemas/inovation";
import { revalidatePath } from "next/cache";
import { s3Client } from "../aws";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 } from "uuid";
import { createNotification } from "./notifications";

async function uploadFileToS3(
  file: File | string | null | undefined
): Promise<string | undefined> {
  if (!file || typeof file === "string") {
    // Se for string (já é URL) ou nulo, retorna como está
    return file as string | undefined;
  }

  // Se for um objeto File (do upload), fazemos o envio
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `iniciativas-inovadoras/${v4()}-${file.name}`; // Ex: inovacao/uuid-capa.jpg

  const command = new PutObjectCommand({
    Bucket: process.env.INOVATION_S3_BUCKET_NAME,
    Key: fileName,
    Body: buffer,
    ContentType: file.type,
  });

  await s3Client.send(command);

  // Retorna a URL pública do arquivo
  return `https://${process.env.INOVATION_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
}

export async function getAllInovationInitiatives() {
  const inovationInitiatives = await prisma.inovationInitiative.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        include: {
          currentRole: true,
          roleHistory: {
            include: {
              role: true,
            },
          },
        },
      },
      members: {
        include: {
          currentRole: true,
          roleHistory: {
            include: {
              role: true,
            },
          },
        },
      },
      relatedFrom: {
        include: {
          from: true,
          to: true,
        },
      },
      relatedTo: {
        include: {
          from: true,
          to: true,
        },
      },
      reviewer: {
        include: {
          currentRole: true,
          roleHistory: {
            include: {
              role: true,
            },
          },
        },
      },
      semester: true,
      links: true,
    },
  });

  return inovationInitiatives;
}

export async function getAllOptionsForWizard() {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
  });

  const formatedUsers = users.map((user) => ({
    label: user.name,
    value: user.id,
  }));

  const inovationInitiatives = await prisma.inovationInitiative.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      semester: true,
      relatedTo: {
        include: {
          to: true,
        },
      },
    },
  });

  const semesters = await prisma.semester.findMany({
    orderBy: { startDate: "desc" },
  });

  return {
    users: formatedUsers,
    inovationInitiatives,
    semesters,
  };
}

export async function createInovationInitiative(data: CreateInovationValues) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Unauthorized");

  try {
    // 1. Upload da Imagem (se houver)
    // O React Server Actions serializa o File object vindo do client
    const imageUrl = await uploadFileToS3(data.imageUrl as unknown as File);

    // 2. Tratamento de Tags (String "A, B" -> Array ["A", "B"])
    const tagsArray =
      typeof data.tags === "string"
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : data.tags;

    // 3. Criação no Banco
    await prisma.inovationInitiative.create({
      data: {
        title: data.title,
        type: data.type,
        shortDescription: data.shortDescription,
        description: data.description,
        status: InovationInitiativeStatus.PENDING, // Sempre começa pendente
        isRunning: Boolean(data.isRunning), // Garante booleano
        semesterId: data.semesterId,
        authorId: authUser.id,
        imageUrl: imageUrl, // URL do S3

        inovationHorizon: data.inovationHorizon || null,

        // Datas
        dateImplemented: data.dateImplemented || null,
        dateColected: data.dateColected || null,
        dateChecked: data.dateChecked || null,

        // Arrays e Enums
        areas: data.areas,
        subAreas: data.subAreas,
        tags: tagsArray,

        // Relacionamentos Conectados
        members: {
          connect: data.members?.map((id) => ({ id })) || [],
        },

        // Links (Nested Create)
        links: {
          create:
            data.links
              ?.filter((l) => l.url)
              .map((l) => ({ label: l.label, url: l.url })) || [],
        },

        // Iniciativa Pai (se houver)
        // Se relatedToId existir, criamos a relação na tabela 'InitiativeRelation'
        relatedTo: data.relatedToId
          ? {
              create: { fromId: data.relatedToId }, // Atenção aqui: ajusta conforme a direção da relação no seu schema
            }
          : undefined,

        // Campos S.O.C.I.O
        sentido: data.sentido,
        organizacao: data.organizacao,
        cultura: data.cultura,
        influencia: data.influencia,
        operacao: data.operacao,
      },
    });

    const gerProd = await prisma.user.findFirst({
      where: { currentRole: { name: "Gerente de Produtos" } },
      select: { id: true },
    });

    const gerDes = await prisma.user.findFirst({
      where: { currentRole: { name: "Gerente de Desenvolvimento" } },
      select: { id: true },
    });

    const doper = await prisma.user.findFirst({
      where: { currentRole: { name: "Diretor(a) de Operações" } },
      select: { id: true },
    });

    createNotification({
      targetUsersIds: [gerProd, gerDes, doper]
        .filter(Boolean)
        .map((u) => u!.id),
      type: "NEW_MENTION",
      description: `Iniciativa "${data.title}" foi criada e está aguardando aprovação.`,
      link: "/inovacao",
    });

    revalidatePath("/inovacao"); // Ajuste o caminho da página
    return { success: true };
  } catch (error) {
    console.error("Erro ao criar iniciativa:", error);
    throw new Error("Falha ao criar iniciativa.");
  }
}

// --- ACTION: Atualizar Iniciativa ---
export async function updateInovationInitiative({
  id,
  data,
}: {
  id: string;
  data: CreateInovationValues & { status?: InovationInitiativeStatus };
}) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Unauthorized");

  try {
    // 1. Upload de nova imagem se houver
    const imageUrl = await uploadFileToS3(data.imageUrl as unknown as File);

    // 2. Tags
    const tagsArray =
      typeof data.tags === "string"
        ? data.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : data.tags;

    // 3. Update
    await prisma.inovationInitiative.update({
      where: { id },
      data: {
        title: data.title,
        type: data.type,
        shortDescription: data.shortDescription,
        description: data.description,
        isRunning: Boolean(data.isRunning),
        semesterId: data.semesterId,
        status: data.status, // Permite mudar status (ex: voltar para PENDING ao reenviar)

        // Atualiza imagem apenas se uma nova foi gerada, senão mantém a anterior
        ...(imageUrl ? { imageUrl } : {}),

        inovationHorizon: data.inovationHorizon || null,

        // Datas
        dateImplemented: data.dateImplemented || null,
        dateColected: data.dateColected || null,
        dateChecked: data.dateChecked || null,

        areas: data.areas,
        subAreas: data.subAreas,
        tags: tagsArray,

        // Atualizar Membros (Set substitui a lista antiga pela nova)
        members: {
          set: data.members?.map((mid) => ({ id: mid })) || [],
        },

        // Atualizar Links (Estratégia: Deletar todos antigos e criar novos)
        links: {
          deleteMany: {},
          create:
            data.links
              ?.filter((l) => l.url)
              .map((l) => ({ label: l.label, url: l.url })) || [],
        },

        // S.O.C.I.O
        sentido: data.sentido,
        organizacao: data.organizacao,
        cultura: data.cultura,
        influencia: data.influencia,
        operacao: data.operacao,
      },
    });

    revalidatePath("/inovacao");
    return { success: true };
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    throw new Error("Falha ao atualizar iniciativa.");
  }
}

// --- ACTION: Auditoria (Aprovar/Rejeitar) ---
export async function auditInovationInitiative({
  id,
  status,
  reviewNotes,
}: {
  id: string;
  status: InovationInitiativeStatus;
  reviewNotes: string;
}) {
  const authUser = await getAuthenticatedUser();
  // Aqui você deve validar se o usuário tem permissão de auditor (ex: checkUserPermission)
  if (!authUser || !checkUserPermission(authUser, INOVATION_LEADERS))
    throw new Error("Unauthorized");

  try {
    const initiative = await prisma.inovationInitiative.update({
      where: { id },
      data: {
        status,
        reviewNotes,
        reviewerId: authUser.id,
        dateChecked: new Date().toISOString(), // Data da auditoria
      },
    });

    createNotification({
      targetUserId: initiative.authorId,
      type: "NEW_MENTION",
      description: `A Iniciativa "${initiative.title}" foi auditada por ${authUser.name}.`,
      link: "/inovacao",
    });

    revalidatePath("/inovacao");
    return { success: true };
  } catch (error) {
    console.error("Erro na auditoria:", error);
    throw new Error("Falha ao realizar auditoria.");
  }
}

export async function deleteInovationInitiativeById(id: string) {
  try {
    const authUser = await getAuthenticatedUser();

    if (!authUser) throw new Error("Unauthorized");

    await prisma.inovationInitiative.delete({
      where: { id },
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao deletar iniciativa:", error);
    throw new Error("Falha ao deletar iniciativa.");
  }
}

export async function togglePinInovationInitiativeById(
  id: string,
  isFixed: boolean
) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Unauthorized");
    await prisma.inovationInitiative.update({
      where: { id },
      data: {
        isFixed: !isFixed,
      },
    });
    return { success: true };
  } catch (error) {
    console.error("Erro ao alterar fixação da iniciativa:", error);
    throw new Error("Falha ao alterar fixação da iniciativa.");
  }
}
