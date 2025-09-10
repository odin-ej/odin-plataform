import React, { useEffect, useState } from "react";
import Image from "next/image";
import {
  File as FileIcon,
  X,
  CheckCircle,
  AlertCircle,
  FileImage,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { UploadableFile } from "../Global/FileUploadZone";
import { Button } from "@/components/ui/button";
import axios from "axios";

// Função para obter o ícone apropriado
const getFileIcon = (fileType: string) => {
  if (fileType.startsWith("image/"))
    return <FileImage className="h-6 w-6 text-gray-400 flex-shrink-0" />;
  if (fileType.includes("pdf"))
    return <FileText className="h-6 w-6 text-red-500 flex-shrink-0" />;
  if (fileType.includes("spreadsheet") || fileType.includes("excel"))
    return <FileSpreadsheet className="h-6 w-6 text-green-500 flex-shrink-0" />;
  if (fileType.includes("word") || fileType.includes("document"))
    return <FileText className="h-6 w-6 text-blue-500 flex-shrink-0" />;
  return <FileIcon className="h-6 w-6 text-gray-400 flex-shrink-0" />;
};

interface FileListItemProps {
  uploadableFile: UploadableFile;
  onRemove: (fileId: string) => void;
}

const FileListItem = ({ uploadableFile, onRemove }: FileListItemProps) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    uploadableFile.file ? URL.createObjectURL(uploadableFile.file) : null
  );

  useEffect(() => {
    // 1. Limpa a URL temporária quando o componente é desmontado
    //    Isso é crucial para evitar vazamento de memória
    return () => {
      if (uploadableFile.file && previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [uploadableFile.file, previewUrl]);

  useEffect(() => {
    // 2. Lógica para buscar a URL assinada
    const fetchSignedUrl = async () => {
      // Se não há um arquivo local, mas há uma URL (key do S3),
      // significa que é um arquivo existente no banco de dados.
      if (!uploadableFile.file && uploadableFile.url) {
        try {
          const res = await axios.get(`/api/s3-get-signed-url`, {
            params: { key: uploadableFile.url },
          });
          setPreviewUrl(res.data.url);
        } catch (err) {
          console.error("Erro ao buscar signed URL", err);
          setPreviewUrl(null); // Define como null em caso de erro
        }
      }
    };

    fetchSignedUrl();
  }, [uploadableFile.url, uploadableFile.file]); 

  return (
    <li className="bg-[#00205e]/50 p-3 rounded-md">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-3 text-gray-300 w-full min-w-0">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={uploadableFile.file.name}
              width={40}
              height={40}
              className="h-10 w-10 rounded-md object-cover flex-shrink-0"
            />
          ) : (
            getFileIcon(uploadableFile.file.type)
          )}
          <div className="flex flex-col truncate max-w-full w-full">
            <span className="truncate font-medium">
              {uploadableFile.file.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 pl-2">
          {uploadableFile.status === "success" && (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          {uploadableFile.status === "error" && (
            <AlertCircle className="h-5 w-5 text-red-500" />
          )}
          <Button
            onClick={() => onRemove(uploadableFile.id)}
            className="p-1 bg-transparent rounded-full hover:bg-red-500/20"
          >
            <X className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
      {uploadableFile.status === "uploading" && (
        <div className="w-full bg-gray-600 rounded-full h-1.5 mt-2">
          <div
            className="bg-[#f5b719] h-1.5 rounded-full"
            style={{ width: `${uploadableFile.progress}%` }}
          />
        </div>
      )}
    </li>
  );
};

// React.memo otimiza a performance, evitando re-renderizações desnecessárias do item
export default React.memo(FileListItem);
