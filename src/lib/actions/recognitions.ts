/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";
import { prisma } from "@/db";
import { NotificationType, RecognitionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { s3Client } from "../aws";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getAuthenticatedUser } from "../server-utils";
import { createNotification } from "./notifications";

export async function getYearlyValueSchedule(year: number) {
  return await prisma.monthlyValueSchedule.findMany({
    where: { year },
    include: {
      value: true,
      recognitions: {
        include: {
          winners: true,
          media: true,
          receivedFrom: true,
          recognitionModel: true,
          author: true,
        },
      },
    },
    orderBy: { month: "asc" },
  });
}

export async function getLatestRecognitions(limit = 5) {
  return await prisma.recognition.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      winners: true,
      media: true,
      recognitionModel: true,
      schedule: { include: { value: true } },
    },
  });
}

export async function getAllValues() {
  const values = await prisma.value.findMany({
    orderBy: { name: "asc" },
  });
  return values;
}

export async function upsertMonthlySchedule(data: {
  month: number;
  year: number;
  valueId: string;
}) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    const schedule = await prisma.monthlyValueSchedule.upsert({
      where: {
        month_year: {
          month: data.month,
          year: data.year,
        },
      },
      update: {
        valueId: data.valueId,
      },
      create: {
        month: data.month,
        year: data.year,
        valueId: data.valueId,
      },
    });

    revalidatePath("/reconhecimentos");
    return { success: true, data: schedule };
  } catch (error) {
    console.error("Erro ao salvar cronograma:", error);
    throw new Error("Falha ao salvar o cronograma do mês.");
  }
}

export async function toggleModelStatus(id: string, currentStatus: boolean) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    await prisma.recognitionModel.update({
      where: { id },
      data: { isActive: !currentStatus },
    });
  } catch (error) {
    console.error("Erro ao alterar status do modelo:", error);
    throw new Error("Falha ao alterar o status do modelo de reconhecimento.");
  }

  revalidatePath("/reconhecimentos");
}

export async function deleteRecognitionModel(id: string) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    await prisma.recognitionModel.delete({
      where: { id },
    });
  } catch (error) {
    console.error("Erro ao deletar modelo:", error);
    throw new Error("Falha ao deletar o modelo de reconhecimento.");
  }

  revalidatePath("/reconhecimentos");
}

export async function createRecognitionModel(data: {
  title: string;
  type: any;
  areas: any[];
  description?: string;
}) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    throw new Error("Usuário não autenticado.");
  }
  try {
    await prisma.recognitionModel.create({
      data: { ...data },
    });
  } catch (error) {
    console.error("Erro ao criar modelo:", error);
    throw new Error("Falha ao criar o modelo de reconhecimento.");
  }
  revalidatePath("/reconhecimentos");
}

export async function updateRecognitionModel(
  id: string,
  data: {
    title: string;
    type: RecognitionType;
    description?: string;
    areas: any[];
  }
) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    await prisma.recognitionModel.update({
      where: { id },
      data: { ...data },
    });
  } catch (error) {
    console.error("Erro ao atualizar modelo:", error);
    throw new Error("Falha ao atualizar o modelo de reconhecimento.");
  }

  revalidatePath("/reconhecimentos");
}

export async function deleteRecognition(id: string) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    throw new Error("Usuário não autenticado.");
  }

  try {
    //Deletar imagem aws
    const recognition = await prisma.recognition.findUnique({
      where: { id },
      include: { media: true },
    });

    if (recognition?.media) {
      const deleteParams = {
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: recognition.media[0].url.split(`.amazonaws.com/`)[1],
      };

      await s3Client.send(new DeleteObjectCommand(deleteParams));
    }

    await prisma.recognition.delete({
      where: { id },
    });

    revalidatePath("/reconhecimentos");
  } catch (error) {
    console.error("Erro ao deletar reconhecimento:", error);
    throw new Error("Falha ao deletar o reconhecimento.");
  }
}

export async function assignRecognitionToUser(formData: FormData) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    throw new Error("Usuário não autenticado.");
  }

  // 1. Extração dos dados do FormData
  const userId = formData.get("userId") as string;
  const date = formData.get("date") as string;
  const description = formData.get("description") as string;
  const scheduleId = formData.get("scheduleId") as string;
  const receivedFromId = formData.get("receivedFromId") as string;
  const mediaUrl = formData.get("mediaUrl") as string;

  try {
    // 2. Busca automática do Modelo "Casinha"
    // Buscamos pelo tipo e garantimos que esteja ativo
    const model = await prisma.recognitionModel.findFirst({
      where: {
        title: {
          equals: "Casinha",
          mode: "insensitive",
        },
        isActive: true,
      },
    });

    if (!model)
      throw new Error("Modelo de 'Casinha' não configurado no sistema.");

    // 4. Transação no Banco de Dados
    const result = await prisma.$transaction(async (tx) => {
      const winner = await tx.user.findUnique({
        where: {
          id: userId,
        },
      });

      const giver = await tx.user.findUnique({
        where: {
          id: receivedFromId,
        },
      });

      const schedule = await tx.monthlyValueSchedule.findUnique({
        where: {
          id: scheduleId,
        },
      });

      const usersToNotificate = await tx.user.findMany({
      where: {
        id: { not: authUser.id },
        isExMember: false,
      },
      select: {
        id: true,
      },
    });

    await createNotification({
      description: `${winner.name.slice(" ")[0]} recebeu a casinha de ${
        giver.name.slice(" ")[0]
      } no valor: ${schedule.monthlyValue}!`,
      link: "/reconhecimentos",
      type: NotificationType.NEW_MENTION,
      targetUsersIds: usersToNotificate.map((user) => user.id),
    });

      return await tx.recognition.create({
        data: {
          date: date,
          description: description,
          modelTitleSnapshot: model.title, // Snapshot de segurança
          recognitionModelId: model.id,
          scheduleId: scheduleId,
          authorId: authUser.id,
          receivedFromId: receivedFromId,
          winners: {
            connect: { id: userId },
          },
          // Se houver foto, cria o anexo vinculado
          ...(mediaUrl && {
            media: {
              create: {
                fileName: "Foto - Casinha",
                url: mediaUrl,
                fileType: "image/jpeg",
              },
            },
          }),
        },
      });
    });

    

    revalidatePath("/reconhecimentos");
    return { success: true, data: result };
  } catch (error) {
    console.error("Erro no reconhecimento:", error);
    throw new Error("Falha ao processar reconhecimento de casinha.");
  }
}

export async function getActiveRecognitionModels() {
  return await prisma.recognitionModel.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
  });
}

export async function getAllRecognitionModels() {
  return await prisma.recognitionModel.findMany({
    orderBy: { title: "asc" },
  });
}

export async function getAllUsers() {
  return await prisma.user.findMany({
    where: { isExMember: false, id: { not: process.env.ADMIN_ID as string } },
    orderBy: { name: "asc" },
  });
}
