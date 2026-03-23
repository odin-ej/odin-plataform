import { useState } from "react";
import { FullInovationInitiative } from "./InovationCard";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, Lightbulb, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { InovationInitiativeStatus } from "@prisma/client";
interface RelatedSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  options: FullInovationInitiative[];
}

 const RelatedInitiativeSelect = ({
  value,
  onChange,
  disabled,
  options,
}: RelatedSelectProps) => {
  const [open, setOpen] = useState(false);
  const selectedItem = options.find((i) => i.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen} >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between bg-[#020817] border-blue-900/30 text-white hover:bg-[#0b1629] hover:text-white h-auto py-2"
        >
          {selectedItem ? (
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-amber-400/10 rounded-full text-amber-400">
                <Lightbulb size={16} />
              </div>
              <div>
                <div className="font-bold text-sm">{selectedItem.title}</div>
                <div className="text-[10px] text-slate-400 flex gap-2">
                  <span>{selectedItem.semester.name}</span> •{" "}
                  <span>{selectedItem.type}</span>
                </div>
              </div>
            </div>
          ) : (
            <span className="text-slate-500">Selecione uma iniciativa...</span>
          )}
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 bg-[#00205e] border-blue-600/30 text-white">
        <Command className="bg-[#00205e]">
          <CommandInput
            placeholder="Buscar iniciativa..."
            className="text-white placeholder:text-slate-400"
          />
          <CommandList>
            <CommandEmpty>Nenhuma iniciativa encontrada.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.title}
                  onSelect={() => {
                    onChange(option.id === value ? "" : option.id);
                    setOpen(false);
                  }}
                  className="cursor-pointer hover:bg-white/10 data-[selected=true]:bg-white/10"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span className="font-medium text-white">
                      {option.title}
                    </span>
                    <span className="text-xs text-slate-400 flex gap-2">
                      {option.semester.name} •
                      <span
                        className={cn(
                          "font-bold",
                          option.status === InovationInitiativeStatus.RUNNING
                            ? "text-green-400"
                            : "text-amber-400"
                        )}
                      >
                        {option.status}
                      </span>
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default RelatedInitiativeSelect;