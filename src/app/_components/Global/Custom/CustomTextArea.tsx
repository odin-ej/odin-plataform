"use client";

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { FieldValues } from "react-hook-form";
import { CustomFieldProps } from "./CustomInput";
import { cn } from "@/lib/utils";

const CustomTextArea = <T extends FieldValues>({
  form,
  className,
  onKeyDown,
  onBlur,
  field,
  label,
  placeholder,
  disabled,
  labelClassName,
  control,
}: CustomFieldProps<T>) => {
  const formControl = form?.control || control;

  if (!formControl) {
    // Lança um erro se nenhuma forma de controle for fornecida
    throw new Error(
      "Você precisa fornecer a prop 'form' ou 'control' para o CustomInput."
    );
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
            <Textarea
              disabled={disabled}
              className={cn(
                "text-xs min-h-[100px] sm:text-md",
                fieldState.error && "border-red-500",
                className
              )}
              placeholder={placeholder}
              {...field}
              onBlur={onBlur}
              onKeyDown={onKeyDown}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomTextArea;
