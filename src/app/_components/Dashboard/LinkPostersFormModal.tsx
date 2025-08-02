"use client";
// Componentes UI e Tipos
import CustomInput from "../Global/Custom/CustomInput"; // Supondo a existência destes componentes
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";

import { handleFileAccepted } from "@/lib/utils";
import { LinkPostersValues } from "@/lib/schemas/linkPostersSchema";
import CustomSelect from "../Global/Custom/CustomSelect";
import DynamicDropzone from "../Global/Custom/DynamicDropzone";
import { useState } from "react";
import CustomCheckboxGroup from "../Global/Custom/CustomCheckboxGroup";

interface LinksPostersFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: UseFormReturn<LinkPostersValues>;
  onSubmit: (data: LinkPostersValues) => void;
  isLoading: boolean;
}

const LinkPostersFormModal = ({
  isOpen,
  onClose,
  form,
  onSubmit,
  isLoading,
}: LinksPostersFormModalProps) => {
  const [uploadProgress, setUploadProgress] = useState(0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent className="max-w-lg w-full bg-[#010d26] border-2 border-[#0126fb] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Criar Novo Link Poster
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4 mt-4 w-full"
            >
              <CustomInput
                form={form}
                field="title"
                label="Título do Link Poster"
              />
              <CustomInput
                form={form}
                field="link"
                label="Link de Redirecionamento"
                placeholder="https://..."
              />

              <CustomSelect
                control={form.control}
                name="isActive"
                label="Poster Ativo?"
                placeholder="Selecione o estado"
                options={[
                  { value: "Sim", label: "Sim" },
                  { value: "Não", label: "Não" },
                ]}
              />

              <CustomCheckboxGroup
                control={form.control}
                name="areas"
                label="Áreas do link poster"
                options={[
                  { value: "GERAL", label: "Geral" },
                  { value: "HOME", label: "Pagina Inicial" },
                  { value: "YGGDRASIL", label: "Pagina Yggdrasil" },
                  { value: "MEMBROS", label: "Membros" },
                  { value: "EXMEMRBOS", label: "Ex-Membros" },
                  { value: "CONSULTORIA", label: "Consultoria" },
                  { value: "TATICOS", label: "Táticos" },
                  { value: "DIRETORIA", label: "Diretoria" },
                ]}
              />

              <DynamicDropzone
                control={form.control}
                name="image"
                label="Imagem do Link Poster"
                progress={uploadProgress}
                onFileAccepted={() => {
                  handleFileAccepted(setUploadProgress);
                }}
                defaultImageUrl=""
                page="link-posters"
              />

              <DialogFooter className="pt-4">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-[#0126fb] hover:bg-[#0126fb]/80"
                >
                  {isLoading ? "Aguarde..." : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default LinkPostersFormModal;
