/* eslint-disable @typescript-eslint/no-explicit-any */
// components/Feed/CommentSection.tsx
"use client";

import React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getComments, createComment } from '@/lib/actions/feed'; // Ajuste o caminho
import { FullComment, PaginatedResponse } from '@/lib/types/feed'; // Ajuste o caminho
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth/AuthProvider'; // Para pegar o usuário logado no cliente
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import Comment from './Comment';

const commentFormSchema = z.object({
  content: z.string().min(1, "Comentário vazio").max(2000),
});
type CommentForm = z.infer<typeof commentFormSchema>;

interface CommentSectionProps {
  postId: string;
  currentUserId: string; // Passado do PostCard
}

const CommentSection = ({ postId, currentUserId }: CommentSectionProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Pega o usuário logado para o input de comentário

  // --- Infinite Scroll Query para Comentários ---
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<PaginatedResponse<FullComment>>({
    queryKey: ['comments', postId], // Chave inclui postId
    queryFn: ({ pageParam }) => getComments(postId, pageParam as string | undefined),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  // --- Formulário para Novo Comentário ---
  const form = useForm<CommentForm>({
    resolver: zodResolver(commentFormSchema),
    defaultValues: { content: "" },
  });

  // --- Mutação para Criar Comentário ---
  const { mutate: addComment, isPending: isCommenting } = useMutation({
     mutationFn: createComment,
     onSuccess: (data) => {
         // Atualização otimista: Adiciona o novo comentário ao início da primeira página
         queryClient.setQueryData(['comments', postId], (oldData: any) => {
             if (!oldData || !oldData.pages) return oldData;
             const firstPage = oldData.pages[0];
             const newFirstPage = {
                 ...firstPage,
                 items: [data.comment, ...firstPage.items],
             };
             return {
                 ...oldData,
                 pages: [newFirstPage, ...oldData.pages.slice(1)],
             };
         });
         // Invalida a contagem de comentários no post (se necessário)
         queryClient.invalidateQueries({ queryKey: ['feedPosts'] });
         queryClient.invalidateQueries({ queryKey: ['initialFeedData'] });
         form.reset(); // Limpa o input
     },
     onError: (err: any) => {
         toast.error("Erro ao comentar", { description: err.message });
     }
  });

  const onSubmit = (formData: CommentForm) => {
    addComment({
        content: formData.content,
        postId: postId,
        parentId: null, // Comentário de nível superior
    });
  };

  // Combina todos os comentários
  const allComments = data?.pages.flatMap(page => page.items) ?? [];

  return (
    <div className="bg-black/20 px-4 py-3 border-t border-gray-700/50 mt-2">
      {/* Input para Novo Comentário */}
      {user && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex items-start gap-2 mb-4">
              <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                 <AvatarImage src={user.imageUrl ?? undefined} />
                 <AvatarFallback>{user.name?.substring(0, 2) ?? 'U'}</AvatarFallback>
              </Avatar>
              <Textarea
                  placeholder="Adicione um comentário..."
                  className="bg-gray-800/50 border-gray-700 rounded-lg min-h-[40px] resize-none text-sm scrollbar-thin scrollbar-thumb-gray-600"
                  rows={1} // Começa pequeno
                  disabled={isCommenting}
                  {...form.register("content")}
              />
              <Button type="submit" size="icon" className="h-9 w-9 bg-[#0126fb] hover:bg-[#0126fb]/90 flex-shrink-0" disabled={isCommenting || !form.formState.isValid}>
                  {isCommenting ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
              </Button>
          </form>
      )}

      {/* Lista de Comentários */}
      {isLoading && <Loader2 className="mx-auto my-2 h-5 w-5 animate-spin text-gray-400" />}
      {error && <p className="text-xs text-red-500 text-center my-2">Erro ao carregar comentários.</p>}

      <div className="space-y-3">
        {allComments.map(comment => (
          <Comment key={comment.id} comment={comment} postId={postId} currentUserId={currentUserId} />
        ))}
      </div>

      {/* Botão Carregar Mais Comentários */}
      {hasNextPage && (
        <Button
          variant="link"
          className="text-xs text-[#f5b719] hover:text-[#f5b719]/80 mt-2 px-0"
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
          Carregar mais comentários
        </Button>
      )}
       {!isLoading && !hasNextPage && allComments.length > 0 && <p className="text-xs text-gray-500 text-center mt-3">Fim dos comentários.</p>}
       {!isLoading && allComments.length === 0 && <p className="text-xs text-gray-500 text-center mt-3">Nenhum comentário ainda.</p>}
    </div>
  );
};

export default CommentSection;