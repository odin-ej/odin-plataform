"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Form, FormField } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { User } from "@prisma/client";
import CommandMultiSelect from "../../Global/Custom/CommandMultiSelect";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import axios from "axios";

// Schema de validação para a nova conversa
const newConversationSchema = z.object({
  memberIds: z
    .array(z.string())
    .min(1, "Selecione pelo menos um membro para iniciar a conversa."),
});
type NewConversationForm = z.infer<typeof newConversationSchema>;

interface StartConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[]; // Lista de todos os usuários para o seletor
}

const StartConversationModal = ({
  isOpen,
  onClose,
  allUsers,
}: StartConversationModalProps) => {
  const { user: currentUser } = useAuth();
  const router = useRouter()
  const form = useForm<NewConversationForm>({
    resolver: zodResolver(newConversationSchema),
  });

  const { mutate: createConversation, isPending: isLoading } = useMutation({
    mutationFn: async (data: NewConversationForm) => {
      const response = await axios.post("/api/community/conversations", data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success("Conversa criada com sucesso!");
      router.push(`/comunidade/conversas/${data.id}`)
      form.reset();
      onClose();
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Erro ao criar conversa.");
    },
  });
  useEffect(() => {
    if (isOpen) form.reset({ memberIds: [] });
  }, [isOpen, form]);

  // Filtra o usuário logado da lista de opções para não iniciar uma conversa consigo mesmo
  const userOptions = allUsers
    .filter((u) => u.id !== currentUser?.id)
    .map((u) => ({ value: u.id, label: u.name }));

  const onSubmit = (data: NewConversationForm) => createConversation(data);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#010d26] text-white border-gray-700 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Iniciar Nova Conversa</DialogTitle>
          <DialogDescription>
            Selecione um ou mais membros para criar uma conversa direta ou em
            grupo.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="pt-4">
            <FormField
              control={form.control}
              name="memberIds"
              render={({ field }) => (
                <CommandMultiSelect
                  value={field.value}
                  onChange={field.onChange}
                  label="Para:"
                  placeholder="Buscar membros..."
                  options={userOptions}
                />
              )}
            />
            <DialogFooter className="pt-6">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-[#0126fb] hover:bg-[#0126fb]/90 transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Iniciar Conversa"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default StartConversationModal;
