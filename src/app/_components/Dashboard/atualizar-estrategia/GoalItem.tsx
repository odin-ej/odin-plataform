"use client";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "../../Global/Custom/CustomInput";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import { z } from "zod";
import { EstrategyObjectiveWithGoals } from "@/app/(dashboard)/atualizar-estrategia/page";

const goalFormSchema = z.object({
  title: z.string().min(3, "O título é obrigatório."),
  description: z.string().min(10, "A descrição é obrigatória."),
  goal: z.coerce
    .number({ invalid_type_error: "Deve ser um número" })
    .min(0, "A meta deve ser um número positivo."),
  value: z.coerce
    .number({ invalid_type_error: "Deve ser um número" })
    .min(0, "O valor deve ser um número positivo."),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

// --- TIPO CORRETO PARA OS DADOS DA MUTAÇÃO ---
interface UpdateData {
  endpoint: "objectives" | "goals";
  id: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// --- PROPS CORRIGIDAS ---
interface GoalItemProps {
  initialGoal: EstrategyObjectiveWithGoals["goals"][number];
  // onUpdate agora recebe um único objeto e é síncrona
  onUpdate: (data: UpdateData) => void;
  // Nova prop para o estado de carregamento
  isUpdating: boolean;
}

export function GoalItem({ initialGoal, onUpdate, isUpdating }: GoalItemProps) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: initialGoal.title,
      description: initialGoal.description,
      goal: Number(initialGoal.goal),
      value: Number(initialGoal.value),
    },
    mode: "onBlur",
  });

  // --- FUNÇÃO DEIXA DE SER ASYNC ---
  const handleGoalUpdate = async (fieldName: keyof GoalFormValues) => {
    const isValid = await form.trigger(fieldName);
    if (!isValid) return;

    const rawValue = form.getValues(fieldName);
    let finalValue: string | number = rawValue;

    if (fieldName === "goal" || fieldName === "value") {
      finalValue = Number(rawValue);
      if (finalValue === Number(initialGoal[fieldName])) return;
    } else {
      if (finalValue === initialGoal[fieldName]) return;
    }

    // --- CHAMADA CORRIGIDA ---
    // Passa um único objeto para a função onUpdate
    onUpdate({
      endpoint: "goals",
      id: initialGoal.id,
      [fieldName]: finalValue,
    });
  };

  return (
    <Form {...form}>
      <form className="bg-[#0a1535] border border-[#0126fb]/20 p-4 rounded-lg space-y-3">
        <CustomInput
          form={form}
          field="title"
          label="Título da Meta"
          className="bg-transparent text-white font-semibold"
          onBlur={() => handleGoalUpdate("title")}
          disabled={isUpdating} // Usa o estado de carregamento
        />
        <CustomTextArea
          form={form}
          field="description"
          label="Descrição da Meta"
          className="bg-[#010d26] text-white/90 text-sm"
          onBlur={() => handleGoalUpdate("description")}
          disabled={isUpdating} // Usa o estado de carregamento
        />
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <CustomInput
            form={form}
            field="goal"
            label="Meta (Valor Alvo)"
            type="number"
            className="w-full bg-[#010d26]"
            onBlur={() => handleGoalUpdate("goal")}
            disabled={isUpdating} // Usa o estado de carregamento
          />
          <CustomInput
            form={form}
            field="value"
            label="Valor Atual"
            type="number"
            className="w-full bg-[#010d26]"
            onBlur={() => handleGoalUpdate("value")}
            disabled={isUpdating} // Usa o estado de carregamento
          />
        </div>
      </form>
    </Form>
  );
}