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
interface CustomSelectProps<T extends FieldValues> {
  control: Control<T>;
  name: Path<T>;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[]; // Espera um array de objetos com value e label
  disabled?: boolean;
}

const CustomSelect = <T extends FieldValues>({
  control,
  name,
  label,
  disabled,
  placeholder,
  options,
}: CustomSelectProps<T>) => {
  return (
    <FormField
      control={control}
      disabled={disabled}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="w-full">
          <FormLabel className="text-white">{label}</FormLabel>
          <Select onValueChange={field.onChange} defaultValue={field.value}>
            <FormControl
              className={cn(
                "w-full bg-transparent border-2",
                fieldState.error ? "border-red-500" : "border-white"
              )}
            >
              <SelectTrigger
                disabled={disabled}
                className={cn(
                  " text-white placeholder-white/50  focus:ring-1 focus:ring-[#0126fb]",
                  disabled ? "bg-[#0B2A6B] py-3" : "bg-transparent"
                )}
              >
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
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
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomSelect;
