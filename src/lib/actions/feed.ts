// lib/actions/feed.ts
"use server";

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { PostType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import {
  postIncludes,
  commentIncludes,
  PaginatedResponse,
  FullPost,
  FullComment,
} from "@/lib/types/feed"; // Ajuste o caminho
import { z } from "zod";
import { s3Client } from "@/lib/aws"; // Import S3 client and command
import { checkUserPermission } from "../utils";
import { DIRECTORS_ONLY } from "../permissions";
import { DeleteObjectsCommand } from "@aws-sdk/client-s3";

// --- Constantes ---
const POSTS_PER_PAGE = 10;
const COMMENTS_PER_PAGE = 5;
const REPLIES_PER_PAGE = 3;

// --- Esquemas de Validação ---
const createPostSchema = z.object({
  content: z.string().min(1, "O conteúdo não pode estar vazio.").max(5000), // Max length increased
  attachmentKeys: z.array(z.string()).optional().default([]), // Chaves S3 dos anexos
});

const createCommentSchema = z.object({
  content: z.string().min(1, "O comentário não pode estar vazio.").max(2000),
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
});

// --- Helper para gerar Includes dinâmicos com userId ---
const getDynamicPostIncludes = (userId: string): Prisma.PostInclude => ({
  ...postIncludes,
  likedBy: { where: { id: userId }, select: { id: true } },
  favoritedBy: { where: { id: userId }, select: { id: true } },
  repostedBy: { where: { id: userId }, select: { id: true } },
  originalPost: {
    include: {
      ...postIncludes,
      likedBy: { where: { id: userId }, select: { id: true } },
      favoritedBy: { where: { id: userId }, select: { id: true } },
      repostedBy: { where: { id: userId }, select: { id: true } },
    }
  }
});

const getDynamicCommentIncludes = (userId: string): Prisma.CommentInclude => ({
  ...commentIncludes,
  likedBy: { where: { id: userId }, select: { id: true } },
});

// --- Ação Principal de Busca Inicial ---
export async function getInitialFeedData(): Promise<{
  pinnedPosts: FullPost[];
  initialFeed: PaginatedResponse<FullPost>;
}> {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const userId = authUser.id;

  const dynamicIncludes = getDynamicPostIncludes(userId);

  // Garantir que o tipo esteja correto antes de retornar
  const [rawPinnedPosts, rawFeedPosts] = await Promise.all([
    prisma.post.findMany({
      include: dynamicIncludes, // Prisma infere o tipo FullPost
      where: { isFixed: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.post.findMany({
      include: dynamicIncludes, // Prisma infere o tipo FullPost
      where: { isFixed: { not: true } },
      orderBy: { createdAt: "desc" },
      take: POSTS_PER_PAGE,
    }),
  ]);

  // Ajuste de tipo: garantir compatibilidade com FullPost (mapear explicitamente se preferir segurança)
  const pinnedPosts = rawPinnedPosts as unknown as FullPost[];
  const feedPosts = rawFeedPosts as unknown as FullPost[];

  const nextCursor =
    feedPosts.length === POSTS_PER_PAGE
      ? feedPosts[POSTS_PER_PAGE - 1].id
      : null;

  return { pinnedPosts, initialFeed: { items: feedPosts, nextCursor } };
}

// --- Ação para Carregamento Infinito de Posts ---
export async function getMorePosts(
  cursor?: string
): Promise<PaginatedResponse<FullPost>> {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const userId = authUser.id;
  const dynamicIncludes = getDynamicPostIncludes(userId);

  const postsData = await prisma.post.findMany({
    include: dynamicIncludes,
    orderBy: { createdAt: "desc" },
    take: POSTS_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    where: { isFixed: { not: true } },
  });

  const nextCursor =
    postsData.length === POSTS_PER_PAGE
      ? postsData[POSTS_PER_PAGE - 1].id
      : null;

  const posts = postsData as unknown as FullPost[];

  return { items: posts, nextCursor };
}

// --- Ação para Criar Post ---
export async function createPost(formData: FormData) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  // Anexos vêm da API de upload, pegamos os dados JSON
  const attachmentsJson = formData.get("attachments") as string | null;
  const attachmentsData: { key: string; fileName: string; fileType: string }[] =
    attachmentsJson ? JSON.parse(attachmentsJson) : [];

  const validatedData = createPostSchema.safeParse({
    content: formData.get("content") as string,
    // attachmentKeys agora é derivado dos dados dos anexos
    attachmentKeys: attachmentsData.map((att) => att.key),
  });

  if (!validatedData.success) {
    throw new Error(
      validatedData.error.errors[0]?.message || "Dados inválidos."
    );
  }

  const { content } = validatedData.data;

  const allMembersIds = await prisma.user.findMany({select: {id: true}})

  await createNotification({
    type: NotificationType.NEW_MENTION,
    description: `Um novo post foi criado por ${authUser.name}.`,
    link: `/comunidade/feed`,
    targetUsersIds: allMembersIds.map(user => user.id),
  })

  await prisma.post.create({
    data: {
      content,
      authorId: authUser.id,
      type: PostType.ORIGINAL, // Tipo padrão
      // Cria registros FileAttachment associados
      ...(attachmentsData.length > 0 && {
        attachments: {
          create: attachmentsData.map((att) => ({
            url: att.key,
            fileName: att.fileName,
            fileType: att.fileType,
          })),
        },
      }),
    },
  });

  revalidatePath("/comunidade/feed");
  return { success: true };
}

export async function editPost(postId: string, newContent: string) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  console.log(newContent)
  // Anexos vêm da API de upload, pegamos os dados JSON
  // const attachmentsJson = formData.get("attachments") as string | null;
  // const attachmentsData: { key: string; fileName: string; fileType: string }[] =
  //   attachmentsJson ? JSON.parse(attachmentsJson) : [];
  // const validatedData = createPostSchema.safeParse({
  //   content: formData.get("content") as string,
  //   // attachmentKeys agora é derivado dos dados dos anexos
  //   // attachmentKeys: attachmentsData.map((att) => att.key),
  // });

  // if (!validatedData.success) {
  //   throw new Error(
  //     validatedData.error.errors[0]?.message || "Dados inválidos."
  //   );
  // }

  const post = await prisma.post.findUnique({
        where: { id: postId },
        select: { authorId: true }
    });

    if (!post) throw new Error("Post não encontrado.");
    // Verifica se o usuário logado é o autor do post
    if (post.authorId !== authUser.id) {
        throw new Error("Acesso negado: Você não pode editar este post.");
    }

    // Validação básica do conteúdo (pode adicionar mais regras se necessário)
    if (!newContent || newContent.trim().length === 0) {
        throw new Error("O conteúdo não pode estar vazio.");
    }
    if (newContent.length > 5000) { // Garante consistência com o limite do input
        throw new Error("Conteúdo excede o limite máximo de caracteres.");
    }

  // const { content } = validatedData.data;

  await prisma.post.update({
    where: { id: postId },
    data: {
      content: newContent,
      // Atualiza registros FileAttachment associados
      // ...(attachmentsData.length > 0 && {
      //   attachments: {
      //     create: attachmentsData.map((att) => ({
      //       url: att.key,
      //       fileName: att.fileName,
      //       fileType: att.fileType,
      //     })),
      //   },
      // }),
    },
  });

}



// --- Ação para Curtir/Descurtir Post ---
export async function togglePostLike(postId: string) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const userId = authUser.id;

  // Verifica se o usuário já curtiu
  const existingLike = await prisma.post.findFirst({
    where: { id: postId, likedBy: { some: { id: userId } } },
    select: { id: true }, // Apenas verifica a existência
  });

  if (existingLike) {
    // Descurtir: Desconecta o usuário da relação likedBy
    await prisma.post.update({
      where: { id: postId },
      data: { likedBy: { disconnect: { id: userId } } },
    });
    return { liked: false };
  } else {
    // Curtir: Conecta o usuário à relação likedBy
    await prisma.post.update({
      where: { id: postId },
      data: { likedBy: { connect: { id: userId } } },
    });
    return { liked: true };
  }
  // Revalidação é melhor no cliente para UX
}

// --- Ação para Salvar/Dessalvar Post ---
export async function togglePostSave(postId: string) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const userId = authUser.id;

  const existingSave = await prisma.post.findFirst({
    where: { id: postId, favoritedBy: { some: { id: userId } } },
    select: { id: true },
  });

  if (existingSave) {
    await prisma.post.update({
      where: { id: postId },
      data: { favoritedBy: { disconnect: { id: userId } } },
    });
    return { saved: false };
  } else {
    await prisma.post.update({
      where: { id: postId },
      data: { favoritedBy: { connect: { id: userId } } },
    });
    return { saved: true };
  }
}

