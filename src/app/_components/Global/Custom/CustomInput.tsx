"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatDate, formatPhone } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FieldValues, Path, UseFormReturn, Control } from "react-hook-form";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export interface CustomFieldProps<T extends FieldValues> {
  form?: UseFormReturn<T>;
  control?: Control<T>;
  field: Path<T>;
  label: string;
  placeholder?: string;
  type?: string;
  mask?: "phone" | "date" | null;
  className?: string;
  labelClassName?: string;
  onBlur?: () => void;
  onKeyDown?: (event: ReactKeyboardEvent) => void;
  disabled?: boolean;
}

const CustomInput = <T extends FieldValues>({
  form,
  field,
  label,
  mask,
  placeholder,
  type = "text",
  className,
  labelClassName,
  disabled,
  control,
  onBlur,
}: CustomFieldProps<T>) => {
  const formControl = form?.control || control;

  if (!formControl) {
    throw new Error("Você precisa fornecer a prop 'form' ou 'control' para o CustomInput.");
  }

  // --- CORREÇÃO: LÓGICA SEPARADA PARA INPUTS DE ARQUIVO ---
  if (type === 'file') {
    // Para inputs de arquivo, usamos `form.register` para evitar o erro de "uncontrolled input"
    return (
        <FormItem className="w-full">
            <FormLabel className={cn("text-white", labelClassName)}>{label}</FormLabel>
            <FormControl>
                <Input
                    type="file"
                    disabled={disabled}
                    className={cn("text-xs sm:text-md text-white cursor-pointer file:text-[#f5b719] file:border-0 file:bg-transparent hover:file:text-[#f5b719]/80", className)}
                    {...form?.register(field)} // Usa o registro em vez do 'field' do render prop
                />
            </FormControl>
            <FormMessage />
        </FormItem>
    );
  }

  // Lógica original para todos os outros tipos de input (texto, data, etc.)
  return (
    <FormField
      control={formControl}
      name={field}
      render={({ field: formField, fieldState }) => (
        <FormItem className="w-full">
          <FormLabel className={cn("text-white", labelClassName)}>{label}</FormLabel>
          <FormControl>
            <Input
              disabled={disabled}
              placeholder={placeholder}
              className={cn(
                "text-xs sm:text-md text-white",
                fieldState.error && "border-red-500",
                className
              )}
              type={type}
              {...formField}
              onBlur={onBlur}
              onChange={(e) => {
                let value = e.target.value;
                if (mask === "phone") value = formatPhone(value);
                else if (mask === "date") value = formatDate(value);
                
                const maxLength = mask === "phone" ? 15 : mask === "date" ? 10 : undefined;
                if (maxLength && value.length > maxLength) {
                  value = value.slice(0, maxLength);
                }
                formField.onChange(value);
              }}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomInput;