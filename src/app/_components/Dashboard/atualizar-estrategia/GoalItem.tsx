"use client";
import { EstrategyObjectiveWithGoals } from "@/app/(dashboard)/atualizar-estrategia/page";
import { Form } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import CustomInput from "../../Global/Custom/CustomInput";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import { z } from "zod";

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

// Este é o tipo de dados que o formulário irá gerenciar.
type GoalFormValues = z.infer<typeof goalFormSchema>;
// ==================================================================

interface GoalItemProps {
  initialGoal: EstrategyObjectiveWithGoals["goals"][number];
  onUpdate: (
    endpoint: "objectives" | "goals",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { id: string; [key: string]: any }
  ) => Promise<void>;
}

export function GoalItem({ initialGoal, onUpdate }: GoalItemProps) {
  // O useForm agora usa o schema e o tipo corretos para o formulário.
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

  const handleGoalUpdate = async (fieldName: keyof GoalFormValues) => {
    // A validação com z.coerce.number() já acontece aqui quando o trigger é chamado.
    const isValid = await form.trigger(fieldName);
    if (!isValid) return;
    const rawValue = form.getValues(fieldName);
    // getValues() agora retorna um número graças ao z.coerce
    let finalValue: string | number = rawValue;

    // Se o campo for numérico, garante a conversão para número antes de enviar.
    if (fieldName === "goal" || fieldName === "value") {
      finalValue = Number(rawValue);

      // Compara o valor convertido com o valor inicial para evitar requisições desnecessárias.
      if (finalValue === Number(initialGoal[fieldName])) {
        return;
      }
    } else {
      // Se for string, compara diretamente.
      if (finalValue === initialGoal[fieldName]) {
        return;
      }
    }

    // Envia o dado já no formato correto (número) para a API.
    await onUpdate("goals", { id: initialGoal.id, [fieldName]: finalValue });
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
        />
        <CustomTextArea
          form={form}
          field="description"
          label="Descrição da Meta"
          className="bg-[#010d26] text-white/90 text-sm"
          onBlur={() => handleGoalUpdate("description")}
        />
        <div className="flex flex-col sm:flex-row gap-4 pt-2">
          <CustomInput
            form={form}
            field="goal"
            label="Meta (Valor Alvo)"
            type="number"
            className="w-full bg-[#010d26]"
            onBlur={() => handleGoalUpdate("goal")}
          />
          <CustomInput
            form={form}
            field="value"
            label="Valor Atual"
            type="number"
            className="w-full bg-[#010d26]"
            onBlur={() => handleGoalUpdate("value")}
          />
        </div>
      </form>
    </Form>
  );
}
