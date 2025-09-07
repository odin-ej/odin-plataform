/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { UseFormReturn } from "react-hook-form";

type Option = { value: string; label: string };

interface CommandMultiSelectProps {
  options: Option[];
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  
  // Props para react-hook-form
  form?: UseFormReturn<any>;
  name?: string;

  // Props para modo controlado
  value?: string[];
  onChange?: (value: string[]) => void;
}

const CommandMultiSelect = ({
  options,
  label,
  placeholder = "Selecione...",
  form,
  name,
  value,
  onChange,
}: CommandMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  // 1. Criamos um componente "núcleo" que contém apenas a UI do Popover/Command.
  // Ele não tem conhecimento sobre react-hook-form.
  const renderCoreComponent = (
    selectedValues: Set<string>,
    handleSelect: (val: string) => void
  ) => {
    const selectedItems = options.filter((opt) =>
      selectedValues.has(opt.value)
    );

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start bg-transparent hover:bg-white/10 text-[#f5b719] h-auto min-h-10 flex-wrap hover:text-[#f5b719]"
          >
            {selectedItems.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {selectedItems.map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant="secondary"
                    className="rounded-sm bg-[#0126fb] text-white flex items-center gap-1"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que o popover feche
                      handleSelect(item.value);
                    }}
                  >
                    {item.label}
                    <X className="h-3 w-3" />
                  </Button>
                ))}
              </div>
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-2 border-[#0126fb] bg-[#00205e] text-white">
          <Command className="bg-[#00205e] max-h-[250px]">
            <CommandInput
              placeholder="Procurar..."
              className="text-white pb-2"
            />
            <CommandList>
              <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
              <CommandGroup className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label} // O valor para busca deve ser o label
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer text-white bg-transparent hover:!bg-white/10 hover:!text-[#f5b719] transition-colors"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedValues.has(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  // 2. No modo de formulário, usamos FormField para obter o contexto
  // e envolvemos o núcleo com FormItem, FormLabel e FormMessage.
  if (form && name) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => {
          const selectedValues = new Set<string>(field.value || []);
          const handleSelect = (val: string) => {
            const newSelected = new Set(selectedValues);
            if (newSelected.has(val)) newSelected.delete(val);
            else newSelected.add(val);
            field.onChange(Array.from(newSelected));
          };

          return (
            <FormItem className="w-full">
              {label && <FormLabel className="text-white">{label}</FormLabel>}
              {renderCoreComponent(selectedValues, handleSelect)}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  // 3. No modo controlado, usamos elementos simples (div, label) que não
  // precisam de contexto.
  if (value !== undefined && onChange) {
    const selectedValues = new Set<string>(value);
    const handleSelect = (val: string) => {
      const newSelected = new Set<string>(selectedValues);
      if (newSelected.has(val)) newSelected.delete(val);
      else newSelected.add(val);
      onChange(Array.from(newSelected));
    };

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-medium leading-none text-white">
            {label}
          </label>
        )}
        {renderCoreComponent(selectedValues, handleSelect)}
      </div>
    );
  }

  console.error(
    "CommandMultiSelect must be used with either `form` and `name` props, or `value` and `onChange` props."
  );
  return null;
};

export default CommandMultiSelect;