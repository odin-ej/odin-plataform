"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Folder,
  Loader2,
  ChevronRight,
  FileUp,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  FullOraculoFile,
  FullOraculoFolder,
} from "@/app/(dashboard)/oraculo/page";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import Pagination from "../../Global/Custom/Pagination";
import FolderCard from "./FolderCard";
import FileGridCard from "./FileGridCard";
import FileListRow from "./FileListRow";
import {
  DndContext,
  useDroppable,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import { checkUserPermission, cn } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { useAuth } from "@/lib/auth/AuthProvider";

interface FileBrowserProps {
  allFolders: FullOraculoFolder[];
  allFiles: FullOraculoFile[];
  viewMode: "grid" | "list";
  isLoading: boolean;
  onItemSelect: (file: FullOraculoFile) => void;
  breadcrumbs: { id: string | null; name: string }[];
  setBreadcrumbs: React.Dispatch<
    React.SetStateAction<{ id: string | null; name: string }[]>
  >;
  currentFolderId: string | null;
  setCurrentFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  onUpload: () => void;
  onCreateFolder: () => void;
  onRename: (item: FullOraculoFile | FullOraculoFolder) => void;
  onDelete: (item: FullOraculoFile | FullOraculoFolder) => void;
  onMoveItem: (itemId: string, targetFolderId: string | null) => void;
}

type DraggableItem = FullOraculoFile | FullOraculoFolder;

// CORREÇÃO: Componente renomeado de "Droppable" para "DroppableArea" para consistência.
const DroppableArea = ({
  id,
  children,
  className,
}: {
  id: string | null;
  children: React.ReactNode;
  className?: string;
}) => {
  const { isOver, setNodeRef } = useDroppable({ id: id || "content-root" });
  return (
    <div
      ref={setNodeRef}
      className={cn(className, "transition-colors", isOver && "bg-blue-500/10")}
    >
      {children}
    </div>
  );
};

const DroppableBreadcrumb = ({
  crumb,
  onClick,
  disabled,
}: {
  crumb: { id: string | null; name: string };
  onClick: () => void;
  disabled: boolean;
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: crumb.id || "breadcrumb-root", // ID 'root' para o "Início"
    disabled: disabled,
  });

  return (
    <div
      ref={setNodeRef}
      onClick={() => !disabled && onClick()}
      role="button"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      className={cn(
        "font-medium p-1 rounded-md transition-colors outline-none",
        !disabled && "hover:text-white hover:underline cursor-pointer",
        disabled && "text-white cursor-default",
        isOver && !disabled && "bg-blue-500/20 ring-2 ring-blue-500"
      )}
    >
      {crumb.name}
    </div>
  );
};

const ITEMS_PER_PAGE = 20;

