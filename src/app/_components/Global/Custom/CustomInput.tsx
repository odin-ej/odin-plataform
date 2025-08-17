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
  labelClassName?: string; // Adicionado para permitir classes customizadas
  onBlur?: () => void;
  disabled?: boolean;
  onKeyDown?: (e: ReactKeyboardEvent<HTMLTextAreaElement>) => void;
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
    // Lança um erro se nenhuma forma de controle for fornecida
    throw new Error("Você precisa fornecer a prop 'form' ou 'control' para o CustomInput.");
  }

  return (
    <FormField
      control={formControl}
    name={field}
    render={({ field, fieldState }) => (
      <FormItem className="w-full">
        <FormLabel className={cn("text-white", labelClassName)}>
          {label}
        </FormLabel>
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
            {...field}
            onBlur={onBlur}
            onChange={(e) => {
              let value = e.target.value;
              if (mask === "phone") {
                value = formatPhone(value);
              } else if (mask === "date") {
                value = formatDate(value);
              }
              // Limita o tamanho máximo para evitar entradas inválidas
              const maxLength =
                mask === "phone" ? 15 : mask === "date" ? 10 : undefined;
              if (maxLength && value.length > maxLength) {
                value = value.slice(0, maxLength);
              }
              field.onChange(value);
            }}
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
);
}

export default CustomInput;
