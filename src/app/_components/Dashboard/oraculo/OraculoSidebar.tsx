"use client";
import { Folder, Star, Clock } from "lucide-react";
import { FullOraculoFolder } from "@/app/(dashboard)/oraculo/page";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

type FolderTreeProps = {
  folders: FullOraculoFolder[];
  parentId?: string | null;
  onFolderClick: (folder: FullOraculoFolder) => void;
  level?: number;
};

const FolderTree = ({
  folders,
  parentId = null,
  onFolderClick,
  level = 0,
}: FolderTreeProps) => {
  // Filtra apenas as pastas filhas do nível atual
  const children = folders.filter((f) => f.parentId === parentId);
  if (children.length === 0) return null;

  return (
    <ul className="space-y-1">
      {children.map((folder) => (
        <li key={folder.id}>
          {/* Item da pasta clicável */}
          <a
            onClick={() => onFolderClick(folder)}
            style={{ paddingLeft: `${level * 1.25}rem` }} // Adiciona indentação para cada nível
            className="flex items-center gap-2 cursor-pointer text-gray-400 hover:text-white p-2 rounded-md transition-colors"
          >
            <Folder className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{folder.name}</span>
          </a>
          {/* Chama a si mesmo para renderizar as subpastas deste item */}
          <div className="pl-4 border-l border-gray-700/50">
            <FolderTree
              folders={folders}
              parentId={folder.id}
              onFolderClick={onFolderClick}
              level={level + 1}
            />
          </div>
        </li>
      ))}
    </ul>
  );
};
type OraculoSidebarProps = {
  allFolders: FullOraculoFolder[];
  activeFilter: string;
  onFilterChange: (filter: "all" | "favorites" | "recents") => void;
  onFolderClick: (folder: FullOraculoFolder | null) => void;
};

const OraculoSidebar = ({
  allFolders,
  activeFilter,
  onFilterChange,
  onFolderClick,
}: OraculoSidebarProps) => {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* Filtros Rápidos */}
      <div className="flex sm:flex-row flex-col items-center text-white gap-2 p-1 bg-[#00205e]/30 rounded-lg border border-gray-700">
        <Button
          size="sm"
          onClick={() => onFilterChange("all")}
          variant={activeFilter === "all" ? "secondary" : "ghost"}
          className={cn(
            "flex-grow justify-center hover:bg-[#f5b719]/10 hover:text-[#f5b719] transition-colors",
            activeFilter === "all"
              ? "bg-[#f5b719]/20 text-[#f5b719] border-[#f5b719]"
              : ""
          )}
        >
          Todos
        </Button>
        <Button
          size="sm"
          onClick={() => onFilterChange("favorites")}
          variant={activeFilter === "favorites" ? "secondary" : "ghost"}
          className={cn(
            "flex-grow justify-center hover:bg-[#f5b719]/10 hover:text-[#f5b719] transition-colors",
            activeFilter === "favorites"
              ? "bg-[#f5b719]/20 text-[#f5b719] border-[#f5b719]"
              : ""
          )}
        >
          <Star className="h-4 w-4 mr-2" /> Favoritos
        </Button>
        <Button
          size="sm"
          onClick={() => onFilterChange("recents")}
          variant={activeFilter === "recents" ? "secondary" : "ghost"}
          className={cn(
            "flex-grow justify-center hover:bg-[#f5b719]/10 hover:text-[#f5b719] transition-colors",
            activeFilter === "recents"
              ? "bg-[#f5b719]/20 text-[#f5b719] border-[#f5b719]"
              : ""
          )}
        >
          <Clock className="h-4 w-4 mr-2" /> Recentes
        </Button>
      </div>

      {/* Navegação por Pastas */}
      <Accordion
        type="single"
        collapsible
        className="w-full bg-[#00205e]/30 rounded-lg border border-gray-700 px-4 max-h-[300px] sm:max-h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
      >
        <AccordionItem value="folders" className="border-b-0">
          <AccordionTrigger className="hover:no-underline font-semibold text-white">
            Navegar por Pastas
          </AccordionTrigger>
          <AccordionContent>
            <a
              onClick={() => onFolderClick(null)}
              className="flex items-center gap-2 cursor-pointer text-gray-200 font-medium hover:text-white p-2 rounded-md transition-colors"
            >
              <Folder className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">Início (Raiz)</span>
            </a>
            <div className="pl-4 border-l border-gray-700/50">
              <FolderTree folders={allFolders} onFolderClick={onFolderClick} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};
export default OraculoSidebar;
