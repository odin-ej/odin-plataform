"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadCloud, Loader2, MessageCircle } from "lucide-react";
import CustomCard from "@/app/_components/Global/Custom/CustomCard";

const KnowledgeContent = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Nenhum ficheiro selecionado.");
      return;
    }
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/knowledge/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Falha no upload do ficheiro.");
      }

      toast.success("Sucesso!", { description: result.message });
      setFile(null); // Limpa o input após o sucesso
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error("Erro no Upload", { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className="p-4 sm:p-8 text-white">
      <CustomCard
        type="introduction"
        title="Conhecimento da IA"
        icon={MessageCircle}
        description='Faça upload de arquivos de até 20MB para "treinar" a IA'
        value={0}
      />
      <div className="p-6 flex items-center justify-center flex-col">
        <h1 className="text-3xl font-bold text-[#f5b719] mb-4">
          Base de Conhecimento da IA
        </h1>
        <p className="text-gray-300 mb-6">
          Faça o upload de ficheiros (PDF, TXT) para &quot;treinar&quot; a IA. O conteúdo
          destes documentos será usado para fornecer respostas mais precisas
          sobre a empresa.
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
                  ? `Ficheiro selecionado: ${file.name}`
                  : "Selecionar um ficheiro..."}
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
}

export default KnowledgeContent;
