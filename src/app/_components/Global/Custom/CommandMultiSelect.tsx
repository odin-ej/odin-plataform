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
  page?: string;
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
  page, // Adicionamos 'page' ao destructuring
  form,
  name,
  value,
  onChange,
}: CommandMultiSelectProps) => {
  const [open, setOpen] = useState(false);

  // 1. O componente "núcleo" agora recebe um array de strings
  // e duas funções de callback: onSelect (para adicionar) e onDeselect (para remover).
  const renderCoreComponent = (
    selectedValues: string[], // Alterado de Set<string> para string[]
    onSelect: (val: string) => void,
    onDeselect: (val: string, index?: number) => void
  ) => {
    // Lógica para exibir os itens selecionados
    const getSelectedItems = () => {
      if (page === "my-points") {
        // Mapeia CADA valor no array, permitindo duplicados
        return selectedValues
          .map((val, index) => {
            const option = options.find((opt) => opt.value === val);
            return option
              ? { ...option, uniqueKey: `${val}-${index}` } // Adiciona uma chave única baseada no índice
              : null;
          })
          .filter(Boolean) as (Option & { uniqueKey: string })[];
      } else {
        // Lógica original: mostra apenas itens únicos
        const uniqueValues = [...new Set(selectedValues)];
        return uniqueValues
          .map((val) => {
            const option = options.find((opt) => opt.value === val);
            return option
              ? { ...option, uniqueKey: val } // Chave é o próprio valor
              : null;
          })
          .filter(Boolean) as (Option & { uniqueKey: string })[];
      }
    };

    const selectedItems = getSelectedItems();

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
                  <span
                    key={item.uniqueKey} // Usa a chave única
                    className="rounded-sm bg-[#0126fb] text-white flex items-center gap-1 py-1 px-2"
                    onClick={(e) => {
                      e.stopPropagation(); // Evita que o popover feche
                      // Extrai o índice da chave, se for 'my-points'
                      const index =
                        page === "my-points"
                          ? parseInt(item.uniqueKey.split("-").pop() || "", 10)
                          : undefined;
                      onDeselect(item.value, index);
                    }}
                  >
                    {item.label}
                    <X className="h-3 w-3" />
                  </span>
                ))}
              </div>
            ) : (
              placeholder
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 border-2 border-[#0126fb] bg-[#00205e] text-white focus-visible:ring-0 focus:outline-none">
          <Command className="bg-[#00205e] max-h-[250px]">
            <CommandInput
              placeholder="Procurar..."
              className="text-white pb-2 focus:ring-0 focus:outline-none"
            />
            {/* O scrollbar-thin etc. depende de um plugin (tailwind-scrollbar). */}
            {/* Se não estiver instalado, o !overflow-y-auto garante o scroll padrão. */}
            <CommandList className="max-h-[200px] !overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  // O 'Check' agora verifica se o valor está incluído no array
                  const isSelected = selectedValues.includes(option.value);

                  return (
                    <CommandItem
                      key={option.value}
                      value={option.label} // O valor para busca deve ser o label
                      onSelect={() => onSelect(option.value)}
                      className="cursor-pointer text-white bg-transparent hover:!bg-white/10 hover:!text-[#f5b719] transition-colors focus:ring-0 focus:outline-none"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          // Se for 'my-points', sempre mostra o check se estiver na lista
                          // Se não for 'my-points', também (lógica unificada)
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    );
  };

  // 2. Modo de formulário (react-hook-form)
  if (form && name) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => {
          const selectedValues: string[] = field.value || [];

          // Chamado pelo CommandItem (sempre ADICIONA)
          const handleSelect = (val: string) => {
            if (page === "my-points") {
              // Simplesmente adiciona o valor ao array
              field.onChange([...selectedValues, val]);
            } else {
              // Lógica original (toggle com Set para garantir unicidade)
              const newSet = new Set(selectedValues);
              if (newSet.has(val)) newSet.delete(val);
              else newSet.add(val);
              field.onChange(Array.from(newSet));
            }
          };

          // Chamado pelo badge 'X' (sempre REMOVE)
          const handleDeselect = (val: string, index?: number) => {
            if (page === "my-points") {
              // Remove o item EXATO pelo índice
              if (index !== undefined) {
                const newValues = [...selectedValues];
                newValues.splice(index, 1); // Remove 1 item na posição 'index'
                field.onChange(newValues);
              }
            } else {
              // Lógica original (remove todas as instâncias desse valor)
              field.onChange(selectedValues.filter((v) => v !== val));
            }
          };

          return (
            <FormItem className="w-full">
              {label && <FormLabel className="text-white">{label}</FormLabel>}
              {renderCoreComponent(selectedValues, handleSelect, handleDeselect)}
              <FormMessage />
            </FormItem>
          );
        }}
      />
    );
  }

  // 3. Modo controlado (value/onChange)
  if (value !== undefined && onChange) {
    const selectedValues: string[] = value || [];

    // Chamado pelo CommandItem (sempre ADICIONA)
    const handleSelect = (val: string) => {
      if (page === "my-points") {
        onChange([...selectedValues, val]);
      } else {
        const newSet = new Set(selectedValues);
        if (newSet.has(val)) newSet.delete(val);
        else newSet.add(val);
        onChange(Array.from(newSet));
      }
    };

    // Chamado pelo badge 'X' (sempre REMOVE)
    const handleDeselect = (val: string, index?: number) => {
      if (page === "my-points") {
        if (index !== undefined) {
          const newValues = [...selectedValues];
          newValues.splice(index, 1);
          onChange(newValues);
        }
      } else {
        onChange(selectedValues.filter((v) => v !== val));
      }
    };

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label className="text-sm font-medium leading-none text-white">
            {label}
          </label>
        )}
        {renderCoreComponent(selectedValues, handleSelect, handleDeselect)}
      </div>
    );
  }

  console.error(
    "CommandMultiSelect must be used with either `form` and `name` props, or `value` and `onChange` props."
  );
  return null;
};

export default CommandMultiSelect;
