"use client";
import { FullOraculoFile } from "@/app/(dashboard)/oraculo/page";
import { File as FileIcon, GripVertical, Link, Loader2 } from "lucide-react";
import Image from "next/image";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useDraggable } from "@dnd-kit/core";
import { checkUserPermission, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMemo } from "react";
import { DIRECTORS_ONLY } from "@/lib/permissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Função para buscar a URL assinada de forma segura
const getSignedUrl = async (key: string): Promise<string> => {
  const { data } = await axios.post(`${API_URL}/api/oraculo/get-signed-url`, {
    key,
  });
  return data.url;
};

const FileGridCard = ({
  item,
  onFileSelect,
}: {
  item: FullOraculoFile;
  onFileSelect: (file: FullOraculoFile) => void;
}) => {
  const {user} = useAuth()
  const isDirector = useMemo(() => checkUserPermission(user, DIRECTORS_ONLY), [user]);
  const isOwner = user?.id === item.ownerId;
  const canDrag = isOwner || isDirector;
  const isImage = item.fileType?.startsWith("image/");
  const isFromDrive = !!item.googleDriveFileId;

  // Hook para buscar a URL de visualização da imagem
  const { data: signedUrl, isLoading } = useQuery({
    queryKey: ["file-preview", item.id],
    queryFn: () => getSignedUrl(item.key),
    enabled: isImage, // Só busca a URL se for uma imagem
    staleTime: 60 * 5 * 1000, // Cache de 5 minutos
    refetchOnWindowFocus: false,
  });

  // Hook do dnd-kit para tornar o item arrastável
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: { item, type: "file" }, // Passa o item completo para a lógica de drop
  });

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "bg-[#00205e]/30 p-3 rounded-lg border border-gray-700 text-center transition-all h-[150px] relative group",
              isDragging && "opacity-40 z-10 shadow-lg shadow-black/50"
            )}
          >
            {/* 1. O card inteiro é a área de clique para SELECIONAR */}
            <div
              onClick={() => onFileSelect(item)}
              className="cursor-pointer flex flex-col items-center justify-center h-full"
            >
              <div className="flex items-center justify-center h-20 rounded-md mb-3 overflow-hidden">
                {isLoading && (
                  <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                )}
                {isImage && signedUrl && (
                  <Image
                    src={signedUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="max-h-20 w-auto object-contain"
                  />
                )}
                {!isImage && !isLoading && (
                  <FileIcon className="h-10 w-10 text-[#f5b719]" />
                )}
              </div>
              <p className="text-sm font-medium truncate w-full text-white">
                {item.name}
              </p>
              <p className="text-xs text-gray-500">
                {new Date(item.createdAt).toLocaleDateString("pt-BR")}
              </p>
            </div>

            {/* 2. A alça para ARRASTAR fica no canto e só aparece no hover */}
          
             {canDrag && (
               <div
              ref={setNodeRef}
              {...listeners}
              {...attributes}
              className="absolute top-1 right-1 p-1.5 cursor-grab text-gray-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full hover:bg-white/10"
            >
              <GripVertical className="h-4 w-4" />
            </div>
             )}

           
            {/* 3. Ícone do Google Drive (se aplicável) */}
            {isFromDrive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="absolute top-2 left-2">
                    <Link className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Sincronizado com Google Drive</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent className="bg-[#0126fb] text-white max-w-xs">
          <p>{item.name}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default FileGridCard;
