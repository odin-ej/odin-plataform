"use client";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Schema Zod para um campo de estratégia (missão, visão, ou propósito)
const strategyFieldSchema = (fieldName: string) => z.object({
  [fieldName]: z.string().min(10, `O campo deve ter pelo menos 10 caracteres.`),
});

type StrategyFormValues = z.infer<ReturnType<typeof strategyFieldSchema>>;

interface StrategySectionProps {
  field: "mission" | "vision" | "propose";
  label: string;
  value: string;
}

export function StrategySection({ field, label, value }: StrategySectionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<StrategyFormValues>({
    resolver: zodResolver(strategyFieldSchema(field)),
    defaultValues: { [field]: value },
    mode: "onBlur",
  });

  const handleUpdate = async () => {
    const isValid = await form.trigger(field);
    if (!isValid) return;

    const currentValue = form.getValues(field);
    if (!currentValue || currentValue.trim() === value.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/culture`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: currentValue }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `Falha ao atualizar ${label}.`);
      }
      
      toast.success(`${label} atualizada com sucesso.`);
      router.refresh(); // Sincroniza com o servidor

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(`Erro ao atualizar ${label}.`, { description: error.message });
    } finally {
      setIsSubmitting(false);
    }
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
            labelClassName='text-xl font-bold text-[#f5b719]'
            onBlur={handleUpdate}
            disabled={isSubmitting}
          />
        </form>
      </Form>
    </div>
  );
}
