/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useMemo, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Calendar, Loader2, Plus, CheckCircle2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getAllValues, upsertMonthlySchedule, getYearlyValueSchedule } from "@/lib/actions/recognitions";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UpsertSchedulePayload {
   month: number;
   year: number;
   valueId: string;
}



const formSchema = z.object({
  year: z.string(),
  // Dicionário: "mês" -> "ID do Valor"
  schedules: z.record(z.string(), z.string().optional()),
});

type CreateScheduleForm = z.infer<typeof formSchema>;

const months = [
  { value: "1", label: "Janeiro" },
  { value: "2", label: "Fevereiro" },
  { value: "3", label: "Março" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Maio" },
  { value: "6", label: "Junho" },
  { value: "7", label: "Julho" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

const CreateScheduleModal = () => {
  const [open, setOpen] = React.useState(false);
  const queryClient = useQueryClient();

  // Gera os anos: [AnoAtual-1, AnoAtual, AnoAtual+1] de forma dinâmica
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return [
      (currentYear - 1).toString(),
      currentYear.toString(),
      (currentYear + 1).toString(),
    ];
  }, []);

  const { data: values } = useQuery({
    queryKey: ["allValues"],
    queryFn: () => getAllValues(),
  });

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      year: new Date().getFullYear().toString(),
      schedules: {},
    },
  });

   const selectedYear = form.watch('year')

  // 2. Busca os agendamentos já existentes para o ano selecionado
  const { data: existingSchedules, isFetching: isLoadingExisting } = useQuery({
    queryKey: ["yearlySchedule", selectedYear],
    queryFn: () => getYearlyValueSchedule(parseInt(selectedYear)),
    enabled: open && !!selectedYear, // Só busca se a modal estiver aberta
  });

  // 3. Efeito para preencher o formulário quando os dados chegarem ou o ano mudar
  useEffect(() => {
    if (existingSchedules) {
      // Transforma o array do banco [ {month: 1, valueId: "..."} ] 
      // no formato do formulário { "1": "valueId" }
      const scheduleMap: Record<string, string> = {};
      existingSchedules.forEach((item: any) => {
        scheduleMap[item.month.toString()] = item.valueId;
      });

      // Reseta o formulário mantendo o ano, mas injetando os schedules novos
      form.reset({
        year: selectedYear,
        schedules: scheduleMap,
      });
    } else if (!isLoadingExisting && open) {
        // Se mudar para um ano sem dados, limpa os campos de meses
        form.setValue("schedules", {});
    }
  }, [existingSchedules, selectedYear, form, open, isLoadingExisting]);

  const { mutateAsync: saveSchedule, isPending } = useMutation({
    mutationFn: upsertMonthlySchedule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["yearlySchedule"] });
    },
  });

async function onSubmit(data: CreateScheduleForm): Promise<void> {
   try {
      const year = parseInt(data.year);
      // Filtra apenas os meses que tiveram um valor selecionado
      const entries = Object.entries(data.schedules).filter(
         ([_, val]) => !!val
      ) as [string, string][];

      if (entries.length === 0) {
         toast.error("Por favor, defina o valor para ao menos um mês.");
         return;
      }

      // Dispara todas as atualizações em paralelo
      await Promise.all(
         entries.map(([month, valueId]) =>
            saveSchedule({
               month: parseInt(month),
               year,
               valueId: valueId,
            } as UpsertSchedulePayload)
         )
      );

      toast.success("Ciclo anual configurado com sucesso!");
      setOpen(false);
      form.reset();
   } catch (error: unknown) {
      const err = error as { message?: string } | undefined;
      toast.error(err?.message ?? "Erro ao salvar configurações.");
   }
}

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#0126fb] hover:bg-[#0126fb]/80 gap-2">
          <Plus size={18} />
          Configurar Ciclo Anual
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-[#010d26] text-white border-gray-800 sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Calendar className="text-[#f5b719]" />
            Planejamento Anual de Cultura
          </DialogTitle>
          <p className="text-gray-400 text-sm">
            Selecione o ano e defina os valores de cultura para os meses desejados.
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 space-y-6 flex-1 overflow-hidden">
              
              {/* Seletor de Ano */}
              <div className="flex items-center gap-4 bg-black/20 p-4 rounded-lg border border-gray-800">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem className="w-full max-w-[180px]">
                      <FormLabel className="text-xs uppercase text-gray-500 font-bold">Ano de Referência</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="bg-[#010d26] border-gray-700 text-white">
                            <SelectValue placeholder="Ano" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-[#010d26] border-gray-700 text-white">
                          {availableYears.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <div className="text-xs text-gray-500 italic">
                  Você está configurando os valores para o ano de {form.watch("year")}.
                </div>
              </div>

              {/* Grid de Meses */}
              <ScrollArea className="h-[400px] pr-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {months.map((m) => {
                    const isSelected = !!form.watch(`schedules.${m.value}`);
                    return (
                      <div 
                        key={m.value} 
                        className={`flex flex-col gap-2 p-3 rounded-lg border transition-all ${
                          isSelected 
                            ? "bg-[#f5b719]/5 border-[#f5b719]/30" 
                            : "bg-white/5 border-white/10"
                        }`}
                      >
                        <div className="flex justify-between items-center px-1">
                          <span className={`text-sm font-bold ${isSelected ? "text-[#f5b719]" : "text-gray-400"}`}>
                            {m.label}
                          </span>
                          {isSelected && <CheckCircle2 size={14} className="text-[#f5b719]" />}
                        </div>
                        
                        <FormField
                          control={form.control}
                          name={`schedules.${m.value}`}
                          render={({ field }) => (
                            <FormItem>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger className="bg-black/40 border-gray-700 text-white h-9 text-xs">
                                    <SelectValue placeholder="Valor da cultura..." />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#010d26] border-gray-700 text-white">
                                  {values?.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                      {v.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>

            {/* Rodapé de Ações */}
            <div className="p-6 bg-black/40 border-t border-gray-800 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {Object.values(form.watch("schedules")).filter(Boolean).length} de 12 meses definidos
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-[#f5b719] text-[#010d26] font-bold hover:bg-[#f5b719]/90 min-w-[180px]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 animate-spin" size={18} />
                      Salvando Ciclo...
                    </>
                  ) : (
                    "Salvar Configurações"
                  )}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateScheduleModal;