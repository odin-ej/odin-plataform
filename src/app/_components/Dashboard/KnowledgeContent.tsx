/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, Loader2, MessageCircle } from "lucide-react";
import CustomCard from "@/app/_components/Global/Custom/CustomCard";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const KnowledgeContent = () => {
  const [file, setFile] = useState<File | null>(null);

  const { mutate: uploadFile, isPending: isLoading } = useMutation({
    mutationFn: async (fileToUpload: File) => {
      // --- ETAPA 1: Obter a URL pré-assinada ---
      const presignedUrlRes = await axios.post(
        `${API_URL}/api/knowledge/s3-upload`,
        {
          fileType: fileToUpload.type,
          fileSize: fileToUpload.size,
        }
      );

      const { url, key } = presignedUrlRes.data;

      // --- ETAPA 2: Fazer o upload do arquivo diretamente para o S3 ---
      await axios.put(url, fileToUpload, {
        headers: { "Content-Type": fileToUpload.type },
      });

      // --- ETAPA 3: Enviar a chave do arquivo para processamento no backend ---
      const { data } = await axios.post(`${API_URL}/api/knowledge/upload`, {
        s3Key: key,
        fileName: fileToUpload.name,
      });

      return data;
    },
    onSuccess: (data) => {
      toast.success("Sucesso!", { description: data.message });
      setFile(null);
    },
    onError: (error: any) => {
      const errorMessage =
        error.response?.data?.message || "Falha no upload do arquivo.";
      toast.error("Erro no Upload", { description: errorMessage });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  // O handler de upload agora é muito mais simples
  const handleUpload = () => {
    if (!file) {
      toast.error("Nenhum arquivo selecionado.");
      return;
    }
    // Apenas chama a função 'mutate' do TanStack Query
    uploadFile(file);
  };
  return (
    <div className="p-4 sm:p-8 text-white">
      <CustomCard
        type="introduction"
        title="Conhecimento da IA"
        icon={MessageCircle}
        description='Faça upload de arquivos (pdf, txt, jpeg, jpg, png) de até 200MB para "treinar" a IA'
        value={0}
      />
      <div className="p-6 flex items-center justify-center flex-col">
        <h1 className="text-3xl font-bold text-[#f5b719] mb-4">
          Base de Conhecimento da IA
        </h1>
        <p className="text-gray-300 mb-6">
          Faça o upload de arquivos (PDF, TXT) para &quot;treinar&quot; a IA. O
          conteúdo destes documentos será usado para fornecer respostas mais
          precisas sobre a empresa.
        </p>

        <div className="max-w-xl p-6 bg-[#010d26] rounded-lg border border-gray-700 space-y-4">
          <div className="flex items-center gap-4">
            <UploadCloud className="h-8 w-8 text-[#0126fb]" />
            <div>
              <label
                htmlFor="knowledge-file"
                className="font-semibold cursor-pointer hover:underline"
              >
                {file
                  ? `Arquivo selecionado: ${file.name}`
                  : "Selecionar um arquivo..."}
              </label>
              <Input
                id="knowledge-file"
                type="file"
                className="hidden"
                onChange={handleFileChange}
                accept=".pdf,.txt"
              />
            </div>
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || isLoading}
            className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar para a Base de Conhecimento"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KnowledgeContent;
