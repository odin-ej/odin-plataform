// /components/Dashboard/comunidade/RenderAttachment.tsx
"use client";

import { getCommunityFileSignedUrl } from "@/lib/actions/community";
import { FileAttachment } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  File as FileIcon,
  Loader2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";

interface RenderAttachmentProps {
  attachment: Partial<FileAttachment> & {
    id: string; // Garantir que o ID está presente para a query
    url: string;
    fileName: string;
    fileType: string;
  };
}

const RenderAttachment = ({ attachment }: RenderAttachmentProps) => {
  // Busca a URL assinada para o arquivo no S3. A URL é temporária.
  const {
    data: signedUrl,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["attachmentUrl", attachment.id],
    queryFn: () => getCommunityFileSignedUrl(attachment.url), // attachment.url é a chave do S3
    staleTime: 1000 * 60 * 5, // Cache de 5 minutos para a URL
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400 p-2 rounded-md bg-black/20">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Carregando anexo...</span>
      </div>
    );
  }

  if (isError || !signedUrl) {
    return (
      <div className="text-sm text-red-400 p-2 rounded-md bg-red-900/30">
        Falha ao carregar o arquivo: {attachment.fileName}
      </div>
    );
  }

  // Se for uma imagem, exibe a imagem
  if (attachment.fileType.startsWith("image/")) {
    return (
      <Link
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block"
      >
        <Image
          src={signedUrl}
          alt={`Anexo ${attachment.fileName}`}
          width={300}
          height={200}
          className="rounded-md object-cover max-w-full h-auto cursor-pointer"
          unoptimized={true}
        />
      </Link>
    );
  }

  // Se for outro tipo de arquivo, exibe um link para download
  return (
    <a
      href={signedUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={attachment.fileName}
      className="mt-2 flex items-center gap-3 p-2 bg-gray-800/50 rounded-lg hover:bg-gray-800/80 transition-colors"
    >
      <FileIcon className="h-8 w-8 text-gray-400 flex-shrink-0" />
      <div className="flex-grow overflow-hidden">
        <p className="text-sm font-medium text-white truncate">
          {attachment.fileName}
        </p>
        <p className="text-xs text-gray-400">{attachment.fileType}</p>
      </div>
      <Download className="h-5 w-5 text-gray-300 flex-shrink-0" />
    </a>
  );
};

export default RenderAttachment;
