"use client";
// Componentes UI e Tipos
import CustomInput from "../Global/Custom/CustomInput"; // Supondo a existência destes componentes
import CustomTextArea from "../Global/Custom/CustomTextArea";
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
import {
  Form,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { RolesFormValues } from "@/lib/schemas/roleSchema";

interface CreateRoleModalProps{
  isOpen: boolean;
  onClose: () => void;
  form: UseFormReturn<RolesFormValues>;
  onSubmit: (values: RolesFormValues) => void;
  onInvalid?: () => void;
  isLoading: boolean;
}

const CreateRoleModal = ({isOpen, onClose, form, onSubmit, onInvalid, isLoading}: CreateRoleModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent className="max-w-lg w-full bg-[#010d26] border-2 border-[#0126fb] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Criar Novo Cargo
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
              <X className="h-4 w-4" />
            </DialogClose>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit, onInvalid)}
              className="space-y-4 mt-4 w-full"
            >
              <CustomInput form={form} field="name" label="Nome do Cargo" />
              <CustomTextArea
                form={form}
                field="description"
                label="Descrição Detalhada"
                placeholder="Descreva o problema ou a situação..."
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
                  {isLoading ? "Aguarde..." : "Criar Cargo"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default CreateRoleModal;
