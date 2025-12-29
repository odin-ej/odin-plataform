/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Plus, Award, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  assignRecognitionToUser,
  getAllUsers,
  getYearlyValueSchedule,
} from "@/lib/actions/recognitions";
import CustomInput from "../../Global/Custom/CustomInput";
import DynamicDropzone from "../../Global/Custom/DynamicDropzone";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import CustomSelect from "../../Global/Custom/CustomSelect";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";

interface AssignRecognitionModalProps {
  scheduleId: string;
  authorId: string;
}

const AssignRecognitionSchema = z.object({
  userId: z.string().min(1, "Selecione um membro"),
  date: z.string().min(1, "Selecione a data do reconhecimento"),
  description: z.string().optional(),
  media: z.any().optional(),
  scheduleId: z.string(),
});

const AssignRecognitionModal = ({
  authorId,
}: AssignRecognitionModalProps) => {
   const queryClient = useQueryClient()
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Inicialização do Formulário
  const form = useForm({
   resolver: zodResolver(AssignRecognitionSchema),
    defaultValues: {
      userId: "",
      date: new Date().toISOString().split("T")[0], // Data de hoje como default
      description: "",
      scheduleId: '',
      media: null,
    },
  });

  // Busca todos os membros para o select
  const { data: users } = useQuery({
    queryKey: ["allUsers"],
    queryFn: () => getAllUsers(),
  });

  const {data: schedules} = useQuery({
    queryKey: ['yearlyValueSchedule'],
    queryFn: () => getYearlyValueSchedule(new Date().getFullYear()),
  });

  const scheduleOptions = useMemo(() => {
      return schedules?.map((schedule) => ({
         label: `${schedule.month} - ${schedule.value.name}`,
         value: schedule.id,
      })) || [];
  }, [schedules])


  const onSubmit = async (values: any) => {
    const formData = new FormData();
    formData.append("userId", values.userId);
    formData.append("date", values.date);
    formData.append("description", values.description);
    formData.append("scheduleId", values.scheduleId);
    formData.append("authorId", authorId);
 // O arquivo binário

    setLoading(true);
    try {
      let mediaUrl = "";
          if (values.media) {
      setUploadProgress(30);
      const uploadFormData = new FormData();
      uploadFormData.append("file", values.media);

      const uploadRes = await fetch("/api/recognitions/upload", {
        method: "POST",
        body: uploadFormData,
      });

      if (!uploadRes.ok) throw new Error("Falha no upload da imagem");
      
      const uploadData = await uploadRes.json();
      mediaUrl = uploadData.url;
      formData.append("mediaUrl", mediaUrl);
      setUploadProgress(70);
    };
      await assignRecognitionToUser(formData);
      queryClient.invalidateQueries({ queryKey: ["yearlySchedule", new Date().getFullYear()] });
      toast.success("Casinha atribuída!");
      setIsOpen(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      toast.error("Erro no servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#f5b719] hover:bg-[#d49d15] text-black font-bold gap-2 rounded-full transition-all hover:scale-105 shadow-[0_0_15px_rgba(245,183,25,0.3)]">
          <Plus size={18} />
          <span>Atribuir Casinha</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="bg-[#010d26] border-[#0126fb]/30 text-white sm:max-w-[450px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-black italic uppercase tracking-tighter">
            <Award className="text-[#f5b719]" />
            Atribuir Casinha
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            Preencha os detalhes do reconhecimento para este ciclo.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5 py-4"
          >
            {/* Seleção de Membro */}
            <CustomSelect
               control={form.control}
               name="userId"
               label="Membro"
               placeholder="Selecione o membro que receberá a casinha"
               options={users?.map((user) => ({
                 label: user.name,
                   value: user.id,
               })) || []}
            />

            <div className="grid grid-cols-1 gap-4">
              {/* Data do Reconhecimento */}
              <CustomInput
                control={form.control}
                field="date"
                mask='date'
                label="Data do Momento"
                type="text"
                className="bg-black/40 border-white/10 h-11"
              />
            </div>
            <CustomSelect
               control={form.control}
               name='scheduleId'
               label='Valor do Mês'
               placeholder='Selecione o valor do mês'
               options={scheduleOptions}
            />

            {/* Descrição */}
            <CustomTextArea
               control={form.control}
               field="description"
               label="Descrição / Motivo (Opcional)"
               placeholder="Por que este membro está recebendo a casinha?"
               className="bg-black/40 border-white/10 text-white min-h-[80px] focus:border-[#0126fb]/50"

            />

            {/* Foto do Momento (DynamicDropzone) */}
            <DynamicDropzone
              control={form.control}
              name="media"
              label="Foto do Momento (Opcional)"
              page="recognitions"
              progress={uploadProgress}
              onFileAccepted={() => {}}
              onFileSelect={(file) => form.setValue("media", file)}
            />

            <DialogFooter className="pt-4">
              <Button
                type="submit"
                className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80 text-white font-black uppercase italic h-12 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar Casinha
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

// Sub-componente auxiliar para o ícone de check no botão
const CheckCircle = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={3}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default AssignRecognitionModal;
