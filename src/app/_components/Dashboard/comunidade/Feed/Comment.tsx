/* eslint-disable @typescript-eslint/no-explicit-any */
// components/Feed/Comment.tsx
"use client";

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ThumbsUp, Loader2, Send, CornerDownRight, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FullComment, PaginatedResponse } from '@/lib/types/feed'; // Ajuste o caminho
import { useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { toggleCommentLike, createComment, getCommentReplies, deleteComment } from '@/lib/actions/feed'; // Ajuste o caminho
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/AuthProvider';

const replyFormSchema = z.object({
  content: z.string().min(1, "Resposta vazia").max(2000),
});
type ReplyForm = z.infer<typeof replyFormSchema>;

interface CommentProps {
  comment: FullComment;
  postId: string; // ID do post pai
  currentUserId: string;
}

const Comment = ({ comment, postId, currentUserId }: CommentProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Para input de resposta
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [showReplies, setShowReplies] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = comment.authorId === currentUserId;

  // --- Mutação para Curtir/Descurtir Comentário ---
  const { mutate: likeComment } = useMutation({
      mutationFn: () => toggleCommentLike(comment.id),
      onMutate: async () => {
          // Atualização Otimista
          await queryClient.cancelQueries({ queryKey: ['comments', postId] });
          await queryClient.cancelQueries({ queryKey: ['replies', comment.id] }); // Também cancela replies se for resposta

          const updateCommentData = (oldData: any) => {
              if (!oldData?.pages) return oldData;
              return {
                  ...oldData,
                  pages: oldData.pages.map((page: any) => ({
                      ...page,
                      items: page.items.map((c: FullComment) => {
                          if (c.id === comment.id) {
                              const currentlyLiked = (c._count?.likedBy ?? 0) > 0;
                              return {
                                  ...c,
                                  _count: { ...c._count, likedBy: currentlyLiked ? c._count.likedBy - 1 : c._count.likedBy + 1 }
                              };
                          }
                          // Otimismo para respostas (se este for um comentário pai)
                          if (c.replies?.length > 0) {
                              return {
                                  ...c,
                                  replies: c.replies.map((reply) => {
                                      if (reply.id === comment.id) {
                                          const currentlyLikedReply = (reply._count?.likedBy ?? 0) > 0;
                                          return {
                                              ...reply,
                                              _count: { ...reply._count, likedBy: currentlyLikedReply ? reply._count.likedBy - 1 : reply._count.likedBy + 1 }
                                          };
                                      }
                                      return reply;
                                  })
                              }
                          }
                          return c;
                      })
                  }))
              };
          };

          const previousComments = queryClient.getQueryData(['comments', postId]);
          const previousReplies = queryClient.getQueryData(['replies', comment.parentId]); // Se for resposta
          queryClient.setQueryData(['comments', postId], updateCommentData);
          if (comment.parentId) queryClient.setQueryData(['replies', comment.parentId], updateCommentData);

          return { previousComments, previousReplies };
      },
      onError: (err, _vars, context: any) => {
          if (context?.previousComments) queryClient.setQueryData(['comments', postId], context.previousComments);
          if (context?.previousReplies) queryClient.setQueryData(['replies', comment.parentId], context.previousReplies);
          toast.error("Erro ao curtir", { description: (err as Error).message });
      },
      onSettled: () => {
          queryClient.invalidateQueries({ queryKey: ['comments', postId] });
          if(comment.parentId) queryClient.invalidateQueries({ queryKey: ['replies', comment.parentId] });
      },
  });

   // --- Mutação para Deletar Comentário ---
  const { mutate: handleDeleteComment } = useMutation({
    mutationFn: () => deleteComment(comment.id),
    onMutate: () => setIsDeleting(true),
    onSuccess: () => {
        toast.success("Comentário excluído.");
        // Atualização otimista: Remove o comentário da lista
        queryClient.setQueryData(['comments', postId], (oldData: any) => updateDataToRemoveComment(oldData, comment.id));
        if (comment.parentId) queryClient.setQueryData(['replies', comment.parentId], (oldData: any) => updateDataToRemoveComment(oldData, comment.id));
        queryClient.invalidateQueries({ queryKey: ['feedPosts'] }); // Revalida contagem no post
        queryClient.invalidateQueries({ queryKey: ['initialFeedData'] });
    },
    onError: (err: any) => toast.error("Erro ao excluir", { description: err.message }),
    onSettled: () => setIsDeleting(false),
  });

  // Helper para atualização otimista de deleção
  const updateDataToRemoveComment = (oldData: any, commentIdToRemove: string) => {
      if (!oldData?.pages) return oldData;
      return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
              ...page,
              items: page.items.filter((c: FullComment) => c.id !== commentIdToRemove)
                               .map((c: FullComment) => ({ // Remove das replies tbm
                                   ...c,
                                   replies: Array.isArray(c.replies)
                                     ? (c.replies.filter((r: any) => r.id !== commentIdToRemove) as FullComment[])
                                     : c.replies
                               }))
          }))
      };
  };


  // --- Formulário de Resposta ---
  const replyForm = useForm<ReplyForm>({
    resolver: zodResolver(replyFormSchema),
    defaultValues: { content: "" },
  });

  // --- Mutação para Criar Resposta ---
   const { mutate: addReply, isPending: isReplying } = useMutation({
     mutationFn: createComment,
     onSuccess: (data) => {
         // Atualização otimista: Adiciona a resposta
         queryClient.setQueryData(['replies', comment.id], (oldData: any) => {
              if (!oldData || !oldData.pages) return { pages: [{ items: [data.comment], nextCursor: null }], pageParams: [undefined] }; // Cria se não existe
              const firstPage = oldData.pages[0];
              const newFirstPage = { ...firstPage, items: [data.comment, ...firstPage.items] };
              return { ...oldData, pages: [newFirstPage, ...oldData.pages.slice(1)] };
         });
         // Invalida contagem de replies no comentário pai e no post
          queryClient.invalidateQueries({ queryKey: ['comments', postId] });
          if(comment.parentId) queryClient.invalidateQueries({ queryKey: ['replies', comment.parentId] });
          queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
          queryClient.invalidateQueries({ queryKey: ['initialFeedData'] });
         replyForm.reset();
         setShowReplyInput(false); // Fecha input após sucesso
         setShowReplies(true); // Garante que as respostas sejam mostradas
     },
     onError: (err: any) => toast.error("Erro ao responder", { description: err.message })
  });

  const onReplySubmit = (formData: ReplyForm) => {
    addReply({
        content: formData.content,
        postId: postId,
        parentId: comment.id, // ID do comentário atual como pai
    });
  };

  // --- Infinite Query para Respostas ---
   const {
    data: repliesData,
    fetchNextPage: fetchNextReplies,
    hasNextPage: hasNextReplies,
    isFetchingNextPage: isFetchingNextReplies,
    isLoading: isLoadingReplies,
  } = useInfiniteQuery<PaginatedResponse<FullComment>>({
    queryKey: ['replies', comment.id], // Chave inclui commentId
    queryFn: ({ pageParam }) => getCommentReplies(comment.id, pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: showReplies, // Só busca quando showReplies é true
  });
  const allReplies = repliesData?.pages.flatMap(page => page.items) ?? [];


  // --- Dados Derivados ---
  const commentTime = formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: ptBR });
  const likedByCurrentUser = comment.likedBy?.length > 0;
  const likeCount = comment._count?.likedBy ?? 0;
  const replyCount = comment._count?.replies ?? 0;

  const authorName = comment.author?.name ?? 'Usuário';
  const authorImageUrl = comment.author?.imageUrl;
  const authorRole = comment.author?.currentRole?.name;
  const isAuthorExMember = comment.author?.isExMember;
  const isAuthorAlumni = comment.author?.alumniDreamer;

  return (
    <div className="flex items-start gap-2">
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarImage src={authorImageUrl ?? undefined} />
        <AvatarFallback>{authorName.substring(0, 1)}</AvatarFallback>
      </Avatar>
      <div className="flex-grow bg-gray-800/40 rounded-lg px-3 py-2 text-sm">
        {/* Cabeçalho do Comentário */}
        <div className="flex justify-between items-center mb-1">
          <div>
            <span className="font-semibold text-white mr-1">{authorName}</span>
            <span className="text-xs text-gray-400">
              · {isAuthorExMember ? "Ex-Membro" : authorRole ?? ''}
              {isAuthorExMember && isAuthorAlumni && (
                  <Badge variant="outline" className="ml-1.5 border-[#f5b719] text-[#f5b719] text-[9px] px-1 py-0 leading-tight">Alumni Dreamer</Badge>
              )}
            </span>
          </div>
          <span className="text-xs text-gray-500">{commentTime}</span>
        </div>

        {/* Conteúdo */}
        <p className="text-gray-300 whitespace-pre-wrap">{comment.content}</p>

        {/* Ações do Comentário */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <button
            onClick={() => likeComment()}
            className={cn(
                "flex items-center gap-1 text-gray-400 hover:text-[#f5b719]",
                likedByCurrentUser && "text-[#f5b719]"
            )}
          >
            <ThumbsUp className={cn("w-3 h-3", likedByCurrentUser && "fill-[#f5b719]")} />
            Gostei {likeCount > 0 && `(${likeCount})`}
          </button>
          <button
            onClick={() => setShowReplyInput(!showReplyInput)}
            className="text-gray-400 hover:text-[#f5b719]"
          >
            Responder
          </button>
          {isOwner && ( // Botão Deletar
             <button
                onClick={() => handleDeleteComment()}
                className="text-gray-400 hover:text-red-500"
                disabled={isDeleting}
              >
               {isDeleting ? <Loader2 className="h-3 w-3 animate-spin"/> : <Trash2 className='h-3 w-3'/>}
             </button>
          )}
        </div>

        {/* Input de Resposta */}
        {showReplyInput && user && (
            <form onSubmit={replyForm.handleSubmit(onReplySubmit)} className="flex items-start gap-2 mt-3">
               <Avatar className="h-6 w-6 mt-1 flex-shrink-0">
                  <AvatarImage src={user.imageUrl ?? undefined} />
                  <AvatarFallback>{user.name?.substring(0,1) ?? 'U'}</AvatarFallback>
               </Avatar>
               <Textarea
                  placeholder={`Respondendo a ${authorName}...`}
                  className="bg-gray-700/50 border-gray-600 rounded-lg min-h-[36px] resize-none text-xs scrollbar-thin scrollbar-thumb-gray-500"
                  rows={1}
                  disabled={isReplying}
                  {...replyForm.register("content")}
               />
               <Button type="submit" size="icon" className="h-8 w-8 bg-[#0126fb] hover:bg-[#0126fb]/90 flex-shrink-0" disabled={isReplying || !replyForm.formState.isValid}>
                  {isReplying ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
               </Button>
            </form>
        )}

        {/* Exibir Respostas */}
        {replyCount > 0 && !showReplies && (
             <Button variant="link" size="sm" onClick={() => setShowReplies(true)} className="text-xs text-[#f5b719] hover:text-[#f5b719]/80 px-0 h-auto mt-2">
                <CornerDownRight className='w-3 h-3 mr-1'/> Ver {replyCount} resposta{replyCount > 1 ? 's' : ''}
             </Button>
        )}

        {showReplies && (
            <div className='mt-3 space-y-3 pl-5 border-l border-gray-700 ml-1'>
                 {isLoadingReplies && <Loader2 className="mx-auto my-2 h-4 w-4 animate-spin text-gray-400" />}
                 {allReplies.map(reply => (
                    <Comment key={reply.id} comment={reply} postId={postId} currentUserId={currentUserId} />
                 ))}
                 {hasNextReplies && (
                    <Button variant="link" size="sm" onClick={() => fetchNextReplies()} disabled={isFetchingNextReplies} className="text-xs text-[#f5b719] hover:text-[#f5b719]/80 px-0 h-auto">
                        {isFetchingNextReplies ? <Loader2 className="mr-1 h-3 w-3 animate-spin"/> : null} Carregar mais respostas
                    </Button>
                 )}
            </div>
        )}

      </div>
    </div>
  );
};

export default Comment;