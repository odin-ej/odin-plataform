/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { EyeIcon, Search, Grip, List, FolderPlus } from "lucide-react";
import React, { useState, useMemo } from "react";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import CustomCard from "../../Global/Custom/CustomCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FileBrowser from "./FileBrowser";
import FileDetailsPanel from "./FileDetailsPanel";
import OraculoSidebar from "./OraculoSidebar";
import ModalConfirm from "../../Global/ModalConfirm";
import {
  FullOraculoFile,
  FullOraculoFolder,
  OraculoPageProps,
} from "@/app/(dashboard)/oraculo/page";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission, cn } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { OraculoAreas } from "@prisma/client";
import OraculoActionModal from "./OraculoActionModal";
import { SyncOraculoPanel } from "./SyncOraculoPanel";

type OraculoActionType = "createFolder" | "uploadFile" | "rename";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const OraculoContent = ({ initialData }: { initialData: OraculoPageProps }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedItem, setSelectedItem] = useState<FullOraculoFile | null>(
    null
  );
  const [activeFilter, setActiveFilter] = useState<
    "all" | "favorites" | "recents"
  >("all");
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string | null; name: string }[]
  >([{ id: null, name: "Início" }]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [actionModalState, setActionModalState] = useState<{
    type: OraculoActionType | null;
    item?: any;
    restrictedToAreas?: OraculoAreas[];
  }>({ type: null });
  const [itemToDelete, setItemToDelete] = useState<
    FullOraculoFile | FullOraculoFolder | null
  >(null);

  const { data, isLoading } = useQuery<OraculoPageProps>({
    queryKey: ["oraculoData"],
    queryFn: async () => (await axios.get(`${API_URL}/api/oraculo`)).data,
    initialData,
  });

  const allVisibleItems = useMemo(() => {
    if (!data || !user) return [];

    const userAreas = (user.currentRole?.area as OraculoAreas[]) || [];
    const isDirector = checkUserPermission(user, DIRECTORS_ONLY);

    const hasDirectPermission = (item: FullOraculoFile | FullOraculoFolder) => {
        if (isDirector) return true;
        const restrictedAreas = item.restrictedToAreas;
        if (!restrictedAreas || restrictedAreas.length === 0) return true;
        if (restrictedAreas.includes(OraculoAreas.GERAL as any)) return true;
        return restrictedAreas.some((area) => userAreas.includes(area));
    };

    const allFoldersMap = new Map(data.folders.map(f => [f.id, f]));
    const accessibleItems = new Set<FullOraculoFile | FullOraculoFolder>();

    const allItems = [...data.folders, ...data.files];

    allItems.forEach(item => {
        if (hasDirectPermission(item)) {
            accessibleItems.add(item);
            let parentId = 'folderId' in item ? item.folderId : item.parentId;
            while (parentId) {
                const parentFolder = allFoldersMap.get(parentId);
                if (parentFolder) {
                    accessibleItems.add(parentFolder);
                    parentId = parentFolder.parentId;
                } else {
                    parentId = null;
                }
            }
        }
    });

    return Array.from(accessibleItems);
  }, [data, user]);


  const filteredAndSearchedItems = useMemo(() => {
    let items = allVisibleItems;

    if (activeFilter === "favorites") {
        items = items.filter(item => 'isFavorite' in item && item.isFavorite);
    }
    if (activeFilter === "recents") {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        items = items.filter(item => new Date(item.createdAt) > thirtyDaysAgo);
    }
    
    if (searchQuery) {
        const lowercasedQuery = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        // Quando há pesquisa, queremos mostrar uma lista plana de resultados, não a estrutura de pastas
        return {
            folders: items.filter(item => "parentId" in item && item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lowercasedQuery)) as FullOraculoFolder[],
            files: items.filter(item => !("parentId" in item) && item.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").includes(lowercasedQuery)) as FullOraculoFile[],
            isSearchResult: true,
        };
    }
    
    return {
        folders: items.filter(item => "parentId" in item) as FullOraculoFolder[],
        files: items.filter(item => !("parentId" in item)) as FullOraculoFile[],
        isSearchResult: false,
    };
  }, [allVisibleItems, activeFilter, searchQuery]);

  const { mutate: toggleFavoriteMutation } = useMutation({
    mutationFn: (fileId: string) =>
      axios.patch(`${API_URL}/api/oraculo/files/${fileId}/favorite`),
    onSuccess: (updatedFile) => {
      toast.success("Favorito atualizado!");
      queryClient.invalidateQueries({ queryKey: ["oraculoData"] });
      setSelectedItem(updatedFile.data);
    },
    onError: () => toast.error("Erro ao atualizar favorito."),
  });

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: (item: { id: string; type: "file" | "folder" }) =>
      axios.delete(`${API_URL}/api/oraculo/${item.type}s/${item.id}`),
    onSuccess: () => {
      toast.success("Item deletado com sucesso!");
      setSelectedItem(null);
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["oraculoData"] });
    },
    onError: (e: AxiosError<{ message: string }>) => {
      toast.error("Erro ao deletar", {
        description: e.response?.data?.message,
      });
      setItemToDelete(null);
    },
  });

  const { mutate: actionMutation, isPending: isActionLoading } = useMutation({
    mutationFn: async ({
      type,
      payload,
    }: {
      type: OraculoActionType;
      payload: any;
    }) => {
      if (type === "rename") {
        const { item, name } = payload;
        const itemType = "parentId" in item ? "folders" : "files";
        return axios.patch(`${API_URL}/api/oraculo/${itemType}/${item.id}`, {
          name,
          restrictedToAreas: payload.restrictedToAreas,
        });
      }
      // Para createFolder e uploadFile, o payload já é o FormData
      return axios.post(`${API_URL}/api/oraculo/create`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      toast.success("Ação concluída com sucesso!");
      setActionModalState({ type: null });
      queryClient.invalidateQueries({ queryKey: ["oraculoData"] });
    },
    onError: (e: AxiosError<{ message: string }>) =>
      toast.error("Falha na operação", {
        description: e.response?.data?.message,
      }),
  });

  const { mutate: moveItemMutation } = useMutation({
    mutationFn: ({
      itemId,
      targetFolderId,
    }: {
      itemId: string;
      targetFolderId: string | null;
    }) => {
      return axios.patch(`${API_URL}/api/oraculo/move`, {
        itemId,
        targetFolderId,
      });
    },
    onSuccess: () => {
      toast.success("Item movido com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["oraculoData"] });
    },
    onError: (e: AxiosError<{ message: string }>) => {
      toast.error("Erro ao mover item", {
        description: e.response?.data?.message,
      });
    },
  });

  const handleMoveItem = (itemId: string, targetFolderId: string | null) => {
    // Adicione aqui verificações, se necessário (ex: não mover uma pasta para dentro de si mesma)
    moveItemMutation({ itemId, targetFolderId });
  };

  const buildBreadcrumbsFromId = (folderId: string | null) => {
    if (folderId === null) {
      setBreadcrumbs([{ id: null, name: "Início" }]);
      return;
    }
    const path = [{ id: "", name: "Início" }];
    let currentId: string | null = folderId;
    const allFolders = data?.folders || [];

    while (currentId) {
      const folder = allFolders.find(
        (f: { id: string | null }) => f.id === currentId
      );
      if (folder) {
        path.splice(1, 0, { id: folder.id as string, name: folder.name });
        currentId = folder.parentId;
      } else {
        currentId = null; // Encerra o loop se a pasta pai não for encontrada
      }
    }
    setBreadcrumbs(path);
  };

  const handleItemSelect = (item: FullOraculoFile | FullOraculoFolder) => {
    // Se for uma pasta, não faz nada (a navegação é tratada no FileBrowser).
    // Se for um arquivo, define como selecionado para mostrar os detalhes.
    if (!("parentId" in item)) {
      setSelectedItem(item);
    }
  };

  const handleAction = (type: OraculoActionType, item?: any) => {
    setTimeout(() => {
      setActionModalState({ type, item });
    }, 10); // Pequeno delay para garantir que o ContextMenu feche
  };

  const handleFolderNavigation = (folder: FullOraculoFolder | null) => {
    if (folder === null) {
      // Se for nulo, volta para a raiz
      setCurrentFolderId(null);
      setBreadcrumbs([{ id: null, name: "Início" }]);
    } else {
      // Se for uma pasta, constrói o caminho
      buildBreadcrumbsFromId(folder.id);
      setCurrentFolderId(folder.id);
    }
  };

  const isDirector = useMemo(
    () => checkUserPermission(user, DIRECTORS_ONLY),
    [user]
  );

  return (
    <>
      <CustomCard
        value={0}
        title="Oráculo"
        icon={EyeIcon}
        type="introduction"
        description="Acesse e gerencie os arquivos importantes da empresa."
      />

      <div className="mt-6 p-4 rounded-lg bg-[#010d26] border border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative w-full col-span-1 md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Pesquisar no Oráculo..."
              className="w-full text-xs md:text-md pl-10 bg-transparent h-full text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <div className="absolute mt-1 w-full bg-[#00205e] border border-[#0126fb] rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {[...filteredAndSearchedItems.folders, ...filteredAndSearchedItems.files].length >
                0 ? (
                  [...filteredAndSearchedItems.folders, ...filteredAndSearchedItems.files].map(
                    (item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 hover:bg-white/10 cursor-pointer text-white text-sm flex justify-between"
                        onClick={() => {
                          if ("parentId" in item) {
                            // pasta → navega
                            handleFolderNavigation(item);
                          } else {
                            // arquivo → abre preview
                            setSelectedItem(item);
                          }
                          setSearchQuery(""); // limpa barra
                        }}
                      >
                        {item.name}
                        {"parentId" in item ? (
                          <span className="text-xs opacity-70">[Pasta]</span>
                        ) : (
                          <span className="text-xs opacity-70">[Arquivo]</span>
                        )}
                      </div>
                    )
                  )
                ) : (
                  <div className="px-3 py-2 text-gray-400 text-sm">
                    Nenhum resultado
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex md:justify-end items-center gap-2 w-full col-span-1">
            <Button
              onClick={() => setActionModalState({ type: "createFolder" })}
              className="bg-[#0126fb] hover:bg-[#0126fb]/80 flex-1"
            >
              <FolderPlus className="mr-2 h-4 w-4" /> Criar Pasta
            </Button>
            <div className="flex items-center p-1 bg-[#00205e]/30 rounded-lg border border-gray-700">
              <Button
                variant="ghost"
                className={cn(
                  "text-[#0126fb] bg-[#0126fb]/10 hover:bg-[#0126fb]/20 transition-colors hover:text-white border-[#0126fb]",
                  viewMode === "grid" &&
                    "text-white bg-[#f5b719] hover:bg-[#f5b719]/90 border-[#f5b719]"
                )}
                size="icon"
                onClick={() => setViewMode("grid")}
                disabled={viewMode === "grid"}
              >
                <Grip />
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  "text-[#0126fb] bg-[#0126fb]/10 hover:bg-[#0126fb]/20 hover:text-white transition-colors border-[#0126fb]",
                  viewMode === "list" &&
                    "text-white bg-[#f5b719] hover:bg-[#f5b719]/90 border-[#f5b719]"
                )}
                size="icon"
                onClick={() => setViewMode("list")}
                disabled={viewMode === "list"}
              >
                <List />
              </Button>
            </div>
          </div>
        </div>
        <OraculoSidebar
          allFolders={data?.folders || []}
          activeFilter={activeFilter}
          onFilterChange={(filter) => {
            setActiveFilter(filter);
            setSelectedItem(null);
          }}
          onFolderClick={handleFolderNavigation}
        />

        {isDirector && (
          <div className="mt-4">
            <SyncOraculoPanel />
          </div>
        )}
      </div>

      <div className="mt-4 p-4 rounded-lg grid grid-cols-1 lg:grid-cols-10 gap-6 bg-[#010d26] border border-gray-800 min-h-[50vh]">
        <div className={selectedItem ? "lg:col-span-6" : "lg:col-span-10"}>
          <FileBrowser
            onMoveItem={handleMoveItem}
            allFolders={filteredAndSearchedItems.folders}
            allFiles={filteredAndSearchedItems.files}
            viewMode={viewMode}
            onItemSelect={handleItemSelect}
            isLoading={isLoading}
            breadcrumbs={breadcrumbs}
            setBreadcrumbs={setBreadcrumbs}
            currentFolderId={currentFolderId}
            setCurrentFolderId={setCurrentFolderId}
            // Passa os handlers que disparam a abertura dos modais com o setTimeout
            onUpload={() => handleAction("uploadFile")}
            onCreateFolder={() => handleAction("createFolder")}
            onRename={(item) => handleAction("rename", item)}
            onDelete={(item) => {
              setTimeout(() => {
                setItemToDelete(item);
              }, 10); // Pequeno delay para garantir que o ContextMenu feche
            }}
          />
        </div>

        {selectedItem && (
          <div className="lg:col-span-4">
            <FileDetailsPanel
              file={selectedItem}
              breadcrumbs={breadcrumbs}
              onClose={() => setSelectedItem(null)}
              onDelete={() => setItemToDelete(selectedItem)}
              onFavorite={() =>
                "isFavorite" in selectedItem &&
                toggleFavoriteMutation(selectedItem.id)
              }
            />
          </div>
        )}
      </div>

      {actionModalState.type && (
        <OraculoActionModal
          isOpen={!!actionModalState.type}
          onClose={() => {
            setActionModalState({ type: null });
            setSelectedItem(null);
          }}
          actionType={actionModalState.type}
          itemToEdit={actionModalState.item}
          currentFolderId={currentFolderId ?? "root"}
          onConfirm={actionMutation}
          isLoading={isActionLoading}
        />
      )}

      {itemToDelete && (
        <ModalConfirm
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() =>
            deleteMutation({
              id: itemToDelete.id,
              type: "parentId" in itemToDelete ? "folder" : "file",
            })
          }
          isLoading={isDeleting}
          title={`Excluir "${itemToDelete.name}"`}
          description="Esta ação é permanente e não pode ser desfeita."
          warningMessage={
            "parentId" in itemToDelete
              ? "Atenção: Excluir uma pasta também excluirá permanentemente todos os itens dentro dela."
              : undefined
          }
        />
      )}
    </>
  );
};
export default OraculoContent;
