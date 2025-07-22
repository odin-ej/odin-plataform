"use client";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import CustomTextArea from "../../Global/Custom/CustomTextArea";

// Schema Zod para um campo de estratégia (missão, visão, ou propósito)
const strategyFieldSchema = (fieldName: string) =>
  z.object({
    [fieldName]: z
      .string()
      .min(10, `O campo deve ter pelo menos 10 caracteres.`),
  });

type StrategyFormValues = z.infer<ReturnType<typeof strategyFieldSchema>>;

interface StrategySectionProps {
  field: "mission" | "vision" | "propose";
  label: string;
  value: string;
  onUpdate: (data: { field: string; value: string }) => void;
  isUpdating: boolean;
}

export function StrategySection({ field, label, value, onUpdate, isUpdating }: StrategySectionProps) {
  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFieldSchema(field)),
    defaultValues: { [field]: value },
    mode: "onBlur",
  });

  const handleUpdate = async () => {
    const isValid = await form.trigger(field);
    if (!isValid) return;

    const currentValue = form.getValues(field);
    // Se o valor não mudou, não fazemos nada
    if (!currentValue || currentValue.trim() === value.trim()) {
      return;
    }

    // 🔥 AQUI ESTÁ A MUDANÇA:
    // Em vez de fazer o fetch, apenas chamamos a função que recebemos por props.
    // O TanStack Query no componente pai cuidará de todo o resto.
    onUpdate({ field, value: currentValue });
  };

  return (
    <div className="bg-[#010d26] border border-[#0126fb]/40 p-6 rounded-xl w-full">
      <Form {...form}>
        <form>
          <CustomTextArea
            form={form}
            field={field}
            label={label}
            placeholder={`Digite a ${label.toLowerCase()}`}
            className="bg-[#0a1535] text-white border-none p-4"
            labelClassName="text-xl font-bold text-[#f5b719]"
            onBlur={handleUpdate}
            disabled={isUpdating}
          />
        </form>
      </Form>
    </div>
  );
}