// --- Ação para Criar Repost ---
export async function toggleRepost(originalPostId: string, content?: string /* Opcional: para reposts com comentário */) {
    const authUser = await getAuthenticatedUser();
    if (!authUser) throw new Error("Não autorizado");
    const userId = authUser.id;

    // 1. Verifica se o post original existe
    const originalPost = await prisma.post.findUnique({
        where: { id: originalPostId },
        select: { id: true } // Só precisamos do ID para confirmar existência
    });
    if (!originalPost) throw new Error("Post original não encontrado.");

    // 2. Verifica se já existe um repost DESTE usuário para ESTE post original
    const existingRepost = await prisma.post.findFirst({
        where: {
            authorId: userId,
            originalPostId: originalPostId,
            type: PostType.REPOST,
        },
        select: { id: true } // Só precisamos do ID para deletar se existir
    });

    try {
        if (existingRepost) {
            // --- Lógica para Desfazer Repost ---
            // Usamos transaction para garantir atomicidade
            await prisma.$transaction([
                // a) Deleta o post do tipo REPOST
                prisma.post.delete({
                    where: { id: existingRepost.id }
                }),
                // b) Desconecta o usuário da relação 'repostedBy' no post ORIGINAL
                prisma.post.update({
                    where: { id: originalPostId },
                    data: { repostedBy: { disconnect: { id: userId } } }
                })
            ]);
        
            revalidatePath("/comunidade/feed"); // Revalida o feed
            return { success: true, reposted: false }; // Retorna o novo estado

        } else {
            // --- Lógica para Criar Repost ---
            // Usamos transaction para garantir atomicidade
            await prisma.$transaction([
                // a) Cria o novo post do tipo REPOST
                prisma.post.create({
                    data: {
                        content: content || "", // Usa conteúdo adicional se fornecido
                        authorId: userId,
                        type: PostType.REPOST,
                        originalPostId: originalPostId,
                    }
                }),
                // b) Conecta o usuário à relação 'repostedBy' no post ORIGINAL
                prisma.post.update({
                    where: { id: originalPostId },
                    data: { repostedBy: { connect: { id: userId } } }
                })
            ]);
        
            revalidatePath("/comunidade/feed"); // Revalida o feed
            return { success: true, reposted: true }; // Retorna o novo estado
        }
    } catch (error) {
        console.error("Error toggling repost:", error);
        // Garante que a mensagem de erro seja propagada
        if (error instanceof Error) {
           throw new Error(`Falha ao ${existingRepost ? 'desfazer' : 'criar'} repost: ${error.message}`);
        }
        throw new Error(`Falha desconhecida ao ${existingRepost ? 'desfazer' : 'criar'} repost.`);
    }
}

