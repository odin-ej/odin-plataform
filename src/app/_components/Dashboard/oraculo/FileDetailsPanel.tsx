import { FullOraculoFile } from "@/app/(dashboard)/oraculo/page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  X,
  Download,
  Star,
  Trash2,
  FileIcon,
  Loader2,
  Link
} from "lucide-react";
import Image from "next/image";


const getSignedUrl = async (key: string) => {
  const { data } = await axios.post("/api/oraculo/get-signed-url", { key });
  return data.url;
};

const FileDetailsPanel = ({
  file,
  breadcrumbs,
  onClose,
  onFavorite,
  onDelete,
}: {
  file: FullOraculoFile;
  breadcrumbs: { id: string | null; name: string }[];
  onClose: () => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}) => {
  const path = breadcrumbs.map((c) => c.name).join(" / ");
  const isFromDrive = !!file.googleDriveFileId;

  const { data: downloadUrl, isLoading: isLoadingUrl } = useQuery({
    queryKey: ["downloadUrl", file.id],
    queryFn: () => getSignedUrl(file.key),
    staleTime: 300000,
  });

  return (
    <div className="p-4 bg-[#010d26]/50 rounded-lg border border-gray-800 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-3">
        <h3 className="font-semibold text-white">Detalhes do Arquivo</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-white/10"
        >
          <X className="h-4 w-4 text-white" />
        </Button>
      </div>

      <div className="flex-grow space-y-4">
        <div className="flex items-center justify-center h-32 bg-black/20 rounded-md mb-3 overflow-hidden">
          {file.fileType?.startsWith("image/") && downloadUrl ? (
            <Image
              src={downloadUrl}
              alt={file.name}
              width={128}
              height={128}
              className="max-h-32 w-auto object-contain"
            />
          ) : (
            <FileIcon className="h-24 w-24 text-[#f5b719]" />
          )}
        </div>

        {isFromDrive && (
          <Badge
            variant="secondary"
            className="bg-[#0F9D58]/20 text-[#0F9D58] border border-[#0F9D58]/30"
          >
            <Link className="h-3 w-3 mr-1.5 text-white" /> Sincronizado com Google Drive
          </Badge>
        )}

        <div>
          <p className="text-xs text-gray-400">Caminho:</p>
          <p className="text-sm text-gray-300 truncate">{path}</p>
        </div>

        <div>
          <p className="text-xs text-gray-400">Nome:</p>
          <p className="text-sm font-medium text-white break-words">
            {file.name}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Criado por:</p>
          <div className="flex items-center">
            <Avatar className="inline-block h-6 w-6 mr-2">
              <AvatarImage
                src={file.owner?.imageUrl }
                alt={file.owner?.name || "User Avatar"}
                width={24}
                height={24}
                className="h-6 w-6 rounded-full"
              />
              <AvatarFallback className="bg-[#0126fb] text-xs">
                {file.owner?.name?.substring(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-white">
              {file.owner?.name || "Admin"}
            </span>
          </div>
        </div>
        <div>
          {file.restrictedToAreas &&
            file.restrictedToAreas.length > 0 && (
              <>
                <p className="text-xs text-gray-400">Áreas Restritas:</p>
                {file.restrictedToAreas.map((area) => (
                  <Badge
                    key={area}
                    className="mr-1 mb-1 bg-[#0126fb] text-white"
                  >
                    {area}
                  </Badge>
                ))}
              </>
            )}
        </div>
      </div>

    
      <div className="flex gap-2 mt-4">
        <Button
          variant="ghost"
          size="icon"
          className="hover:!bg-[#f5b719]/10"
          onClick={() => onFavorite(file.id)}
        >
          <Star className="h-4 w-4 text-[#f5b719]" fill={file.isFavorite ? "#f5b719" : "none"} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hover:!bg-red-500/10"
          disabled={isFromDrive}
          onClick={() => onDelete(file.id)}
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
        <a
          href={downloadUrl || "#"}
          download={file.name}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-grow"
        >
          <Button
            className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80"
            disabled={isLoadingUrl}
          >
            {isLoadingUrl ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}{" "}
            Baixar
          </Button>
        </a>
      </div>
    </div>
  );
};
export default FileDetailsPanel;
