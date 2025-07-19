"use client";
import { toast } from "sonner";
// Componentes UI e Tipos
import CustomInput from "../Global/Custom/CustomInput"; // Supondo a existência destes componentes
import CustomTextArea from "../Global/Custom/CustomTextArea";
import CustomSelect from "../Global/Custom/CustomSelect";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose, DialogFooter, DialogPortal, DialogOverlay } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ReportFormValues } from "@/lib/schemas/reportSchema";
import { UseFormReturn } from "react-hook-form";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: UseFormReturn<ReportFormValues>;
  onSubmit: (data: ReportFormValues) => void;
  // Dados para popular os selects
  users: { value: string; label: string }[];
  isLoading: boolean
}

const ReportFormModal = ({ isOpen, onClose, form, onSubmit, users, isLoading }: ReportModalProps) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onInvalid = (errors: any) => {
        console.error("Erros de validação do formulário:", errors);
        toast.error("Formulário Inválido", {
            description: "Por favor, preencha todos os campos obrigatórios."
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
           <DialogPortal>
             <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
             <DialogContent className="max-w-lg w-full bg-[#010d26] border-2 border-[#0126fb] text-white">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">Criar Novo Report</DialogTitle>
                     <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 transition-opacity hover:opacity-100">
                        <X className="h-4 w-4" />
                    </DialogClose>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4 mt-4 w-full">
                        <CustomInput form={form} field="title" label="Título do Report" />
                        <CustomTextArea form={form} field="content" label="Descrição Detalhada" placeholder="Descreva o problema ou a situação..." />
                        
                        <CustomSelect
                            control={form.control}
                            name="recipientUserId"
                            label="Destinatário"
                            placeholder="Selecione um membro..."
                            options={users}
                        />
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
                            <Button type="submit" className="bg-[#0126fb] hover:bg-[#0126fb]/80">{isLoading ? "Aguarde..." : "Criar Report"}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
           </DialogPortal>
        </Dialog>
    )
}

export default ReportFormModal