/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { revalidatePath } from "next/cache";
import { FullDirectConversation } from "@/app/_components/Dashboard/comunidade/DirectConversationContent";
import AES from "crypto-js/aes";
import Utf8 from "crypto-js/enc-utf8";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import * as crypto from "crypto";
import { z } from "zod";
import { s3Client } from "../aws";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { FullChannel } from "@/app/_components/Dashboard/comunidade/ChannelContent";
import {
  AreaRoles,
  ChannelMemberRole,
  ChannelMessage,
  ChannelType,
  DirectMessage,
  NotificationType,
  Prisma,
} from "@prisma/client";
import { checkUserPermission, getLabelForRoleArea } from "../utils";
import { DIRECTORS_ONLY } from "../permissions";

const generateFileName = (bytes = 32) =>
  crypto.randomBytes(bytes).toString("hex");

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getPresignedUrlSchema = z.object({
  fileType: z.string(),
  fileSize: z.number(),
  conversationId: z.string(),
});

export async function getPresignedUrlForAttachment(
  data: z.infer<typeof getPresignedUrlSchema>
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const { fileType, fileSize, conversationId } = data;
  if (fileSize > 10 * 1024 * 1024)
    throw new Error("O arquivo não pode exceder 10MB.");

  const fileName = generateFileName();
  const fileExtension = fileType.split("/")[1];
  const key = `conversations/${conversationId}/attachments/${fileName}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: process.env.COMMUNITY_S3_BUCKET_NAME!,
    Key: key,
    ContentType: fileType,
    ContentLength: fileSize,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn: 300 }); // 5 minutos para fazer o upload

  return { url, key };
}

export async function getChannelById(
  channelId: string
): Promise<FullChannel | null> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");
    const channel = await prisma.channel.findFirst({
      where: {
        id: channelId,
      },
      include: {
        members: {
          include: {
            user: {
              include: {
                currentRole: true,
              },
            },
          },
        },
        messages: {
          include: {
            author: true,
            attachments: true,
            parent: true,
            reactions: { include: { user: true } },
            replies: { include: { author: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    return channel;
  } catch (error) {
    console.error("Erro ao buscar canal:", error);
    return null;
  }
}

export async function getConversationById(
  conversationId: string
): Promise<FullDirectConversation | null> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");

    const conversation = await prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: authUser.id } },
      },
      include: {
        participants: {
          include: {
            roles: true,
            currentRole: true,
            posts: true,
          },
        },
        messages: {
          include: {
            author: {
              include: {
                roles: true,
                currentRole: true,
                posts: true,
              },
            },
            attachments: true,
            reactions: {
              include: {
                customEmoji: true,
                user: {
                  include: {
                    roles: true,
                    currentRole: true,
                    posts: true,
                  },
                },
              },
            },
            parent: {
              include: {
                author: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return conversation;
  } catch (error) {
    console.error("Erro ao buscar conversa:", error);
    return null;
  }
}

/**
 * Atualiza o título de uma conversa em grupo.
 * @returns Um objeto com status de sucesso ou erro.
 */
export async function updateConversationTitle({
  conversationId,
  title,
}: {
  conversationId: string;
  title: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");

    if (title.length < 3 || title.length > 30) {
      throw new Error("O título deve ter entre 3 e 30 caracteres.");
    }

    // Verifica se o usuário pertence à conversa que está tentando editar
    const conversation = await prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: authUser.id } },
      },
      include: { participants: true },
    });

    if (!conversation)
      throw new Error("Conversa não encontrada ou acesso negado.");
    if (conversation.participants.length <= 2)
      throw new Error("Apenas conversas em grupo podem ter o título alterado.");

    await prisma.directConversation.update({
      where: { id: conversationId },
      data: { title },
    });
    revalidatePath("/comunidade");
    revalidatePath(`/comunidade/conversas/${conversationId}`);
    return { success: true, message: "Título atualizado com sucesso!" };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || "Falha ao atualizar o título.",
    };
  }
}

export async function deleteConversation({
  conversationId,
}: {
  conversationId: string;
}) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");

    const conversation = await prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: authUser.id } },
      },
    });

    if (authUser.id !== conversation?.createdById) {
      throw new Error("Somente o criador pode deletar a conversa.");
    }

    if (!conversation) {
      throw new Error("Essa conversa não existe");
    }
    // Deleta a conversa para todos os participantes
    await prisma.directConversation.delete({ where: { id: conversationId } });
    return { success: true, message: "Conversa deletada com sucesso!" };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Houve um erro ao tentar deletar a conversa.",
    };
  }
}

export async function deleteChannel({ channelId }: { channelId: string }) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");

    const channel = await prisma.channel.findFirst({
      where: { id: channelId },
    
    });


    if (!channel) {
      throw new Error("Canal não encontrado");
    }

       if(authUser.id !== channel?.createdById) {
      throw new Error('Somente o criador pode deletar o canal.')
    }

    // Deleta o canal para todos os membros
    await prisma.channel.delete({ where: { id: channelId } });
    revalidatePath("/comunidade");
    return { success: true, message: "Canal deletado com sucesso!" };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Houve um erro ao tentar deletar o canal.",
    };
  }
}

export async function leaveConversation({
  conversationId,
}: {
  conversationId: string;
}) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");
    const conversation = await prisma.directConversation.findFirst({
      where: {
        id: conversationId,
        participants: { some: { id: authUser.id } },
      },
    });
    if (!conversation) {
      throw new Error("Conversa não encontrada");
    }
    // Remove o usuário da conversa
    await prisma.directConversation.update({
      where: { id: conversationId },
      data: {
        participants: {
          disconnect: { id: authUser.id },
        },
      },
    });
    revalidatePath("/comunidade");
    return { success: true, message: "Você saiu da conversa." };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Houve um erro ao tentar sair da conversa.",
    };
  }
}

type ContextType = "direct" | "channel";

const ENCRYPTION_KEY =
  process.env.MESSAGING_ENCRYPTION_KEY || "default_encryption_key";

const encryptMessage = (text: string) =>
  AES.encrypt(text, ENCRYPTION_KEY).toString();

export async function decryptMessage(
  encryptedContent: string
): Promise<string> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      throw new Error("Não autorizado");
    }

    // Se o conteúdo estiver vazio ou nulo, não há nada para descriptografar
    if (!encryptedContent) {
      return "";
    }

    const bytes = AES.decrypt(encryptedContent, ENCRYPTION_KEY);
    const originalText = bytes.toString(Utf8);

    if (!originalText) {
      // Isso pode acontecer se a chave estiver errada ou os dados corrompidos
      return "Falha ao carregar mensagem.";
    }

    return originalText;
  } catch (error) {
    console.error("Erro ao descriptografar mensagem:", error);
    return "Erro ao carregar mensagem.";
  }
}

export async function sendMessage(
  formData: FormData,
  contextType: ContextType,
  contextId: string
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const content = formData.get("content") as string;
  const parentId = formData.get("parentId") as string | null;
  const attachmentsJson = formData.get("attachments") as string;
  const attachments = attachmentsJson ? JSON.parse(attachmentsJson) : [];

  if (!content && attachments.length === 0) {
    throw new Error("A mensagem não pode estar vazia.");
  }

  const encryptedContent = content ? encryptMessage(content) : "";
  const attachmentCreateData = attachments.map(
    (att: { key: string; fileName: string; fileType: string }) => ({
      url: att.key,
      fileName: att.fileName,
      fileType: att.fileType,
    })
  );

  let newMessage;
  if (contextType === "direct") {
    newMessage = await prisma.directMessage.create({
      data: {
        content: encryptedContent,
        authorId: authUser.id,
        conversationId: contextId, // Usa contextId
        ...(parentId && { parentId }),
        attachments: { create: attachmentCreateData },
      },
    });
    revalidatePath(`/comunidade/conversas/${contextId}`);
  } else if (contextType === "channel") {
    newMessage = await prisma.channelMessage.create({
      data: {
        content: encryptedContent,
        authorId: authUser.id,
        channelId: contextId, // Usa contextId
        ...(parentId && { parentId }),
        attachments: { create: attachmentCreateData },
        // isPinned: false, // Default
      },
    });
    revalidatePath(`/comunidade/canal/${contextId}`);
  } else {
    throw new Error("Tipo de contexto inválido.");
  }

  return { success: true, message: newMessage };
}
export async function editMessage(
  messageId: string,
  newContent: string,
  contextType: ContextType
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  let message: DirectMessage | ChannelMessage | null = null;
  let contextId: string | null = null;

  if (contextType === "direct") {
    message = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });
    contextId = message?.conversationId ?? null;
  } else if (contextType === "channel") {
    message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
    });
    contextId = message?.channelId ?? null;
  }

  if (!message || message.authorId !== authUser.id) {
    throw new Error("Acesso negado ou mensagem não encontrada.");
  }
  if (!contextId) {
    throw new Error("Contexto da mensagem não encontrado.");
  }

  const encryptedContent = encryptMessage(newContent);

  if (contextType === "direct") {
    await prisma.directMessage.update({
      where: { id: messageId },
      data: { content: encryptedContent, isEdited: true },
    });
    revalidatePath(`/comunidade/conversas/${contextId}`);
  } else if (contextType === "channel") {
    await prisma.channelMessage.update({
      where: { id: messageId },
      data: { content: encryptedContent, isEdited: true },
    });
    revalidatePath(`/comunidade/canal/${contextId}`);
  }

  return { success: true };
}

// --- deleteMessage ---
export async function deleteMessage(
  messageId: string,
  contextType: ContextType
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  let message:
    | ((DirectMessage | ChannelMessage) & { attachments: { url: string }[] })
    | null = null;
  let contextId: string | null = null;

  if (contextType === "direct") {
    message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: { attachments: { select: { url: true } } },
    });
    contextId = message?.conversationId ?? null;
  } else if (contextType === "channel") {
    message = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      include: { attachments: { select: { url: true } } },
    });
    contextId = message?.channelId ?? null;
  }

  if (!message || message.authorId !== authUser.id) {
    throw new Error("Acesso negado ou mensagem não encontrada.");
  }
  if (!contextId) {
    throw new Error("Contexto da mensagem não encontrado.");
  }

  // Deletar anexos S3 (lógica unificada)
  if (message.attachments.length > 0) {
    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: process.env.COMMUNITY_S3_BUCKET_NAME!,
        Delete: { Objects: message.attachments.map((a) => ({ Key: a.url })) },
      })
    );
    // TODO: Também deletar os registros FileAttachment do banco? Depende do seu schema.
  }

  // Deletar mensagem
  if (contextType === "direct") {
    await prisma.directMessage.delete({ where: { id: messageId } });
    revalidatePath(`/comunidade/conversas/${contextId}`);
  } else if (contextType === "channel") {
    // Soft delete ou hard delete? Se hard delete:
    await prisma.channelMessage.delete({ where: { id: messageId } });
    // Se soft delete:
    // await prisma.channelMessage.update({ where: { id: messageId }, data: { isDeleted: true, content: encryptMessage("[Mensagem deletada]") } });
    revalidatePath(`/comunidade/canal/${contextId}`);
  }

  return { success: true };
}

// --- toggleReaction ---
export async function toggleReaction(
  messageId: string,
  reaction: { emoji?: string; customEmojiId?: string },
  contextType: ContextType
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const { emoji, customEmojiId } = reaction;
  if (!emoji && !customEmojiId) throw new Error("Reação inválida.");

  const whereClause: Prisma.MessageReactionWhereInput = {
    userId: authUser.id,
  };
  if (contextType === "direct") {
    whereClause.directMessageId = messageId;
  } else if (contextType === "channel") {
    whereClause.channelMessageId = messageId;
  } else {
    throw new Error("Tipo de contexto inválido.");
  }

  const existingReaction = await prisma.messageReaction.findFirst({
    where: whereClause,
  });

  await prisma.$transaction(async (tx) => {
    if (existingReaction) {
      await tx.messageReaction.delete({ where: { id: existingReaction.id } });

      const isDifferentReaction =
        existingReaction.emoji !== emoji ||
        existingReaction.customEmojiId !== customEmojiId;
      if (isDifferentReaction) {
        // Cria a nova reação
        await tx.messageReaction.create({
          data: {
            userId: authUser.id,
            emoji,
            customEmojiId,
            // Conecta ao tipo de mensagem correto
            ...(contextType === "direct" ? { directMessageId: messageId } : {}),
            ...(contextType === "channel"
              ? { channelMessageId: messageId }
              : {}),
          },
        });
      }
    } else {
      // Cria a nova reação
      await tx.messageReaction.create({
        data: {
          userId: authUser.id,
          emoji,
          customEmojiId,
          // Conecta ao tipo de mensagem correto
          ...(contextType === "direct" ? { directMessageId: messageId } : {}),
          ...(contextType === "channel" ? { channelMessageId: messageId } : {}),
        },
      });
    }
  });

  // Revalidação - Busca a mensagem original para pegar o ID do contexto
  let contextId: string | null = null;
  if (contextType === "direct") {
    const msg = await prisma.directMessage.findUnique({
      where: { id: messageId },
      select: { conversationId: true },
    });
    contextId = msg?.conversationId ?? null;
    if (contextId) revalidatePath(`/comunidade/conversas/${contextId}`);
  } else if (contextType === "channel") {
    const msg = await prisma.channelMessage.findUnique({
      where: { id: messageId },
      select: { channelId: true },
    });
    contextId = msg?.channelId ?? null;
    if (contextId) revalidatePath(`/comunidade/canal/${contextId}`);
  }

  if (!contextId) {
    console.warn(
      `[toggleReaction] Não foi possível encontrar o contexto para revalidar a mensagem ${messageId}`
    );
  }

  return { success: true };
}

// --- AÇÕES DE EMOJIS ---

export async function getCustomEmojis() {
  return await prisma.customEmoji.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getCommunityFileSignedUrl(key: string): Promise<string> {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser) {
      throw new Error("Não autorizado");
    }

    if (!key) {
      throw new Error("A chave do arquivo é obrigatória.");
    }

    const command = new GetObjectCommand({
      Bucket: process.env.COMMUNITY_S3_BUCKET_NAME!,
      Key: key,
    });

    // Gera uma URL válida por 5 minutos (300 segundos)
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    return signedUrl;
  } catch (error) {
    console.error("Erro ao gerar URL assinada para a comunidade:", error);
    // Lança o erro para que o 'react-query' no frontend possa capturá-lo
    throw new Error("Não foi possível obter o acesso ao arquivo.");
  }
}

/**
 * Cria um novo emoji customizado.
 */
export async function createCustomEmoji({
  name,
  file,
}: {
  name: string;
  file: File;
}) {
  const authUser = await getAuthenticatedUser();

  if (!name || !file) throw new Error("Nome e arquivo são obrigatórios.");

  const sanitizedName = name.replace(/[^a-z0-9_]/gi, "").toLowerCase();
  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const key = `emojis/${sanitizedName}-${crypto
    .randomBytes(4)
    .toString("hex")}.${file.type.split("/")[1]}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.COMMUNITY_S3_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
    })
  );

  await prisma.customEmoji.create({
    data: {
      name: `:${sanitizedName}:`,
      imageUrl: key,
      creatorId: authUser!.id,
    },
  });

  revalidatePath("/comunidade"); // Revalida todas as páginas da comunidade para o novo emoji aparecer
  return { success: true };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const detailsSchemaServer = z.object({
  channelId: z.string(),
  name: z.string().min(3).max(50),
  description: z.string().max(280).optional().nullable(),
  type: z.nativeEnum(ChannelType),
  allowExMembers: z.boolean(),
  restrictedToAreas: z.array(z.nativeEnum(AreaRoles)),
  allowedMemberIds: z.array(z.string()), // Membros para canal PRIVADO
});
type DetailsFormServer = z.infer<typeof detailsSchemaServer>;

