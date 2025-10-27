// components/Feed/FeedContent.tsx
"use client";

import React from "react"; // React importado
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { getInitialFeedData, getMorePosts } from "@/lib/actions/feed"; // Ajuste o caminho se necessário
import { FullPost, PaginatedResponse } from "@/lib/types/feed"; // Ajuste o caminho se necessário
import CreatePostInput from "./CreatePostInput"; // Input direto
import PostCard from "./PostCard"; // Componente para exibir post
import { Loader2 } from "lucide-react"; // Ícone de loading
import { useInView } from "react-intersection-observer"; // Para infinite scroll
import { FullUser } from "@/lib/server-utils";

interface FeedContentProps {
  currentUser: FullUser; // Objeto do usuário logado passado pela Page
}

// TO DO:
/*
  TERMINAR SISTEMA DE POSTS, COMENTÁRIOS
  ADICIONAR NOTIFICAÇÕES EM CRIAÇÃO E DELEÇÕES DE CANAIS E CONVERSAS
  PENSAR COMO FAZER ESSAS NOTIFICAÇÕES EM 
*/

const FeedContent = ({ currentUser }: FeedContentProps) => {
  // Query para buscar dados iniciais (posts fixados + primeira página do feed)
  // Aproveita os dados pré-buscados no servidor via HydrationBoundary
  const {
    data: initialData,
    isLoading: isLoadingInitial,
    error: initialError,
  } = useQuery({
    queryKey: ["initialFeedData", currentUser.id], // Chave de cache inclui ID do usuário
    queryFn: getInitialFeedData, // Função da action que busca os dados
    staleTime: 1000 * 60 * 5, // Cache inicial válido por 5 minutos
    refetchOnWindowFocus: false, // Não busca novamente só por trocar de aba
  });

  // Extrai os dados iniciais
  const pinnedPosts = initialData?.pinnedPosts ?? [];
  const initialFeedPage = initialData?.initialFeed; // A primeira página do feed

  // --- Infinite Scroll Query para o Feed Principal ---
  const {
    data: feedData, // Estrutura: { pages: PaginatedResponse<FullPost>[], pageParams: any[] }
    fetchNextPage, // Função para buscar a próxima página
    hasNextPage, // Booleano: há mais páginas para buscar?
    isFetchingNextPage, // Booleano: está buscando a próxima página agora?
    isLoading: isLoadingFeed, // Estado de loading APÓS o carregamento inicial
    error: feedError, // Erro na busca das páginas seguintes
  } = useInfiniteQuery({
    // Tipagem é inferida pelo React Query; adicionamos apenas parâmetros locais tipados para TS
    queryKey: ["feedPosts", currentUser.id], // Chave de cache separada para o feed paginado
    queryFn: ({ pageParam }: { pageParam?: string | undefined }) =>
      getMorePosts(pageParam), // Passa o cursor para a action
    initialPageParam: undefined, // Parâmetro inicial para a *primeira* chamada de fetchNextPage
    getNextPageParam: (lastPage: PaginatedResponse<FullPost>) =>
      lastPage.nextCursor, // Pega o cursor da última página buscada para a próxima
    enabled: !!initialFeedPage, // Habilita a busca infinita SÓ DEPOIS que os dados iniciais carregarem
    // Fornece os dados da primeira página (buscada no servidor) para o estado inicial da query infinita
    initialData: initialFeedPage
      ? { pages: [initialFeedPage], pageParams: [undefined] }
      : undefined,
    staleTime: 1000 * 60 * 2, // Mantém as páginas do feed "frescas" por 2 minutos
  });

  // --- Intersection Observer para Acionar Carregamento ---
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0.8, // Aciona quando 80% do elemento de trigger estiver visível
    triggerOnce: false, // Continua observando
  });

  // Efeito que chama fetchNextPage quando o trigger entra na viewport
  React.useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      console.log("[FeedContent] Buscando próxima página do feed...");
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Combina os posts de todas as páginas buscadas em um único array
  const allPosts = feedData?.pages.flatMap((page) => page.items) ?? [];

  // Define um estado geral de loading (considera o inicial E o subsequente)
  const isOverallLoading = isLoadingInitial || (isLoadingFeed && !feedData);

  return (
    // Container principal do feed com espaçamento entre seções
    <div className="w-full mx-auto py-6 px-4 lg:px-12 space-y-6">
      {/* 1. Input Inline para Criar Post */}
      <CreatePostInput currentUser={currentUser} />

      {/* 2. Seção de Posts Fixados */}
      {/* Mostra loader apenas durante a busca inicial */}
      {isLoadingInitial && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      )}
      {/* Mostra erro da busca inicial */}
      {initialError && !isLoadingInitial && (
        <p className="text-red-500 text-center text-sm py-4">
          Erro ao carregar posts fixados.
        </p>
      )}
      {/* Mostra posts fixados após carregar e se existirem */}
      {!isLoadingInitial && pinnedPosts.length > 0 && (
        <section aria-labelledby="pinned-posts-heading">
          {" "}
          {/* Boas práticas de acessibilidade */}
          <h2
            id="pinned-posts-heading"
            className="text-lg font-semibold text-gray-300 mb-4 px-1"
          >
            Em destaque
          </h2>
          <div className="space-y-4">
            {/* Mapeia e renderiza cada post fixado usando PostCard */}
            {pinnedPosts.map((post) => (
              <PostCard
                key={`pinned-${post.id}`}
                post={post}
                currentUserId={currentUser.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* 3. Seção do Feed Principal */}
      <section aria-labelledby="feed-heading">
        <h2
          id="feed-heading"
          className="text-lg font-semibold text-gray-300 mb-4 px-1 border-t border-gray-700/50 pt-6"
        >
          Feed
        </h2>
        {/* Mostra loader se for o carregamento inicial OU se estiver carregando as primeiras páginas sem dados ainda */}
        {isOverallLoading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        )}
        {/* Mostra erro da busca infinita */}
        {feedError && !isOverallLoading && (
          <p className="text-red-500 text-center text-sm py-4">
            Erro ao carregar o feed.
          </p>
        )}

        {/* Renderiza a lista de posts do feed */}
        <div className="space-y-4">
          {allPosts.map((post) => (
            <PostCard
              key={`feed-${post.id}`}
              post={post}
              currentUserId={currentUser.id}
            />
          ))}
        </div>

        {/* Elemento Trigger para Infinite Scroll */}
        <div
          ref={loadMoreRef}
          className="h-10 w-full mt-6 flex justify-center items-center"
        >
          {/* Mostra loader enquanto busca a próxima página */}
          {isFetchingNextPage && (
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          )}
          {/* Mensagem de fim do feed */}
          {!hasNextPage && !isOverallLoading && allPosts.length > 0 && (
            <p className="text-sm text-gray-500">Você chegou ao fim do feed.</p>
          )}
          {/* Mensagem se o feed estiver completamente vazio */}
          {!isOverallLoading &&
            allPosts.length === 0 &&
            pinnedPosts.length === 0 && (
              <p className="text-sm text-gray-500 text-center">
                O feed está vazio. Seja o primeiro a publicar!
              </p>
            )}
        </div>
      </section>
    </div>
  );
};

export default FeedContent;