const FileBrowser = (props: FileBrowserProps) => {
  const {
    onMoveItem,
    allFolders,
    allFiles,
    viewMode,
    isLoading,
    onItemSelect,
    breadcrumbs,
    setBreadcrumbs,
    currentFolderId,
    setCurrentFolderId,
    onUpload,
    onCreateFolder,
    onRename,
    onDelete,
  } = props;

  const [currentPage, setCurrentPage] = useState(1);
  const [activeItem, setActiveItem] = useState<DraggableItem | null>(null);
  const { user } = useAuth();
  const isDirector = useMemo(
    () => checkUserPermission(user, DIRECTORS_ONLY),
    [user]
  );
  const isOwner = user?.id === activeItem?.ownerId;
  const canMutate = isOwner || isDirector;
  const itemsToDisplay = useMemo(() => {
    // LÓGICA: Mantida a lógica original que reflete seus modelos de dados.
    // Pastas usam 'parentId'
    const currentFolders = allFolders.filter(
      (f) => f.parentId === currentFolderId
    );
    // Arquivos usam 'folderId'
    const currentFiles = allFiles.filter((f) => f.folderId === currentFolderId);
    return [
      ...currentFolders.sort((a, b) => a.name.localeCompare(b.name)),
      ...currentFiles.sort((a, b) => a.name.localeCompare(b.name)),
    ];
  }, [currentFolderId, allFolders, allFiles]);

  useEffect(() => setCurrentPage(1), [itemsToDisplay.length, currentFolderId]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return itemsToDisplay.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [itemsToDisplay, currentPage]);

  const totalPages = Math.ceil(itemsToDisplay.length / ITEMS_PER_PAGE);

  const handleFolderClick = (folder: FullOraculoFolder) => {
    setCurrentFolderId(folder.id);
    setBreadcrumbs((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (folderId: string | null, index: number) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => prev.slice(0, index + 1));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveItem(event.active.data.current?.item ?? null);
  };

  // CORREÇÃO: Lógica de 'handleDragEnd' completada e robustecida.
  const handleDragEnd = (event: DragEndEvent) => {
    setActiveItem(null);
    const { over, active } = event;

    if (!over) return;

    const draggedItem = active.data.current?.item as DraggableItem | undefined;
    if (!draggedItem) return;

    const targetId = over.id as string;
    const targetIsRoot =
      targetId === "breadcrumb-root" || targetId === "content-root";
    const targetFolderId = targetIsRoot ? null : targetId;
    const isFolder = "parentId" in draggedItem;

    // Previne que uma pasta seja movida para dentro dela mesma.
    if (isFolder && active.id === targetFolderId) return;

    // Previne mover um item para a pasta onde ele já está.
    const currentParentId = isFolder
      ? draggedItem.parentId
      : draggedItem.folderId;
    if (currentParentId === targetFolderId) return;

    onMoveItem(active.id as string, targetFolderId);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  const renderItem = (item: DraggableItem) => (
    <ContextMenu key={item.id}>
      <ContextMenuTrigger className="w-full h-full rounded-lg focus:outline-none">
        {"parentId" in item ? (
          <FolderCard folder={item} onFolderClick={handleFolderClick} />
        ) : (
          <FileGridCard
            item={item as FullOraculoFile}
            onFileSelect={onItemSelect}
          />
        )}
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#010d26] text-white border-gray-700">
        {!("parentId" in item) && (
          <ContextMenuItem
            onSelect={() => onItemSelect(item as FullOraculoFile)}
          >
            Ver Detalhes
          </ContextMenuItem>
        )}
        <ContextMenuItem disabled={!canMutate} onSelect={() => onRename(item)}>
          <Pencil className="h-4 w-4 mr-2" /> Renomear
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-gray-700" />
        <ContextMenuItem
          disabled={!canMutate}
          onSelect={() => onDelete(item)}
          className="text-red-500 focus:bg-red-500/10 focus:text-red-400"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Deletar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  const renderListRow = (item: DraggableItem) => (
    <ContextMenu key={item.id}>
      <ContextMenuTrigger className="w-full h-full rounded-lg focus:outline-none">
        {/* CORREÇÃO: Removida a prop 'isDragging', pois o componente filho não a utiliza. */}
        <FileListRow
          item={item}
          onFolderClick={handleFolderClick}
          onFileSelect={onItemSelect}
        />
      </ContextMenuTrigger>
      <ContextMenuContent className="bg-[#010d26] text-white border-gray-700">
        {!("parentId" in item) && (
          <ContextMenuItem
            onSelect={() => onItemSelect(item as FullOraculoFile)}
          >
            Ver Detalhes
          </ContextMenuItem>
        )}
        <ContextMenuItem disabled={!canMutate} onSelect={() => onRename(item)}>
          <Pencil className="h-4 w-4 mr-2" /> Renomear
        </ContextMenuItem>
        <ContextMenuSeparator className="bg-gray-700" />
        <ContextMenuItem
          disabled={!canMutate}
          onSelect={() => onDelete(item)}
          className="text-red-500 focus:bg-red-500/10 focus:text-red-400"
        >
          <Trash2 className="h-4 w-4 mr-2" /> Deletar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-full">
        <div className="relative z-10 flex-shrink-0">
          <div className="flex items-center gap-1 text-sm text-gray-400 mb-4 flex-wrap">
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id || "root"}>
                <DroppableBreadcrumb
                  crumb={crumb}
                  onClick={() => handleBreadcrumbClick(crumb.id, index)}
                  disabled={index === breadcrumbs.length - 1}
                />
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight className="h-4 w-4 flex-shrink-0" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex-grow min-h-0">
          <ContextMenu>
            <ContextMenuTrigger className="w-full h-full">
              {/* CORREÇÃO: Usando o nome correto do componente: DroppableArea */}
              <DroppableArea id={currentFolderId} className="h-full rounded-lg">
                {paginatedItems.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-gray-500 bg-[#010d26] rounded-lg p-8 h-full">
                    <Folder size={48} />
                    <p className="mt-4 font-semibold">Esta pasta está vazia</p>
                    <p className="text-sm text-gray-600">
                      Clique com o botão direito para criar um item.
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-1">
                    {paginatedItems.map(renderItem)}
                  </div>
                ) : (
                  <div className="space-y-1 p-1">
                    {paginatedItems.map(renderListRow)}
                  </div>
                )}
              </DroppableArea>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-[#010d26] text-white border-gray-700">
              <ContextMenuItem onSelect={onCreateFolder}>
                <FolderPlus className="h-4 w-4 mr-2" /> Nova Pasta
              </ContextMenuItem>
              <ContextMenuItem onSelect={onUpload}>
                <FileUp className="h-4 w-4 mr-2" /> Enviar Arquivos
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        </div>

        {totalPages > 1 && (
          <div className="flex-shrink-0 pt-4">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeItem ? (
          // CORREÇÃO: Trocado 'w-auto' por 'w-max' para garantir que o overlay
          // tenha a largura do seu conteúdo, evitando problemas de layout.
          <div className="pointer-events-none w-max">
            {viewMode === "grid" ? (
              "parentId" in activeItem ? (
                <FolderCard folder={activeItem} onFolderClick={() => {}} />
              ) : (
                <FileGridCard
                  item={activeItem as FullOraculoFile}
                  onFileSelect={() => {}}
                />
              )
            ) : (
              // CORREÇÃO: Trocado 'w-auto' por 'w-max' aqui também.
              <div className="bg-[#010d26] rounded-md shadow-2xl w-max">
                <FileListRow
                  item={activeItem}
                  onFolderClick={() => {}}
                  onFileSelect={() => {}}
                />
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};
export default FileBrowser;