/**
 * AÇÃO 1: Atualiza os detalhes principais do canal (Nome, Tipo, Permissões)
 */
export async function updateChannelDetails(data: DetailsFormServer) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  // 1. Validação de Permissão (Admin do Canal)
  const member = await prisma.channelMember.findFirst({
    where: { channelId: data.channelId, userId: authUser.id },
    include: { user: { include: { currentRole: true } } }, // Inclui role para validação de áreas
  });
  if (member?.role !== "ADMIN")
    throw new Error("Acesso negado: Você precisa ser administrador do canal.");

  // Buscar o criador original para não removê-lo acidentalmente
  const channelCreator = await prisma.channel.findUnique({
    where: { id: data.channelId },
    select: { createdById: true },
  });
  if (!channelCreator) throw new Error("Canal não encontrado.");
  const creatorId = channelCreator.createdById;

  const { channelId, type, restrictedToAreas, allowedMemberIds, ...otherData } =
    data;

  // eslint-disable-next-line prefer-const
  let prismaUpdateData: Prisma.ChannelUpdateInput = {
    ...otherData, // name, description, allowExMembers
    type,
  };

  // 2. Lógica Específica por Tipo de Canal
  if (type === ChannelType.PUBLIC) {
    // Validação de Segurança para Áreas Restritas (Regra 2.ii)
    const userRoleAreas = member.user?.currentRole?.area ?? [];
    const isDirector = userRoleAreas.includes(AreaRoles.DIRETORIA);
    const isExMember = !member.user?.currentRole;

    if (!isDirector && !isExMember) {
      // Ex-membro não define áreas, Diretor pode tudo
      const allowedAreasForUser = new Set([
        ...userRoleAreas,
        AreaRoles.CONSULTORIA,
      ]);
      for (const area of restrictedToAreas) {
        if (!allowedAreasForUser.has(area)) {
          throw new Error(
            `Acesso negado: Você não tem permissão para restringir o canal à área ${getLabelForRoleArea(
              area
            )}.`
          );
        }
      }
    } else if (isExMember && restrictedToAreas.length > 0) {
      throw new Error(`Ex-membros não podem definir áreas restritas.`);
    }

    prismaUpdateData.restrictedToAreas = { set: restrictedToAreas }; // Usa 'set' para array de enums
    // Garante que a lógica de membros não seja aplicada
    prismaUpdateData.members = undefined; // Remove qualquer operação de membro pendente
  } else {
    // type === ChannelType.PRIVATE
    prismaUpdateData.restrictedToAreas = { set: [] }; // Limpa áreas restritas

    // IDs que DEVEM permanecer no canal privado
    const idsToKeep = new Set<string>([
      ...allowedMemberIds,
      authUser.id,
      creatorId,
    ]);

    // Lógica Complexa de Atualização de Membros (Regra 2.i para privados)
    // - Remove quem não está na lista (exceto admin atual e criador)
    // - Adiciona/Garante quem está na lista (exceto admin atual e criador, já existentes)
    prismaUpdateData.members = {
      deleteMany: {
        channelId: channelId, // Garante que só afete este canal
        userId: { notIn: Array.from(idsToKeep) }, // Remove quem NÃO está na lista
      },
      // Garante que os membros permitidos (exceto o próprio admin/criador que já estão) existam
      connectOrCreate: allowedMemberIds
        .filter((id) => id !== authUser.id && id !== creatorId) // Filtra admin e criador
        .map((userId) => ({
          where: { userId_channelId: { userId, channelId } },
          create: { userId, role: ChannelMemberRole.MEMBER }, // Cria como MEMBRO padrão
        })),
    };
  }

  // 3. Executa a Atualização no Banco
  try {
    await prisma.channel.update({
      where: { id: channelId },
      data: prismaUpdateData,
    });
  } catch (error) {
    console.error("Erro ao atualizar canal no Prisma:", error);
    throw new Error(
      "Falha ao salvar as alterações do canal no banco de dados."
    );
  }

  // 4. Revalidação do Cache
  revalidatePath(`/comunidade/canal/${channelId}`);
  revalidatePath(`/comunidade`); // Revalida a lista geral também
  return { success: true };
}

