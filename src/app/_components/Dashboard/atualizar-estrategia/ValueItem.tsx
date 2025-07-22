"use client";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import CustomInput from "../../Global/Custom/CustomInput";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import { Checkbox } from "@/components/ui/checkbox";
import { Value } from ".prisma/client";
import {
  valueUpdateSchema,
  ValueUpdateType,
} from "@/lib/schemas/strategyUpdateSchema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

// --- PROPS ATUALIZADAS ---
interface ValueItemProps {
  initialValue: Value;
  // onUpdate agora é síncrona e recebe os dados da mutação
  onUpdate: (updatedData: Partial<Value> & { id: string }) => void;
  // Adicionamos o estado de carregamento
  isUpdating: boolean;
}

const ValueItem = ({ initialValue, onUpdate, isUpdating }: ValueItemProps) => {
  const form = useForm<ValueUpdateType>({
    resolver: zodResolver(valueUpdateSchema),
    defaultValues: initialValue,
    mode: "onBlur",
  });

  // --- FUNÇÃO DEIXA DE SER ASYNC ---
  const handleBlurUpdate = async (fieldName: keyof ValueUpdateType) => {
    const isValid = await form.trigger(fieldName);
    if (!isValid) return;

    const fieldValue = form.getValues(fieldName);
    if (fieldValue === initialValue[fieldName]) return;

    // A chamada agora é síncrona e dispara a mutação no componente pai
    onUpdate({ id: initialValue.id, [fieldName]: fieldValue });
  };

  return (
    <Form {...form}>
      <form className="border border-[#0126fb]/30 p-4 rounded-xl bg-[#010d26] space-y-3">
        <CustomInput
          form={form}
          field="name"
          label="Nome do Valor"
          placeholder="Ex: Protagonismo"
          onBlur={() => handleBlurUpdate("name")}
          className="bg-[#0a1535] text-white"
          disabled={isUpdating} // Usa o estado de carregamento
        />
        <CustomTextArea
          form={form}
          field="description"
          label="Descrição do Valor"
          placeholder="Descrição detalhada do que este valor representa."
          onBlur={() => handleBlurUpdate("description")}
          className="bg-[#0a1535] text-white"
          disabled={isUpdating} // Usa o estado de carregamento
        />
        <FormField
          control={form.control}
          name="isMotherValue"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    // A chamada aqui também é síncrona
                    onUpdate({ id: initialValue.id, isMotherValue: !!checked });
                  }}
                  disabled={isUpdating} // Usa o estado de carregamento
                />
              </FormControl>
              <span className="text-sm font-medium text-white">
                É um valor-mãe?
              </span>
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
};

export default ValueItem;