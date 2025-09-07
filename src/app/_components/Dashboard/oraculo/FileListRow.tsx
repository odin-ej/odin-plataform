"use client";
import {
  File as FileIcon,
  Folder,
  GripVertical,
  Link,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import { format } from "date-fns";
import {
  FullOraculoFile,
  FullOraculoFolder,
} from "@/app/(dashboard)/oraculo/page";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
// CORREÇÃO: Importado o useDroppable
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const getSignedUrl = async (key: string): Promise<string> => {
  const { data } = await axios.post(`${API_URL}/api/oraculo/get-signed-url`, { key });
  return data.url;
};

const ItemIcon = ({ item }: { item: FullOraculoFile | FullOraculoFolder }) => {
  const isFolder = "parentId" in item;
  const file = item as FullOraculoFile;
  const isImage = file.fileType?.startsWith("image/");

  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ["file-preview", file.id],
    queryFn: () => getSignedUrl(file.key),
    enabled: isImage,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isFolder) {
    return <Folder className="h-6 w-6 text-[#0126fb] flex-shrink-0" />;
  }

  if (isImage) {
    if (isLoading) return <div className="h-8 w-8 flex items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-gray-500" /></div>;
    if (signedUrl) return <Image src={signedUrl} alt={file.name} width={32} height={32} className="h-8 w-8 rounded-md object-cover" />;
  }

  return <FileIcon className="h-6 w-6 text-gray-500 flex-shrink-0" />;
};

const FileListRow = ({
  item,
  onFileSelect,
  onFolderClick,
}: {
  item: FullOraculoFile | FullOraculoFolder;
  onFileSelect: (file: FullOraculoFile) => void;
  onFolderClick: (folder: FullOraculoFolder) => void;
}) => {
  const isFolder = "parentId" in item;
  const isFromDrive = !isFolder ? !!item.googleDriveFileId : !!item.googleDriveFolderId;

  // Hook para tornar o item arrastável (draggable)
  const { attributes, listeners, setNodeRef: setDraggableNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  // CORREÇÃO: Hook para tornar a linha uma área de "soltura" (droppable) APENAS SE FOR UMA PASTA.
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: item.id,
    disabled: !isFolder, // Desabilitado se não for uma pasta
  });

  const handleClick = () => {
    if (isFolder) {
      onFolderClick(item as FullOraculoFolder);
    } else {
      onFileSelect(item as FullOraculoFile);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          {/* CORREÇÃO: A ref do droppable é aplicada no container principal */}
          <div
            ref={setDroppableNodeRef}
            className={cn(
              "flex items-center p-2 rounded-md transition-colors group",
              isDragging && "opacity-40 bg-gray-700",
              // CORREÇÃO: Adiciona feedback visual quando um item é arrastado sobre uma pasta
              isOver && isFolder && "bg-blue-500/20 ring-2 ring-blue-500"
            )}
          >
            {/* 1. Alça de Arrastar (Drag Handle) */}
            {!isFromDrive && (
              <div
                ref={setDraggableNodeRef} // A ref do draggable fica apenas na alça
                {...listeners}
                {...attributes}
                className="p-2 cursor-grab text-gray-600 group-hover:text-white transition-colors"
              >
                <GripVertical className="h-5 w-5" />
              </div>
            )}

            {/* 2. Conteúdo Clicável */}
            <div
              onClick={handleClick}
              className="grid grid-cols-12 gap-4 items-center flex-grow cursor-pointer"
            >
              <div className="col-span-6 flex items-center gap-3">
                <ItemIcon item={item} />
                <span className="font-medium text-md truncate text-white">
                  {item.name}
                </span>
                {isFromDrive && (
                  <Tooltip>
                    <TooltipTrigger>
                      <Link className="h-3.5 w-3.5 text-blue-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Sincronizado com Google Drive</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
              <div className="col-span-3 text-sm text-gray-400 truncate hidden md:block">
                {item.owner?.name || "Admin"}
              </div>
              <div className="col-span-3 text-sm text-gray-400 text-right hidden sm:block">
                {format(new Date(item.createdAt), "dd/MM/yyyy")}
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-[#0126fb] text-white max-w-xs">
          <p>{item.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FileListRow;