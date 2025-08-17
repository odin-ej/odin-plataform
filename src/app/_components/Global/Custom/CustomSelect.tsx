"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Control, FieldValues, Path } from "react-hook-form";

// --- 1. ATUALIZAÇÃO DAS PROPS ---
interface CustomSelectProps<T extends FieldValues> {
  options: { value: string; label: string }[];
  placeholder: string;
  label?: string; // Label agora é opcional
  disabled?: boolean;
  
  // Props para react-hook-form (opcionais)
  control?: Control<T>;
  name?: Path<T>;
  
  // Props para useState (opcionais)
  value?: string;
  onValueChange?: (value: string) => void;
}

const CustomSelect = <T extends FieldValues>({
  control,
  name,
  label,
  disabled,
  placeholder,
  options,
  value,
  onValueChange,
}: CustomSelectProps<T>) => {
  
  // Conteúdo do select que é comum aos dois modos
  const selectContent = (
    <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
      {options.map((option) => (
        <SelectItem
          className={cn(
            "cursor-pointer font-semibold transition-colors",
            "hover:!bg-[#00205e] hover:!text-[#f5b719]",
            "focus:!bg-[#00205e] focus:!text-[#f5b719]",
            "data-[state=checked]:!bg-[#0126fb] data-[state=checked]:!text-white"
          )}
          key={option.value}
          value={option.value}
        >
          {option.label}
        </SelectItem>
      ))}
    </SelectContent>
  );

  // --- 2. LÓGICA CONDICIONAL ---
  
  // MODO 1: Se 'control' e 'name' forem passados, renderiza para react-hook-form
  if (control && name) {
    return (
      <FormField
        control={control}
        disabled={disabled}
        name={name}
        render={({ field, fieldState }) => (
          <FormItem className="w-full">
            {label && <FormLabel className="text-white">{label}</FormLabel>}
            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
              <FormControl>
                <SelectTrigger
                  disabled={disabled}
                  className={cn(
                    "text-white placeholder-white/50 focus:ring-1 focus:ring-[#0126fb] w-full bg-transparent border-2",
                    fieldState.error ? "border-red-500" : "border-white",
                    disabled ? "bg-[#0B2A6B]" : ""
                  )}
                >
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
              </FormControl>
              {selectContent}
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  // MODO 2: Se não, renderiza como um componente controlado por useState
  return (
    <div className="flex w-full flex-col gap-2">
      {label && <FormLabel className="text-white">{label}</FormLabel>}
      <Select onValueChange={onValueChange} value={value} disabled={disabled}>
        <SelectTrigger
          disabled={disabled}
          className={cn(
            "text-white placeholder-white/50 focus:ring-1 focus:ring-[#0126fb] w-full bg-transparent border-2 border-white",
            disabled ? "bg-[#0B2A6B]" : ""
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        {selectContent}
      </Select>
    </div>
  );
};

export default CustomSelect;