/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "../../Global/Custom/CustomInput";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import { GoalItem } from "./GoalItem";
import {
  strategyObjectiveUpdateSchema,
  StrategyObjectiveUpdateType,
} from "@/lib/schemas/strategyUpdateSchema";
import { EstrategyObjectiveWithGoals } from "@/app/(dashboard)/atualizar-estrategia/page";

// --- PROPS ATUALIZADAS ---
interface UpdateData {
  endpoint: "objectives" | "goals";
  id: string;
  [key: string]: any;
}

interface ObjectiveItemProps {
  initialObjective: EstrategyObjectiveWithGoals;
  // A função onUpdate agora é síncrona e não retorna uma Promise
  onUpdate: (data: UpdateData) => void;
  // Nova prop para receber o estado de carregamento
  isUpdating: boolean;
}

const ObjectiveItem = ({
  initialObjective,
  onUpdate,
  isUpdating, // Recebendo a nova prop
}: ObjectiveItemProps) => {
  const form = useForm<StrategyObjectiveUpdateType>({
    resolver: zodResolver(strategyObjectiveUpdateSchema),
    defaultValues: {
      objective: initialObjective.objective,
      description: initialObjective.description,
    },
    mode: "onBlur",
  });

  // --- A FUNÇÃO DEIXA DE SER ASYNC ---
  const handleObjectiveUpdate = async (
    fieldName: keyof StrategyObjectiveUpdateType
  ) => {
    // A lógica de validação do formulário permanece a mesma
    const isValid = await form.trigger(fieldName);
    if (!isValid) return;

    const fieldValue = form.getValues(fieldName);
    if (fieldValue === initialObjective[fieldName]) return;

    // A chamada para a mutação agora é síncrona.
    // Apenas disparamos a ação. O TanStack Query gerencia o resto.
    onUpdate({
      endpoint: "objectives",
      id: initialObjective.id,
      [fieldName]: fieldValue,
    });
  };

  return (
    <AccordionItem
      value={initialObjective.id}
      className="bg-[#010d26] rounded-xl border border-[#0126fb]/30 overflow-hidden"
    >
      <AccordionTrigger className="p-4 hover:no-underline">
        <Form {...form}>
          <CustomInput
            form={form}
            field="objective"
            label="Título do Objetivo"
            labelClassName="text-[#F5B719]/90"
            className="text-white bg-transparent border-none text-lg font-bold p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            onBlur={() => handleObjectiveUpdate("objective")}
            // O input é desabilitado enquanto uma atualização está em andamento
            disabled={isUpdating}
          />
        </Form>
      </AccordionTrigger>
      <AccordionContent className="p-4 pt-0">
        <Form {...form}>
          <CustomTextArea
            form={form}
            field="description"
            label="Descrição do Objetivo"
            className="text-white bg-[#0a1535] mb-4"
            onBlur={() => handleObjectiveUpdate("description")}
            // A textarea também é desabilitada
            disabled={isUpdating}
          />
        </Form>
        <div className="space-y-3">
          <h4 className="font-semibold text-white/90">Metas Associadas</h4>
          {initialObjective.goals.map((goal) => (
            <GoalItem
              key={goal.id}
              initialGoal={goal}
              onUpdate={onUpdate}
              // Passamos o estado de 'loading' também para o componente filho
              isUpdating={isUpdating}
            />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default ObjectiveItem;