/**
 * AÇÃO 2: Faz upload da imagem de capa do canal (TO-DO 5)
 */
export async function updateChannelImage(formData: FormData) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const file = formData.get("file") as File | null;
  const channelId = formData.get("channelId") as string;
  if (!file || !channelId) throw new Error("Dados ausentes.");

  const member = await prisma.channelMember.findFirst({
    where: { channelId, userId: authUser.id },
  });
  if (member?.role !== "ADMIN") throw new Error("Acesso negado");

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  const fileExtension = file.name.split(".").pop();
  const key = `channel-banners/${channelId}/${generateFileName()}.${fileExtension}`;

  // Upload para o S3
  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.COMMUNITY_S3_BUCKET_NAME!,
      Key: key,
      Body: fileBuffer,
      ContentType: file.type,
    })
  );

  // Salva a *chave* S3 no banco de dados.
  // Você precisará de getSignedUrl na leitura.
  await prisma.channel.update({
    where: { id: channelId },
    data: {
      imageUrl: key,
    },
  });

  revalidatePath(`/comunidade/canais/${channelId}`);
  revalidatePath("/comunidade");
  return { success: true, newImageUrl: key };
}

/**
 * AÇÃO 3: Fixa ou desfixa um canal (TO-DO 4)
 */
export async function togglePinChannel(data: {
  channelId: string;
  isPinned: boolean;
}) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  if (!checkUserPermission(authUser, DIRECTORS_ONLY))
    throw new Error("Não autorizado");

  await prisma.channel.update({
    where: { id: data.channelId },
    data: {
      isPinned: data.isPinned,
    },
  });

  const allMembersIds = await prisma.channelMember.findMany({
    where: { channelId: data.channelId },
    select: { userId: true },
  });

  await createNotification({
    type: NotificationType.NEW_MENTION,
    description: `O canal foi ${data.isPinned ? 'fixado' : 'desfixado'} na lista de canais.`,
    link: `/comunidade`,
    targetUsersIds: allMembersIds.map((member) => member.userId),
  })

  revalidatePath(`/comunidade`);
  return { success: true };
}

/**
 * AÇÃO 4: Busca usuários para o MultiSelect (TO-DO de userOptions)
 */
export async function searchUsers(query: string) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  // Apenas um exemplo, ajuste a busca
  const users = await prisma.user.findMany({
    where: {
      name: {
        contains: query,
        mode: "insensitive",
      },
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      isExMember: true
    },
    take: 10,
  });

  return users.map((user) => ({ label: user.name, value: user.id, isExMember: user.isExMember }));
}

/**
 * AÇÃO 5: Atualiza o papel de um membro (Existente)
 */
export async function updateMemberRole(data: {
  memberId: string;
  role: ChannelMemberRole;
  channelId: string;
}) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const member = await prisma.channelMember.findFirst({
    where: { channelId: data.channelId, userId: authUser.id },
  });
  if (member?.role !== "ADMIN") throw new Error("Acesso negado");

  const memberCreator = await prisma.channel.findFirst({
    where: { id: data.channelId },
    select: { createdById: true },
  });

  if (memberCreator?.createdById === data.memberId)
    throw new Error("O criador do canal não pode ter seu papel alterado");

  await prisma.channelMember.update({
    where: { id: data.memberId },
    data: { role: data.role },
  });

  revalidatePath("/comunidade/canais");
  return { success: true };
}

/**
 * AÇÃO 6: Remove um membro de um canal (Existente)
 */
