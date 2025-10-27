/* eslint-disable @typescript-eslint/no-explicit-any */
// components/Feed/PostCard.tsx
"use client";

import React, { useState } from "react";
// Para links no conteúdo, se necessário
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Importe o Badge
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"; // Para opções (deletar, fixar)
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ThumbsUp,
  MessageCircle,
  Bookmark,
  Repeat2,
  MoreHorizontal,
  Trash2,
  Pin,
  PinOff,
  Loader2,
  Pencil,
} from "lucide-react";
import { FullPost } from "@/lib/types/feed"; // Ajuste o caminho
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  togglePostLike,
  togglePostSave,
  toggleRepost,
  editPost,
  deletePost,
  togglePinPost,
} from "@/lib/actions/feed"; // Ajuste o caminho
import { toast } from "sonner";
import { checkUserPermission, cn } from "@/lib/utils";

import { PostType } from "@prisma/client";
import CommentSection from "./CommentSection";
import RenderAttachment from "../RenderAttachment";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Textarea } from "@/components/ui/textarea";
interface PostCardProps {
  post: FullPost;
  currentUserId: string;
}

const PostCard = ({ post, currentUserId }: PostCardProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showComments, setShowComments] = useState(false); // Controla visibilidade dos comentários
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPinning, setIsPinning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(post.content);
  const [showMore, setShowMore] = useState(false);

  // Determina qual post exibir (original ou o repost wrapper)
  const isRepost = post.type === PostType.REPOST && !!post.originalPost;
  // `displayPost`: O post cujo conteúdo, autor e anexos são mostrados.
  const displayPost = isRepost ? post.originalPost! : post;
  // `interactionTargetPost`: O post que recebe likes, comentários, saves, reposts.
  const interactionTargetPost = displayPost; // Neste caso, é o mesmo que displayPost
  const repostAuthor = isRepost ? post.author : null;

  const isOwnerOfWrapper = post.authorId === currentUserId; // Dono do repost ou do post original
  const isOwnerOfOriginal = displayPost.authorId === currentUserId; // Dono do conteúdo exibido
  const canPin = checkUserPermission(user, DIRECTORS_ONLY); // Apenas diretores podem fixar
  // Só pode editar o post original (não o repost) e se for o dono
  const canEdit = !isRepost && isOwnerOfOriginal;
  // Pode deletar o repost (se for dono) ou o post original (se dono ou diretor)
  const canDelete =
    isOwnerOfWrapper ||
    (isOwnerOfOriginal && checkUserPermission(user, DIRECTORS_ONLY));
  // --- Mutações com Atualização Otimista ---
  const { mutate: likePost } = useMutation({
    mutationFn: () => togglePostLike(interactionTargetPost.id),
    onMutate: async () => {
      // Cancelar queries otimistas pendentes
      await queryClient.cancelQueries({
        queryKey: ["feedPosts", currentUserId],
      });
      await queryClient.cancelQueries({
        queryKey: ["initialFeedData", currentUserId],
      });

      // Snapshot do estado anterior
      const previousFeedData: any = queryClient.getQueryData([
        "feedPosts",
        currentUserId,
      ]);
      const previousInitialData: any = queryClient.getQueryData([
        "initialFeedData",
        currentUserId,
      ]);

      // Atualização otimista
      const updatePostData = (oldData: any) => {
        if (!oldData) return oldData;
        const updatePages = (pages: any[]) =>
          pages.map((page) => ({
            ...page,
            items: page.items.map((p: FullPost) => {
              if (p.id === post.id) {
                const currentlyLiked = p.likedBy?.length > 0;
                return {
                  ...p,
                  likedBy: currentlyLiked ? [] : [{ id: currentUserId }], // Simula like/unlike
                  _count: {
                    ...p._count,
                    likedBy: currentlyLiked
                      ? p._count.likedBy - 1
                      : p._count.likedBy + 1,
                  },
                };
              }
              return p;
            }),
          }));

        if (oldData.pages) {
          // Infinite query
          return { ...oldData, pages: updatePages(oldData.pages) };
        } else if (oldData.initialFeed) {
          // Initial data query
          return {
            ...oldData,
            initialFeed: {
              ...oldData.initialFeed,
              items: updatePages([oldData.initialFeed])[0].items,
            },
            pinnedPosts: oldData.pinnedPosts.map((p: FullPost) => {
              // Atualiza fixados tbm
              if (p.id === post.id) {
                const currentlyLiked = p.likedBy?.length > 0;
                return {
                  ...p,
                  likedBy: currentlyLiked ? [] : [{ id: currentUserId }], // Simula like/unlike
                  _count: {
                    ...p._count,
                    likedBy: currentlyLiked
                      ? p._count.likedBy - 1
                      : p._count.likedBy + 1,
                  },
                };
              }
              return p;
            }),
          };
        }
        return oldData;
      };

      queryClient.setQueryData(["feedPosts", currentUserId], updatePostData);
      queryClient.setQueryData(
        ["initialFeedData", currentUserId],
        updatePostData
      );

      return { previousFeedData, previousInitialData };
    },
    onError: (err, _vars, context) => {
      // Reverter em caso de erro
      if (context?.previousFeedData)
        queryClient.setQueryData(
          ["feedPosts", currentUserId],
          context.previousFeedData
        );
      if (context?.previousInitialData)
        queryClient.setQueryData(
          ["initialFeedData", currentUserId],
          context.previousInitialData
        );
      toast.error("Erro ao curtir", { description: (err as Error).message });
    },
    onSettled: () => {
      // Revalidar após sucesso ou erro para garantir consistência
      queryClient.invalidateQueries({ queryKey: ["feedPosts", currentUserId] });
      queryClient.invalidateQueries({
        queryKey: ["initialFeedData", currentUserId],
      });
    },
  });

  const { mutate: savePost } = useMutation({
    mutationFn: () => togglePostSave(interactionTargetPost.id), // Chama a action que salva/dessalva

    // --- Atualização Otimista ---
    onMutate: async () => {
      console.log("[PostCard] onMutate savePost triggered");
      // 1. Cancelar queries pendentes para evitar sobrescrever o otimismo
      await queryClient.cancelQueries({
        queryKey: ["feedPosts", currentUserId],
      });
      await queryClient.cancelQueries({
        queryKey: ["initialFeedData", currentUserId],
      });

      // 2. Snapshot dos dados atuais do cache
      const previousFeedData: any = queryClient.getQueryData([
        "feedPosts",
        currentUserId,
      ]);
      const previousInitialData: any = queryClient.getQueryData([
        "initialFeedData",
        currentUserId,
      ]);
      console.log("[PostCard] Previous Feed Data Snapshot:", previousFeedData);
      console.log(
        "[PostCard] Previous Initial Data Snapshot:",
        previousInitialData
      );

      // 3. Função para atualizar o estado do 'save' (favoritedBy) no post
      const updatePostSaveState = (targetPost: FullPost) => {
        const currentlySaved = targetPost.favoritedBy?.length > 0;
        return {
          ...targetPost,
          // Simula adicionar/remover o usuário atual da lista
          favoritedBy: currentlySaved ? [] : [{ id: currentUserId }],
          // Atualiza a contagem otimistamente
          _count: {
            ...targetPost._count,
            favoritedBy: currentlySaved
              ? (targetPost._count?.favoritedBy ?? 1) - 1 // Decrementa (min 0)
              : (targetPost._count?.favoritedBy ?? 0) + 1, // Incrementa
          },
        };
      };

      // 4. Função genérica para aplicar a atualização nos diferentes formatos de cache
      const updateCacheData = (oldData: any) => {
        if (!oldData) return oldData;

        // Estrutura do useInfiniteQuery ({ pages: [...] })
        if (oldData.pages) {
          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              items: page.items.map((p: FullPost) =>
                p.id === post.id ? updatePostSaveState(p) : p
              ),
            })),
          };
        }
        // Estrutura do useQuery com initialFeedData ({ pinnedPosts: [], initialFeed: { items: [] } })
        else if (oldData.initialFeed || oldData.pinnedPosts) {
          return {
            ...oldData,
            pinnedPosts:
              oldData.pinnedPosts?.map((p: FullPost) =>
                p.id === post.id ? updatePostSaveState(p) : p
              ) ?? [],
            initialFeed: oldData.initialFeed
              ? {
                  ...oldData.initialFeed,
                  items:
                    oldData.initialFeed.items?.map((p: FullPost) =>
                      p.id === post.id ? updatePostSaveState(p) : p
                    ) ?? [],
                }
              : undefined,
          };
        }
        return oldData; // Retorna sem modificar se a estrutura for desconhecida
      };

      // 5. Aplica a atualização otimista nos caches relevantes
      queryClient.setQueryData(["feedPosts", currentUserId], updateCacheData);
      queryClient.setQueryData(
        ["initialFeedData", currentUserId],
        updateCacheData
      );
      console.log("[PostCard] Optimistic update applied for save/unsave.");

      // 6. Retorna o snapshot para possível rollback
      return { previousFeedData, previousInitialData };
    },

    // --- Rollback em Caso de Erro ---
    onError: (err, _vars, context) => {
      console.error("[PostCard] onError savePost:", err);
      // Reverte os dados do cache para o snapshot salvo no onMutate
      if (context?.previousFeedData) {
        console.log("[PostCard] Rolling back feedPosts data.");
        queryClient.setQueryData(
          ["feedPosts", currentUserId],
          context.previousFeedData
        );
      }
      if (context?.previousInitialData) {
        console.log("[PostCard] Rolling back initialFeedData.");
        queryClient.setQueryData(
          ["initialFeedData", currentUserId],
          context.previousInitialData
        );
      }
      // Exibe o toast de erro
      toast.error("Erro ao salvar", { description: (err as Error).message });
    },

    // --- Limpeza e Revalidação Final ---
    onSettled: () => {
      console.log("[PostCard] onSettled savePost. Invalidating queries...");
      // Garante que os dados sejam consistentes com o servidor,
      // independentemente de sucesso ou falha da mutação.
      // Isso busca os dados frescos do backend.
      queryClient.invalidateQueries({ queryKey: ["feedPosts", currentUserId] });
      queryClient.invalidateQueries({
        queryKey: ["initialFeedData", currentUserId],
      });
    },
  });

