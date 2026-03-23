"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { FullDirectConversation } from "./DirectConversationContent";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { updateConversationTitle } from "@/lib/actions/community";
import CustomInput from "../../Global/Custom/CustomInput";


const detailsSchema = z.object({
  title: z.string().min(3, "O título deve ter pelo menos 3 caracteres.").max(50),
});
type DetailsForm = z.infer<typeof detailsSchema>;

interface ConversationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: FullDirectConversation;
}

const ConversationDetailsModal = ({ isOpen, onClose, conversation }: ConversationDetailsModalProps) => {
  const queryClient = useQueryClient();
  const form = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: conversation.title || "" },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({ title: conversation.title || "" });
    }
  }, [isOpen, conversation, form]);

  const { mutate: updateTitle, isPending } = useMutation({
      mutationFn: async (data: DetailsForm) => 
          await updateConversationTitle({conversationId: conversation.id, title: data.title}),
      onSuccess: () => {
          toast.success("Título do grupo atualizado!");
          queryClient.invalidateQueries({ queryKey: ['conversation', conversation.id] });
          onClose();
      },
      onError: () => toast.error("Falha ao atualizar o título.")
  });

  const isGroupChat = conversation.participants.length > 2;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#010d26] text-white border-gray-700 max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Informações da Conversa</DialogTitle>
        </DialogHeader>

        <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
          {/* Formulário para editar o título (apenas para grupos) */}
          {isGroupChat && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => updateTitle(data))} className="space-y-4 mb-6 pb-6 border-b border-gray-700 flex gap-2 items-center">
                <CustomInput
                  field="title"
                  label="Título do Grupo"
                  form={form}
                  placeholder="Digite o título do grupo"
                /> 
                  <Button className='bg-[#0126fb] hover:bg-[#0126fb]/90' type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     Salvar Título
                  </Button>
              </form>
            </Form>
          )}

          {/* Lista de Participantes */}
          <div>
            <h3 className="text-sm font-semibold uppercase text-gray-400 mb-2">
              Membros ({conversation.participants.length})
            </h3>
            <div className="space-y-3">
              {conversation.participants.map(participant => (
                <div key={participant.id} className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={participant.imageUrl} />
                    <AvatarFallback>{participant.name.substring(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-white">{participant.name} {participant.id === conversation.createdById && (<span>(Criador)</span>)}</p>
                    <p className="text-xs text-gray-400">{participant.isExMember ? 'Ex-Membro' : participant.currentRole?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
export default ConversationDetailsModal;