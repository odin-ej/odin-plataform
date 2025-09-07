/* eslint-disable @typescript-eslint/no-explicit-any */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, X } from "lucide-react";
import { useState } from "react";
import { UseFormReturn } from "react-hook-form";

type Option = { value: string; label: string };

type Props = {
  form?: UseFormReturn<any>;
  name?: string;
  label?: string;
  value?: string[];
  onChange?: (value: string[]) => void;
  options: Option[];
  placeholder?: string;
};

const CommandMultiSelect = ({
  form,
  name,
  label,
  value,
  onChange,
  options,
  placeholder = "Selecione...",
}: Props) => {
  const [open, setOpen] = useState(false);

  const renderSelect = (
    selectedValues: Set<string>,
    handleSelect: (value: string) => void
  ) => {
    const selectedItems = options.filter((opt) =>
      selectedValues.has(opt.value)
    );

    return (
      <FormItem>
        {label && <FormLabel>{label}</FormLabel>}
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
                    <Badge
                      variant="secondary"
                      key={item.value}
                      className="rounded-sm bg-[#0126fb] text-white "
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelect(item.value);
                      }}
                    >
                      {item.label}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
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
                className="text-white pb-2"
                placeholder="Procurar..."
              />
              <CommandList>
                <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                <CommandGroup
                  className="max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
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
        {form && <FormMessage />}
      </FormItem>
    );
  };

  // Modo com react-hook-form
  if (form && name) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => {
          const selectedValues = new Set<string>(
            (field.value as string[]) || []
          );

          const handleSelect = (val: string) => {
            const newSelected = new Set<string>(selectedValues);
            if (newSelected.has(val)) {
              newSelected.delete(val);
            } else {
              newSelected.add(val);
            }
            field.onChange(Array.from(newSelected));
          };

          return renderSelect(selectedValues, handleSelect);
        }}
      />
    );
  }

  // Modo controlado (value + onChange)
  const selectedValues = new Set(value || []);
  const handleSelect = (val: string) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(val)) {
      newSelected.delete(val);
    } else {
      newSelected.add(val);
    }
    onChange?.(Array.from(newSelected));
  };

  return renderSelect(selectedValues, handleSelect);
};

export default CommandMultiSelect;
