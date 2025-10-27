// SignedUrlDropzoneArea.tsx
"use client";
import { getCommunityFileSignedUrl } from "@/lib/actions/community"; // Confirme o caminho
import { cn } from "@/lib/utils";
import { UploadCloud, LoaderCircle, Image as ImageIconPlaceholder } from "lucide-react";
import Image from "next/image";
import React, { useMemo } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery } from "@tanstack/react-query";

interface SignedUrlDropzoneAreaProps {
  onChange: (file: File | null) => void;
  onFileAccepted: () => void;
  value: File | string | undefined | null; // Pode ser File (novo) ou string (chave S3)
  progress: number;
  error?: boolean;
  page?: string; // Usado para habilitar/desabilitar useQuery condicionalmente
  disabled?: boolean;
}

const SignedUrlDropzoneArea = React.forwardRef<HTMLDivElement, SignedUrlDropzoneAreaProps>(
  ({ onChange, onFileAccepted, value, progress, error, page, disabled }, ref) => {

    const s3Key = typeof value === 'string' ? value : undefined; // Chave S3 é o 'value' se for string

    // --- Fetch Signed URL com React Query ---
    const {
      data: signedUrl,
      isLoading: isLoadingUrl,
      isError: isUrlError,
    } = useQuery({
      queryKey: ["signedUrlDropzone", s3Key, page], // Chave de query específica
      queryFn: () => {
        if (!s3Key) return Promise.resolve(null);
        // *** IMPORTANTE: Garanta que esta action exista e funcione ***
        return getCommunityFileSignedUrl(s3Key);
      },
      // Habilita SOMENTE se houver uma chave S3 E a página indicar (ex: comunidade)
      enabled: !!s3Key && page === 'community/channels',
      staleTime: 1000 * 60 * 4, // 4 minutos
      refetchOnWindowFocus: false,
      retry: 1,
    });

    // --- Dropzone Hook ---
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop: (acceptedFiles) => {
        if (acceptedFiles && acceptedFiles.length > 0 && !disabled) {
          onChange(acceptedFiles[0]);
          onFileAccepted();
        }
      },
      accept: { "image/jpeg": [], "image/png": [], "image/webp": [] },
      multiple: false,
      disabled: disabled || (progress > 0 && progress < 100),
    });

    // --- Lógica de Preview ---
    const localPreviewUrl = useMemo(() => {
        if (typeof window !== 'undefined' && value instanceof File) {
            return URL.createObjectURL(value);
        }
        return null;
    }, [value]);

    // Prioriza preview local, depois signedUrl (se aplicável e carregada)
    const displayUrl = localPreviewUrl || (page === 'community/channels' && !isLoadingUrl && !isUrlError ? signedUrl : null);

    React.useEffect(() => {
        return () => { if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl); };
    }, [localPreviewUrl]);


    // --- Renderização ---
    const renderContent = () => {
      if (progress > 0 && progress < 100) { /* ... Estado de Upload ... */
        return (
          <div className="flex flex-col items-center justify-center text-center w-full text-white">
            <LoaderCircle className="w-8 h-8 text-[#f5b719] animate-spin mb-2" />
            <p className="text-sm">Enviando...</p>
            <div className="w-4/5 bg-gray-600 rounded-full h-2.5 mt-2"><div className="bg-[#f5b719] h-2.5 rounded-full" style={{ width: `${progress}%` }} /></div>
          </div>
        );
      }
      if (displayUrl) { /* ... Estado com Imagem ... */
        return (
          <div className="flex items-center space-x-4 text-white w-full px-2">
            <Image width={100} height={page === 'link-posters' ? 50 : 100} src={displayUrl} alt="Pré-visualização" className={cn("rounded-md object-cover flex-shrink-0", page === 'link-posters' ? 'w-20 h-10' : 'h-20 w-20')} onError={(e) => { console.error("Erro ao carregar imagem:", displayUrl, e); }}/>
            <span className="text-sm text-gray-300 flex-grow text-left"><span className={cn(!disabled && 'font-semibold text-[#f5b719] underline')}>{disabled ? 'Imagem atual' : 'Clique ou arraste'}</span>{' '}{!disabled && 'para alterar'}</span>
          </div>
        );
      }
      if (page === 'community/channels' && isLoadingUrl && s3Key) { /* ... Estado Carregando URL ... */
        return ( <div className="flex flex-col items-center justify-center text-center w-full text-white"><LoaderCircle className="w-8 h-8 text-gray-400 animate-spin mb-2" /><p className="text-sm text-gray-400">Carregando imagem...</p></div> );
      }
      if (page === 'community/channels' && isUrlError && s3Key) { /* ... Estado Erro URL ... */
        return ( <div className="flex flex-col items-center justify-center text-center w-full text-red-400"><ImageIconPlaceholder className="w-8 h-8 mb-2" /><p className="text-sm">Falha ao carregar imagem</p></div> );
      }
      // Estado Padrão Vazio
      return ( <span className="flex items-center space-x-2 text-white text-center"><UploadCloud className="w-6 h-6" /><span className="font-medium">Arraste e solte ou{' '}<span className="text-[#f5b719] underline">procure a imagem</span></span></span> );
    };

    return (
      <div {...getRootProps({ ref })} className={cn(`flex justify-center items-center w-full h-32 px-4 transition-colors bg-transparent border-2 border-dashed rounded-lg appearance-none focus:outline-none`, error ? "border-red-500" : "border-gray-600/50", !disabled && "cursor-pointer hover:border-[#0126fb]", isDragActive && !disabled && "border-[#0126fb] bg-blue-900/10", disabled && "cursor-not-allowed opacity-60")}>
        <input {...getInputProps()} disabled={disabled} />
        {renderContent()}
      </div>
    );
  }
);
SignedUrlDropzoneArea.displayName = "SignedUrlDropzoneArea";
export default SignedUrlDropzoneArea;