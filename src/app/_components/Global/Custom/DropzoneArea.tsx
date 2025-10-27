"use client";
import { getCommunityFileSignedUrl } from "@/lib/actions/community";
import { cn } from "@/lib/utils";
import { UploadCloud, LoaderCircle } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";

interface DropzoneAreaProps {
  onChange: (file: File) => void;
  onFileAccepted: () => void;
  value: File | undefined;
  progress: number;
  defaultImageUrl?: string;
  error?: boolean;
  page?: string,
}

const DropzoneArea = React.forwardRef<HTMLDivElement, DropzoneAreaProps>(
  ({ onChange, onFileAccepted, value, progress, defaultImageUrl, error, page }, ref) => {
    const [signedUrl, setSignedUrl] = useState('')
    // O hook é chamado aqui, no nível superior do componente funcional.
    const { getRootProps, getInputProps } = useDropzone({
      onDrop: (acceptedFiles) => {
        if (acceptedFiles && acceptedFiles.length > 0) {
          onChange(acceptedFiles[0]); // Comunica a mudança para o react-hook-form
          onFileAccepted();          // Comunica ao pai para iniciar o progresso
        }
      },
      accept: { "image/jpeg": [], "image/png": [] },
      multiple: false,
    });

    useEffect(() => {
      const fetchSignedUrl = async () => {
        if(page === 'community/channels') {
          if(!defaultImageUrl) return;
          const signedUrlChannel = await getCommunityFileSignedUrl(defaultImageUrl)
          setSignedUrl(signedUrlChannel)
        }
      }
      fetchSignedUrl()
    }, [page, defaultImageUrl])

    const previewUrl = (typeof window !== 'undefined' && value instanceof File) 
        ? URL.createObjectURL(value) 
        : defaultImageUrl;

    return (
      <div
        {...getRootProps({ ref })}
        className={`flex justify-center items-center w-full h-32 px-4 transition-colors bg-transparent border-2 ${
          error ? "border-red-500" : "border-gray-600/50"
        } border-dashed rounded-lg appearance-none cursor-pointer hover:border-[#0126fb] focus:outline-none`}
      >
        <input {...getInputProps()} />
        {progress > 0 && progress < 100 ? (
          <div className="flex flex-col items-center justify-center text-center w-full text-white">
            <LoaderCircle className="w-8 h-8 text-[#f5b719] animate-spin mb-2" />
            <p className="text-sm">Subindo...</p>
            <div className="w-4/5 bg-gray-600 rounded-full h-2.5 mt-2">
              <div className="bg-[#f5b719] h-2.5 rounded-full" style={{ width: `${progress}%` }} />
            </div>
          </div>
        ) : previewUrl ? (
          <div className="flex items-center space-x-4 text-white">
            <Image width={100} height={page === 'link-posters' ? 50 : 100} src={page === 'community/channels' ? signedUrl : previewUrl} alt="Pré-visualização" className={cn("rounded-full object-cover h-20 w-20", page === 'link-posters' && '!w-20 !h-10 !rounded-lg' )}/>
            <span className="text-sm text-gray-300"><span className='font-semibold text-[#f5b719] underline'>Clique ou arraste</span> para alterar</span>
          </div>
        ) : (
          <span className="flex items-center space-x-2 text-white">
            <UploadCloud className="w-6 h-6" />
            <span className="font-medium">Arraste e solte ou <span className="text-[#f5b719] underline">procure</span></span>
          </span>
        )}
      </div>
    );
  }
);
DropzoneArea.displayName = "DropzoneArea";
export default DropzoneArea;