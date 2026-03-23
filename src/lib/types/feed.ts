// lib/types/feed.ts
import { Prisma } from "@prisma/client";

// Inclui comuns para Autor (usado em Post e Comment)
export const authorSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  imageUrl: true,
  isExMember: true, // Assumindo que existe no model User
  alumniDreamer: true, // Assumindo que existe no model User
  currentRole: { // Cargo atual ou null se ex-membro
    select: { name: true }
  }
});

// Inclui para Post
export const postIncludes = Prisma.validator<Prisma.PostInclude>()({
  author: { select: authorSelect },
  attachments: {
    select: { id: true, url: true, fileType: true, fileName: true },
  }, // Incluindo FileAttachment
  _count: {
    select: {
      comments: true, // Contagem total de comentários
      likedBy: true, // Contagem total de likes
      favoritedBy: true, // Contagem total de saves
      reposts: true, // Contagem total de reposts diretos
    },
  },
  // Relações específicas do usuário atual (serão filtradas na query)
  likedBy: { where: { id: "" }, select: { id: true } }, // Placeholder, userId será injetado
  favoritedBy: { where: { id: "" }, select: { id: true } }, // Placeholder, userId será injetado
  repostedBy: { where: { id: "" }, select: { id: true } }, // Placeholder, userId será injetado
  // Pode precisar de uma query separada ou ajuste no schema/includes
  originalPost: {
    // Inclui o post original se for um repost
    include: {
      author: { select: authorSelect },
      attachments: {
        select: { id: true, url: true, fileType: true, fileName: true },
      },
       likedBy: { where: { id: "" }, select: { id: true } }, // Placeholder, userId será injetado
  favoritedBy: { where: { id: "" }, select: { id: true } }, // Placeholder, userId será injetado
  repostedBy: { where: { id: "" }, select: { id: true } }, // Placeholder, userId será injetado
      _count: {
        select: {
          likedBy: true,
          comments: true,
          favoritedBy: true,
          reposts: true,
        },
      },
    },
  },
});

export type FullPost = Prisma.PostGetPayload<{
  include: typeof postIncludes;
}>;

// Inclui para Comment
export const commentIncludes = Prisma.validator<Prisma.CommentInclude>()({
  author: { select: authorSelect },
  _count: {
    select: { likedBy: true, replies: true },
  },
  // Relação específica do usuário atual
  likedBy: { where: { id: "" }, select: { id: true } }, // Placeholder, userId será injetado
  // Incluir algumas respostas iniciais?
  replies: { take: 1, orderBy: { createdAt: 'asc' }, include: { author: { select: authorSelect }, _count: { select: { likedBy: true } } } }
});

export type FullComment = Prisma.CommentGetPayload<{
  include: typeof commentIncludes;
}>;

// Tipo para paginação
export type PaginatedResponse<T> = {
  items: T[];
  nextCursor?: string | null;
};
