"use client";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeString } from "@/lib/format";
import { SearchIcon } from "lucide-react";
import React, { useEffect, useState } from "react";

export interface CommandItemData {
  label: string;
  icon: React.ElementType;
  action: () => void; // Função a ser executada ao selecionar o item
}

// Define a estrutura de um grupo de itens (ex: "Páginas", "Itens da Tabela")
export interface CommandGroupData {
  heading: string;
  items: CommandItemData[];
}

interface SearchCommandProps {
  groups?: CommandGroupData[]; // Array de grupos de busca (agora opcional)
  placeholder?: string;
  triggerLabel?: string;
}

const SearchCommand = ({
  groups = [],
  placeholder = "Pesquisar...",
  triggerLabel = "Pesquisar...",
}: SearchCommandProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  return (
    <>
      <Button
        variant="outline"
        className="h-10 sm:text-xs w-10 justify-center border-none bg-[#00205e] p-0 text-gray-400 hover:bg-[#00205e]/80 hover:text-gray-300 sm:w-64 sm:justify-start sm:px-3"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="h-5 w-5" />
        <span className="hidden sm:inline sm:ml-2">{triggerLabel}</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-gray-600 bg-[#010d26] px-1.5 font-mono text-[10px] font-medium sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPortal>
          <DialogOverlay className="bg-black/60 backdrop-blur-sm" />
          <DialogContent className="overflow-hidden p-0 shadow-lg bg-[#010d26] border-2 border-[#0126fb] text-white">
            <style>
              {`
                [cmdk-list] {
                  scrollbar-width: thin;
                  scrollbar-color: #0126fb #00205e;
                }
                [cmdk-list]::-webkit-scrollbar {
                  width: 8px;
                }
                [cmdk-list]::-webkit-scrollbar-track {
                  background-color: #00205e;
                }
                [cmdk-list]::-webkit-scrollbar-thumb {
                  background-color: #0126fb;
                  border-radius: 6px;
                }
              `}
            </style>
            <DialogTitle className="sr-only">
              Navegação por Comandos
            </DialogTitle>
            <DialogDescription className="sr-only">
              Navegue para diferentes páginas ou execute ações usando comandos
              de texto.
            </DialogDescription>
            <Command className='bg-transparent [&_[cmdk-input-wrapper]]:h-14 [&_[cmdk-group-heading]]:px-4 [&_[cmdk-input]]:h-14 [&_[data-slot="command-input-wrapper"]]:h-14 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-list]]:max-h-[300px]'>
              <CommandInput
                placeholder={placeholder}
                className="!min-h-14  text-base text-white ring-offset-transparent placeholder:text-gray-400 focus:ring-0"
              />
              <CommandList>
                <CommandEmpty className="py-6 text-center text-sm text-gray-400">
                  Nenhum resultado encontrado.
                </CommandEmpty>
                {groups.map((group, groupIndex) => (
                  <React.Fragment key={group.heading}>
                    <CommandGroup heading={group.heading}>
                      {Array.isArray(group.items) &&
                        group.items.map((item) => (
                          <CommandItem
                            key={item.label}
                            value={normalizeString(item.label)}
                            onSelect={() => runCommand(item.action)}
                            className="cursor-pointer bg-transparent px-4 py-3 text-white/80 transition-colors duration-200 data-[selected=true]:bg-[#0126fb] data-[selected=true]:text-white hover:!bg-white/10 hover:!text-[#f5b719]"
                          >
                            <item.icon className="mr-3 h-5 w-5" />
                            <span>{item.label}</span>
                          </CommandItem>
                        ))}
                    </CommandGroup>
                    {groupIndex < groups.length - 1 && (
                      <CommandSeparator className="bg-gray-700" />
                    )}
                  </React.Fragment>
                ))}
              </CommandList>
            </Command>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    </>
  );
};

export default SearchCommand;
