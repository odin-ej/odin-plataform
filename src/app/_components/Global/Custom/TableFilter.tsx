"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { SearchIcon } from "lucide-react";

interface TableFilterProps {
  placeholder?: string;
  onFilterChange?: (value: string) => void; // Prop agora é opcional
}

const TableFilter = ({
  placeholder = "Pesquisar...",
  onFilterChange = () => {},
}: TableFilterProps) => {
  return (
    <div className="relative w-full max-w-xs">
      <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        onChange={(e) => onFilterChange(e.target.value)}
        // Estilo para combinar com o design da sua imagem
        className="w-full text-xs sm:text-md rounded-lg border-none outline-none focus:outline-none bg-[#00205e] pl-10 text-white placeholder:text-gray-400 focus:ring-1 focus:ring-blue-500"
      />
    </div>
  );
};

export default TableFilter;
