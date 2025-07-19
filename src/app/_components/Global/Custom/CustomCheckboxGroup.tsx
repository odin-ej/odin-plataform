"use client";

import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form"; // Supondo que você exporta tudo do seu form
import { Checkbox } from "@/components/ui/checkbox";
import { Control, FieldValues, Path } from "react-hook-form";

interface CheckboxGroupOption {
  value: string;
  label: string;
}

interface CustomCheckboxGroupProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  options: CheckboxGroupOption[];
  disabled?: boolean;
}

const CustomCheckboxGroup = <T extends FieldValues>({
  control,
  name,
  label,
  options,
  disabled,
}: CustomCheckboxGroupProps<T>) => {
  return (
    <FormField
      disabled={disabled}
      control={control}
      name={name}
      render={() => (
        <FormItem className="md:col-span-2">
          <FormLabel className="text-base font-semibold text-white">
            {label}
          </FormLabel>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
            {options.map((item) => (
              <FormField
                key={item.value}
                control={control}
                disabled={disabled}
                name={name}
                render={({ field }) => {
                  return (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          disabled={disabled}
                          checked={field.value?.includes(item.value)}
                          onCheckedChange={(checked) => {
                            const currentValue = field.value || [];
                            return checked
                              ? field.onChange([...currentValue, item.value])
                              : field.onChange(
                                  currentValue?.filter(
                                    (value: string) => value !== item.value
                                  )
                                );
                          }}
                        />
                      </FormControl>
                      <FormLabel className="font-normal text-white">
                        {item.label}
                      </FormLabel>
                    </FormItem>
                  );
                }}
              />
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomCheckboxGroup;