const { mutate: handleToggleRepost, isPending: isTogglingRepost } = useMutation({
    mutationFn: () => toggleRepost(interactionTargetPost.id), // Chama a nova action toggle
    onMutate: async () => {
        // --- Atualização Otimista para Repost ---
        await queryClient.cancelQueries({ queryKey: ['feedPosts', currentUserId] });
        await queryClient.cancelQueries({ queryKey: ['initialFeedData', currentUserId] });

        const previousFeedData: any = queryClient.getQueryData(['feedPosts', currentUserId]);
        const previousInitialData: any = queryClient.getQueryData(['initialFeedData', currentUserId]);

        // Função para atualizar o estado de 'repostedBy'
        const updatePostRepostState = (targetPost: FullPost) => {
            const currentlyReposted = targetPost.repostedBy?.some(u => u.id === currentUserId);
            return {
                ...targetPost,
                // Simula adicionar/remover da lista repostedBy
                repostedBy: currentlyReposted
                    ? targetPost.repostedBy?.filter(u => u.id !== currentUserId) ?? []
                    : [...(targetPost.repostedBy ?? []), { id: currentUserId }], // Adiciona placeholder
                // Atualiza contagem
                _count: {
                    ...targetPost._count,
                    reposts: currentlyReposted
                        ? (targetPost._count?.reposts ?? 1) - 1
                        : (targetPost._count?.reposts ?? 0) + 1,
                },
            };
        };

        // Função genérica para aplicar nos caches
        const updateCacheData = (oldData: any) => {
             if (!oldData) return oldData;
             const applyUpdate = (p: FullPost) => {
                  // Atualiza o post original ou o post que *é* o original (se não for repost)
                  if (p.id === interactionTargetPost.id) {
                      return updatePostRepostState(p);
                  }
                  // Se o item 'p' for um repost *deste* post original, atualiza o original aninhado
                  if (p.originalPost?.id === interactionTargetPost.id) {
                       const original = p.originalPost;
                       // Normaliza campos que podem estar ausentes para satisfazer o tipo FullPost
                       const normalizedOriginal: FullPost = {
                           ...original,
                           likedBy: (original as any).likedBy ?? [],
                           favoritedBy: (original as any).favoritedBy ?? [],
                           repostedBy: (original as any).repostedBy ?? [],
                           originalPost: (original as any).originalPost ?? null,
                       } as FullPost;
                       return { ...p, originalPost: updatePostRepostState(normalizedOriginal) };
                  }
                  return p;
             }

             if (oldData.pages) { // Infinite query
                 return { ...oldData, pages: oldData.pages.map((page: any) => ({ ...page, items: page.items.map(applyUpdate) })) };
             } else if (oldData.initialFeed || oldData.pinnedPosts) { // Initial data
                 return {
                     ...oldData,
                     pinnedPosts: oldData.pinnedPosts?.map(applyUpdate) ?? [],
                     initialFeed: oldData.initialFeed ? { ...oldData.initialFeed, items: oldData.initialFeed.items?.map(applyUpdate) ?? [] } : undefined,
                 };
             }
             return oldData;
        };

        queryClient.setQueryData(['feedPosts', currentUserId], updateCacheData);
        queryClient.setQueryData(['initialFeedData', currentUserId], updateCacheData);

        return { previousFeedData, previousInitialData };
    },
    onError: (err, _vars, context) => {
        // --- Rollback ---
        if (context?.previousFeedData) queryClient.setQueryData(['feedPosts', currentUserId], context.previousFeedData);
        if (context?.previousInitialData) queryClient.setQueryData(['initialFeedData', currentUserId], context.previousInitialData);
        toast.error("Erro ao repostar", { description: (err as Error).message });
    },
    onSettled: (data) => { // data aqui é o retorno da action: { success, reposted }
        // --- Revalidação Final ---
        queryClient.invalidateQueries({ queryKey: ['feedPosts', currentUserId] });
        queryClient.invalidateQueries({ queryKey: ['initialFeedData', currentUserId] });
        // Opcional: Mostrar toast específico de repost/desfeito
        if (data?.success) {
            toast.info(data.reposted ? "Repostado!" : "Repost desfeito.");
        }
    },
});

  const { mutate: handleDeletePost } = useMutation({
    mutationFn: () => deletePost(post.id),
    onMutate: () => setIsDeleting(true),
    onSuccess: () => {
      toast.success("Post excluído.");
      // Atualização otimista (remover post da lista) ou apenas invalidar
      queryClient.invalidateQueries({ queryKey: ["feedPosts", currentUserId] });
      queryClient.invalidateQueries({
        queryKey: ["initialFeedData", currentUserId],
      });
    },
    onError: (err: any) =>
      toast.error("Erro ao excluir", { description: err.message }),
    onSettled: () => setIsDeleting(false),
  });

  const { mutate: handlePinPost } = useMutation({
    mutationFn: (pinState: boolean) => togglePinPost(displayPost.id, pinState),
    onMutate: () => setIsPinning(true),
    onSuccess: (data, pinState) => {
      toast.success(pinState ? "Post fixado." : "Post desfixado.");
      queryClient.invalidateQueries({ queryKey: ["feedPosts", currentUserId] });
      queryClient.invalidateQueries({
        queryKey: ["initialFeedData", currentUserId],
      }); // Revalida ambos os feeds
    },
    onError: (err: any) =>
      toast.error("Erro ao fixar/desfixar", { description: err.message }),
    onSettled: () => setIsPinning(false),
  });

  const { mutate: handleEditPost, isPending: isEditingPost } = useMutation({
    mutationFn: (newContent: string) => editPost(post.id, newContent),
    onSuccess: () => {
      toast.success("Post atualizado.");
      setIsEditing(false); // Sai do modo de edição
      // Invalida queries para buscar o post atualizado
      queryClient.invalidateQueries({ queryKey: ["feedPosts", currentUserId] });
      queryClient.invalidateQueries({
        queryKey: ["initialFeedData", currentUserId],
      });
      // Poderia fazer atualização otimista também, mas invalidar é mais simples aqui
    },
    onError: (err: any) => {
      toast.error("Erro ao editar", { description: err.message });
      // Opcional: Reverter editedContent para o original se a edição falhar?
      setEditedContent(displayPost.content);
    },
  });

  // --- Handlers ---
  const startEditing = () => {
    setEditedContent(displayPost.content); // Garante que começa com o conteúdo mais recente
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    // Não precisa resetar editedContent aqui, será resetado em startEditing
  };

  const saveEdit = () => {
    if (editedContent.trim() === displayPost.content.trim()) {
      // Se o conteúdo não mudou, apenas cancela
      cancelEditing();
      return;
    }
    handleEditPost(editedContent);
  };

  // --- Dados Derivados ---
  const postTime = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ptBR,
  });
  const likedByCurrentUser =
    interactionTargetPost.likedBy?.length > 0 &&
    interactionTargetPost.likedBy.some((l: { id: string }) => l.id === currentUserId);
  const savedByCurrentUser =
    interactionTargetPost.favoritedBy?.length > 0 &&
    interactionTargetPost.favoritedBy.some((f: { id: string }) => f.id === currentUserId);
  const repostedByCurrentUser =
    interactionTargetPost.repostedBy?.length > 0 &&
    interactionTargetPost.repostedBy.some((r: { id: string }) => r.id === currentUserId);

  const likeCount = interactionTargetPost._count?.likedBy ?? 0;
  const commentCount = interactionTargetPost._count?.comments ?? 0;
  const saveCount = interactionTargetPost._count?.favoritedBy ?? 0;
  const repostCount = interactionTargetPost._count?.reposts ?? 0;

  const authorName = displayPost.author?.name ?? "Usuário Desconhecido";
  const authorImageUrl = displayPost.author?.imageUrl;
  const authorRole = displayPost.author?.currentRole?.name;
  const isAuthorExMember = displayPost.author?.isExMember;
  const isAuthorAlumni = displayPost.author?.alumniDreamer;

  return (
    <div className="bg-[#0c1a4b]/50 rounded-lg border border-gray-700/50 overflow-hidden">
      {/* Seção Repost */}
      {isRepost && repostAuthor && (
        <div className="px-4 pt-3 pb-1 text-sm text-gray-400 flex items-center gap-2">
          <Repeat2 className="w-4 h-4" />
          <span>{repostAuthor.name} repostou</span>
        </div>
      )}

      {/* Cabeçalho do Post */}
      <div className="flex items-start justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={authorImageUrl ?? undefined} />
            <AvatarFallback>{authorName.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-white">{authorName}</p>
            <p className="text-xs text-gray-400">
              {isAuthorExMember
                ? "Ex-Membro"
                : authorRole ?? "Cargo Indefinido"}
              {isAuthorExMember && isAuthorAlumni && (
                <Badge
                  variant="outline"
                  className="ml-2 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-400"
                >
                  Alumni Dreamer
                </Badge>
              )}
            </p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(displayPost.createdAt), {
                addSuffix: true,
                locale: ptBR,
              })}
              {isRepost && ` (repostado ${postTime})`}
            </p>
          </div>
        </div>
        {/* Dropdown de Opções */}
        {(canDelete || canPin || canEdit) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-white"
                disabled={isDeleting || isPinning}
              >
                {isDeleting || isPinning ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreHorizontal className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#010d26] text-white border-gray-700">
              {canPin && (
                <DropdownMenuItem
                  onClick={() => handlePinPost(!post.isFixed)}
                  className="cursor-pointer"
                >
                  {post.isFixed ? (
                    <PinOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Pin className="mr-2 h-4 w-4" />
                  )}
                  {post.isFixed ? "Desfixar" : "Fixar no topo"}
                </DropdownMenuItem>
              )}
              {canEdit && (
                <DropdownMenuItem onClick={startEditing}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar Post
                </DropdownMenuItem>
              )}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => handleDeletePost()}
                  className="text-red-500 hover:!text-red-400 cursor-pointer"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> {isOwnerOfOriginal && !isOwnerOfWrapper ? "Excluir Post" : "Excluir Repost"}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Conteúdo do Post */}
      {isEditing ? (
        <div className="px-4 pb-2 space-y-2">
          <Textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="bg-black/30 border-gray-600 rounded-md min-h-[100px] text-sm text-gray-200 focus-visible:ring-1 focus-visible:ring-[#f5b719]"
            maxLength={5000} // Consistente com schema
            disabled={isEditingPost}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={cancelEditing}
              disabled={isEditingPost}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={saveEdit}
              disabled={
                isEditingPost ||
                editedContent.trim() === displayPost.content.trim()
              }
              className="bg-[#0126fb] hover:bg-[#0126fb]/90"
            >
              {isEditingPost && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      ) : (
        // Renderização normal do conteúdo
        <div className="px-4 pb-2 whitespace-pre-wrap text-gray-200 text-sm">
          {!showMore && displayPost.content.length > 300
            ? `${displayPost.content.slice(0, 300)}...` // Mostra reticências
            : displayPost.content}
          {displayPost.content.length > 300 && (
            <Button // Usar botão para melhor acessibilidade
              variant="link"
              className="text-[#f5b719] hover:text-[#f5b719]/80 underline h-auto p-0 ml-1 text-sm"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Ver Menos" : "Ver Mais"}
            </Button>
          )}
        </div>
      )}

      {/* Anexos (Imagens Grid) */}
      {displayPost.attachments && displayPost.attachments.length > 0 && (
        <div
          className={cn(
            "grid gap-1 mt-2",
            displayPost.attachments.length === 1
              ? "grid-cols-1"
              : displayPost.attachments.length === 2
              ? "grid-cols-2"
              : displayPost.attachments.length === 3
              ? "grid-cols-3" // Ou layout 2+1
              : "grid-cols-2 grid-rows-2" // Layout 2x2 para 4+ imagens
          )}
        >
          {displayPost.attachments.slice(0, 4).map(
            (
              att,
              index // Limita a 4 previews
            ) => (
              <div
                key={att.id}
                className={cn(
                  "relative aspect-video bg-black/20 flex items-center justify-center", // aspect-video ou aspect-square
                  displayPost.attachments.length === 3 && index === 0
                    ? "col-span-3" // Exemplo layout 1+2
                    : displayPost.attachments.length > 4 && index === 3
                    ? "brightness-50"
                    : "" // Escurece a última se houver mais
                )}
              >
                {/* Reutilizar RenderAttachment ou adaptar a lógica dele aqui */}
                {/* Idealmente, RenderAttachment já lida com signed URLs se 'att.url' for chave S3 */}
                <RenderAttachment attachment={att} />
                {displayPost.attachments.length > 4 && index === 3 && (
                  <div className="absolute inset-0 flex items-center justify-center text-white text-2xl font-bold">
                    +{displayPost.attachments.length - 4}
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {/* Contagem de Likes e Comentários */}
      <div className="px-4 py-2 flex justify-between items-center text-xs text-gray-400">
        <span className="hover:underline cursor-pointer">
          {likeCount > 0 && `${likeCount} curtida${likeCount > 1 ? "s" : ""}`}
        </span>
        {/* Span clicável para abrir comentários */}
        <span
          onClick={() => setShowComments(!showComments)}
          className="hover:underline cursor-pointer"
        >
          {commentCount > 0 &&
            `${commentCount} comentário${commentCount > 1 ? "s" : ""}`}
        </span>
        <span className="hover:underline cursor-pointer">
          {repostCount > 0 &&
            `${repostCount} repost${repostCount > 1 ? "s" : ""}`}
        </span>
        <span className="hover:underline cursor-pointer">
          {saveCount > 0 && `${saveCount} Salvo${saveCount > 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Botões de Ação */}
      <div className="flex justify-around border-t border-gray-700/50 mx-4 py-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => likePost()}
          className={cn(
            "text-gray-400 hover:text-[#f5b719] hover:bg-[#f5b719]/10",
            likedByCurrentUser && "text-[#f5b719]"
          )}
        >
          <ThumbsUp
            className={cn(
              "w-4 h-4 mr-2",
              likedByCurrentUser && "fill-[#f5b719]"
            )}
          />{" "}
          <span className="hidden sm:block">Gostei</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowComments(!showComments)}
          className="text-gray-400 hover:text-[#f5b719] hover:bg-[#f5b719]/10"
        >
          <MessageCircle className="w-4 h-4 mr-2" />{" "}
          <span className="hidden sm:block">Comentar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleToggleRepost()}
          disabled={isTogglingRepost}
          className="text-gray-400 hover:text-[#f5b719] hover:bg-[#f5b719]/10"
        >
          {isTogglingRepost ? (
            <Loader2 />
          ) : (
            <Repeat2
              className={cn(
                "w-4 h-4 mr-2",
                repostedByCurrentUser && "fill-[#f5b719] text-[#f5b719]"
              )}
            />
          )}{" "}
          <span className="hidden sm:block">Repostar</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => savePost()}
          className={cn(
            "text-gray-400 hover:text-[#f5b719] hover:bg-[#f5b719]/10",
            savedByCurrentUser && "text-[#f5b719]"
          )}
        >
          <Bookmark
            className={cn(
              "w-4 h-4 mr-2",
              savedByCurrentUser && "fill-[#f5b719]"
            )}
          />{" "}
          <span className="hidden sm:block">Salvar</span>
        </Button>
      </div>

      {/* Seção de Comentários (Condicional) */}
      {showComments && (
        <CommentSection
          postId={interactionTargetPost.id}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
};

export default PostCard;
