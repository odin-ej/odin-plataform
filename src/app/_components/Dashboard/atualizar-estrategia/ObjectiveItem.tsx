"use client";
import { EstrategyObjectiveWithGoals } from "@/app/(dashboard)/atualizar-estrategia/page";
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

interface ObjectiveItemProps {
  initialObjective: EstrategyObjectiveWithGoals;

  onUpdate: (
    endpoint: "objectives" | "goals",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { id: string; [key: string]: any }
  ) => Promise<void>;
}

const ObjectiveItem = ({ initialObjective, onUpdate }: ObjectiveItemProps) => {
  const form = useForm<StrategyObjectiveUpdateType>({
    resolver: zodResolver(strategyObjectiveUpdateSchema),
    defaultValues: {
      objective: initialObjective.objective,
      description: initialObjective.description,
    },
    mode: "onBlur",
  });

  const handleObjectiveUpdate = async (
    fieldName: keyof StrategyObjectiveUpdateType
  ) => {
    const isValid = await form.trigger(fieldName);
    if (!isValid) return;

    const fieldValue = form.getValues(fieldName);
    if (fieldValue === initialObjective[fieldName]) return;

    await onUpdate("objectives", {
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
          />
        </Form>
        <div className="space-y-3">
          <h4 className="font-semibold text-white/90">Metas Associadas</h4>
          {initialObjective.goals.map((goal) => (
            <GoalItem key={goal.id} initialGoal={goal} onUpdate={onUpdate} />
          ))}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

export default ObjectiveItem;