// --- Ação para Criar Comentário/Resposta ---
export async function createComment(data: z.infer<typeof createCommentSchema>) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const validatedData = createCommentSchema.safeParse(data);
  if (!validatedData.success)
    throw new Error(
      validatedData.error.errors[0]?.message || "Dados inválidos."
    );
  const { content, postId, parentId } = validatedData.data;

  const dynamicIncludes = getDynamicCommentIncludes(authUser.id);

  const newCommentData = await prisma.comment.create({
    data: { content, authorId: authUser.id, postId, parentId },
    include: dynamicIncludes,
  });

  const newComment = newCommentData as unknown as FullComment;

  // Revalidação pode ser feita no cliente
  return { success: true, comment: newComment };
}

// --- Ação para Buscar Comentários (Paginação) ---
export async function getComments(
  postId: string,
  cursor?: string
): Promise<PaginatedResponse<FullComment>> {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const userId = authUser.id;
  const dynamicIncludes = getDynamicCommentIncludes(userId);

  const commentsData = await prisma.comment.findMany({
    where: { postId: postId, parentId: null }, // Apenas nível superior
    include: dynamicIncludes,
    orderBy: { createdAt: "asc" }, // Mais antigos primeiro é comum
    take: COMMENTS_PER_PAGE,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const nextCursor =
    commentsData.length === COMMENTS_PER_PAGE
      ? commentsData[COMMENTS_PER_PAGE - 1].id
      : null;
  const comments = commentsData as unknown as FullComment[];
  return { items: comments, nextCursor };
}

// --- Ação para Buscar Respostas (Paginação) ---
export async function getCommentReplies(
  commentId: string,
  cursor?: string
): Promise<PaginatedResponse<FullComment>> {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const userId = authUser.id;
  const dynamicIncludes = getDynamicCommentIncludes(userId);

  const repliesData = await prisma.comment.findMany({
    where: { parentId: commentId }, // Busca respostas para o commentId
    include: dynamicIncludes,
    orderBy: { createdAt: "asc" },
    take: REPLIES_PER_PAGE, // Pode ser diferente dos comentários principais
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const nextCursor =
    repliesData.length === REPLIES_PER_PAGE
      ? repliesData[REPLIES_PER_PAGE - 1].id
      : null;
  const replies = repliesData as unknown as FullComment[];
  return { items: replies, nextCursor };
}

// --- Ação para Curtir/Descurtir Comentário ---
export async function toggleCommentLike(commentId: string) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");
  const userId = authUser.id;

  const existingLike = await prisma.comment.findFirst({
    where: { id: commentId, likedBy: { some: { id: userId } } },
    select: { id: true },
  });

  if (existingLike) {
    await prisma.comment.update({
      where: { id: commentId },
      data: { likedBy: { disconnect: { id: userId } } },
    });
    return { liked: false };
  } else {
    await prisma.comment.update({
      where: { id: commentId },
      data: { likedBy: { connect: { id: userId } } },
    });
    return { liked: true };
  }
}

// --- Ação para Deletar Post ---
export async function deletePost(postId: string) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { authorId: true, attachments: { select: { url: true } } },
  });

  if (!post) throw new Error("Post não encontrado.");
  if (
    post.authorId !== authUser.id &&
    !checkUserPermission(authUser, DIRECTORS_ONLY)
  ) {
    throw new Error("Acesso negado.");
  }

  // Deletar anexos S3
  if (post.attachments.length > 0) {
    try {
      await s3Client.send(
        new DeleteObjectsCommand({
          Bucket: process.env.COMMUNITY_S3_BUCKET_NAME!, // Confirme var de ambiente
          Delete: { Objects: post.attachments.map((a) => ({ Key: a.url })) },
        })
      );
    } catch (s3Error) {
      console.error(
        "Erro ao deletar anexos do S3 para o post:",
        postId,
        s3Error
      );
      // Considerar se deve prosseguir mesmo com erro no S3
    }
  }

  // Deleta o post (e anexos/likes/comments/saves em cascata, dependendo do schema)
  await prisma.post.delete({ where: { id: postId } });

  revalidatePath("/comunidade/feed");
  return { success: true };
}

// --- Ação para Deletar Comentário ---
export async function deleteComment(commentId: string) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { authorId: true },
  });

  if (!comment) throw new Error("Comentário não encontrado.");
  if (
    comment.authorId !== authUser.id &&
    !checkUserPermission(authUser, DIRECTORS_ONLY)
  ) {
    throw new Error("Acesso negado.");
  }

  // Deleta o comentário (e replies/likes em cascata)
  await prisma.comment.delete({ where: { id: commentId } });

  // Revalidação é complexa, melhor no cliente
  return { success: true };
}

// --- Ação para Fixar/Desfixar Post ---
export async function togglePinPost(postId: string, pin: boolean) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) throw new Error("Não autorizado");

  if (!checkUserPermission(authUser, DIRECTORS_ONLY)) {
    throw new Error("Acesso negado.");
  }
  await prisma.post.update({
    where: { id: postId },
    data: { isFixed: pin }, // Usando isFixed do seu schema
  });

  revalidatePath("/comunidade/feed");
  return { success: true };
}
