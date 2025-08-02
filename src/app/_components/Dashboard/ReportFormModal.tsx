"use client";
import { toast } from "sonner";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { ReportFormValues } from "@/lib/schemas/reportSchema";
import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: UseFormReturn<ReportFormValues>;
  onSubmit: (data: ReportFormValues) => void;
  // Dados para popular os selects
  users: { value: string; label: string }[];
  isLoading: boolean;
}

const ReportFormModal = ({
  isOpen,
  onClose,
  form,
  onSubmit,
  users,
  isLoading,
}: ReportModalProps) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onInvalid = (errors: any) => {
    console.error("Erros de validação do formulário:", errors);
    toast.error("Formulário Inválido", {
      description: "Por favor, preencha todos os campos obrigatórios.",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent className="max-w-lg w-full bg-[#010d26] border-2 border-[#0126fb] text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Criar Novo Report
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
              <CustomInput form={form} field="title" label="Título do Report" />
              <CustomTextArea
                form={form}
                field="content"
                label="Descrição Detalhada"
                placeholder="Descreva o problema ou a situação..."
              />

              <FormField
                control={form.control}
                name={"recipientUserId"}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Destinatário:</FormLabel>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between bg-transparent hover:bg-gray-700 text-white",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? users.find((user) => user.value === field.value)
                                  ?.label
                              : "Selecione um membro..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] border-2 border-[#0126fb] bg-[#00205e] text-white">
                        <Command className="bg-[#00205e] w-full scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent ">
                          <CommandInput
                            className="bg-transparent text-white"
                            placeholder="Procurar membro..."
                          />
                          <CommandList>
                            <CommandEmpty>
                              Nenhuma resultado encontrado.
                            </CommandEmpty>
                            <CommandGroup>
                              {users.map((user) => (
                                <CommandItem
                                  className="cursor-pointer bg-transparent px-4 py-3 text-white/80 transition-colors duration-200 data-[selected=true]:bg-[#0126fb] data-[selected=true]:text-white hover:!bg-white/10 hover:!text-[#f5b719]"
                                  value={user.value}
                                  key={user.value}
                                  onSelect={() => {
                                    form.setValue(
                                      "recipientUserId",
                                      user.value
                                    );
                                    setPopoverOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      user.value === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {user.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
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
                  {isLoading ? "Aguarde..." : "Criar Report"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default ReportFormModal;