export async function removeChannelMember(data: {
  memberId: string;
  channelId: string;
}) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const member = await prisma.channelMember.findFirst({
    where: { channelId: data.channelId, userId: authUser.id },
  });
  if (member?.role !== "ADMIN") throw new Error("Acesso negado");

  const memberCreator = await prisma.channel.findFirst({
    where: { id: data.channelId },
    select: { createdById: true },
  });

  if (
    memberCreator?.createdById === data.memberId ||
    memberCreator?.createdById === authUser.id
  )
    throw new Error("O criador do canal não pode ser excluido");

  const deletedMember = await prisma.channelMember.delete({
    where: { id: data.memberId },
  });

  await createNotification({
    type: NotificationType.NEW_MENTION,
    description: `Você foi removido do canal.`,
    link: `/comunidade`,
    targetUserId: deletedMember.userId,
  })

  revalidatePath(`/comunidade/canal/${deletedMember.channelId}`);
  return { success: true };
}

type NotificationData = {
  type: NotificationType;
  description: string;
  link: string;
  targetUserId?: string;
  targetUsersIds?: string[];
}

export async function createNotification(data: NotificationData) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  if(data.targetUserId){
  await prisma.notification.create({
    data: {
      type: data.type,
      notification: data.description,
      link: data.link,
      notificationUsers: {
        create: {
          userId: data.targetUserId,
        }
      }
    },
  });
  }
  if(data.targetUsersIds && data.targetUsersIds.length > 0){
    const notificationsData = data.targetUsersIds.map(userId => ({
      type: data.type,
      notification: data.description,
      link: data.link,
      notificationUsers: {
        create: {
          userId: userId,
        }
      }
    }))
    await prisma.notification.createMany({
      data: notificationsData
    });
  }

  revalidatePath('/')
  return { success: true };

}