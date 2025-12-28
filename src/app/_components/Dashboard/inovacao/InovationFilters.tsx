/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, Search, X } from "lucide-react";
import { useMemo } from "react";

interface InovationFilterProps {
  type: "my" | "all";
  label: string;
  initiativesFilter: any;
  setInitiativesFilter: React.Dispatch<React.SetStateAction<any>>;
  hasActiveFilters: boolean;
  clearFilters: () => void;
  statusOptions: string[];
  areaOptions: string[];
  subAreaOptions: string[];
  semesterOptions: string[];
  itemsPerPage: string;
  setItemsPerPage: (value: string) => void;
  memberOptions?: string[];
}

const InovationFilters = ({
  type,
  label,
  initiativesFilter,
  setInitiativesFilter,
  hasActiveFilters,
  clearFilters,
  statusOptions,
  areaOptions,
  subAreaOptions,
  itemsPerPage,
  setItemsPerPage,
  memberOptions,
  semesterOptions,
}: InovationFilterProps) => {
  const getTitle = useMemo(() => {
    switch (type) {
      case "my":
        switch (label) {
          case "Iniciativas":
            return "Minhas Iniciativas";
          case "Pílulas":
            return "Minhas Pílulas";
          case "Núcleo de Inovação":
            return "Minhas Operações";
          case "Eventos":
            return "Eventos que participei";
          default:
            return "Minhas Iniciativas";
        }
      case "all":
        switch (label) {
          case "Iniciativas":
            return "Iniciativas da Casinha";
          case "Pílulas":
            return "Pílulas da Casinha";
          case "Núcleo de Inovação":
            return "Operações da Casinha";
          case "Eventos":
            return "Eventos da Casinha";
          default:
            return "Iniciativas da Casinha";
        }
    }
  }, [label, type]);

  return (
    <div className="flex flex-col justify-center items-start mb-8 border-b border-blue-900/20 pb-6">
      {/* BARRA DE FILTROS */}
      <div>
        <h2 className="text-white/90 mt-6 font-semibold text-lg flex items-center gap-2">
          {getTitle}
        </h2>
      </div>
      <div className="flex flex-col mt-3 lg:flex-row gap-3 w-full">
        <div className="flex gap-2 w-full">
          <div className="relative w-full flex items-center min-w-50 2xl:w-100">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              size={14}
            />
            <Input
              placeholder="Pesquisar por nome..."
              value={initiativesFilter.searchQuery}
              onChange={(e) =>
                setInitiativesFilter((prev: any) => ({
                  ...prev,
                  searchQuery: e.target.value,
                }))
              }
              className="bg-[#020817] border-blue-900/30 pl-9 text-slate-200 placeholder:text-slate-600 h-9 text-sm focus-visible:ring-amber-400/50"
            />
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              className="h-9 w-9 text-slate-400 hover:text-red-400 hover:bg-red-900/10"
            >
            <X size={16} />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap lg:flex-nowrap items-center justify-center gap-2">
          {/* Status Filter */}
          <div>
            <h4 className="text-white font-semibold">Status:</h4>
            <Select
              value={initiativesFilter.statusFilter}
              onValueChange={(val) =>
                setInitiativesFilter((prev: any) => ({
                  ...prev,
                  statusFilter: val,
                }))
              }
            >
              <SelectTrigger className="w-[130px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                <div className="flex items-center gap-2">
                  <Filter size={10} className="text-amber-400" />
                  <SelectValue placeholder="Status" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                <SelectItem value="all">Todos</SelectItem>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt === "PENDING"
                      ? "Pendente"
                      : opt === "APPROVED"
                      ? "Aprovado"
                      : opt === "RUNNING"
                      ? "Rodando"
                      : opt === "REJECTED"
                      ? "Rejeitado"
                      : opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Area Filter */}
          <div>
            <h4 className="text-white font-semibold">Área:</h4>
            <Select
              value={initiativesFilter.areaFilter}
              onValueChange={(val) =>
                setInitiativesFilter((prev: any) => ({
                  ...prev,
                  area: val,
                }))
              }
            >
              <SelectTrigger className="w-[130px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                <div className="flex items-center gap-2">
                  <Filter size={10} className="text-amber-400" />
                  <SelectValue placeholder="Área" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                <SelectItem value="all">Todas</SelectItem>
                {areaOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h4 className="text-white font-semibold">Subárea:</h4>
            <Select
              value={initiativesFilter.subAreaFilter}
              onValueChange={(val) =>
                setInitiativesFilter((prev: any) => ({
                  ...prev,
                  subArea: val,
                }))
              }
            >
              <SelectTrigger className="w-[130px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                <div className="flex items-center gap-2">
                  <Filter size={10} className="text-amber-400" />
                  <SelectValue placeholder="Subárea" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                <SelectItem value="all">Todas</SelectItem>
                {subAreaOptions.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <h4 className="text-white font-semibold">Semestre:</h4>
            <Select
              value={initiativesFilter.semesterFilter}
              onValueChange={(val) =>
                setInitiativesFilter((prev: any) => ({
                  ...prev,
                  semester: val,
                }))
              }
            >
              <SelectTrigger className="w-[130px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                <div className="flex items-center gap-2">
                  <Filter size={10} className="text-amber-400" />
                  <SelectValue placeholder="Semestre" />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                <SelectItem value="all">Todos</SelectItem>
                {semesterOptions.map((opt: any) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Fixed Filter */}
          {type !== "my" && (
            <div>
              <h4 className="text-white font-semibold">Fixado:</h4>
              <Select
                value={initiativesFilter.fixedFilter}
                onValueChange={(val) =>
                  setInitiativesFilter((prev: any) => ({
                    ...prev,
                    fixedFilter: val,
                  }))
                }
              >
                <SelectTrigger className="w-[130px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                  <div className="flex items-center gap-2">
                    <Filter size={10} className="text-amber-400" />
                    <SelectValue placeholder="Todos" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                  <SelectItem value="all">Todos</SelectItem>
                  {["Sim", "Não"].map((opt: any) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type !== "my" && memberOptions && (
            <div>
              <h4 className="text-white font-semibold">Sócios(as):</h4>
              <Select
                value={initiativesFilter.memberFilter}
                onValueChange={(val) =>
                  setInitiativesFilter((prev: any) => ({
                    ...prev,
                    member: val,
                  }))
                }
              >
                <SelectTrigger className="w-[130px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                  <div className="flex items-center gap-2">
                    <Filter size={10} className="text-amber-400" />
                    <SelectValue placeholder="Todos" />
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                  <SelectItem value="all">Todos</SelectItem>
                  {memberOptions.map((opt: any) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <h4 className="text-white font-semibold">Itens:</h4>
            <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
              <SelectTrigger className="w-fit bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                <div className="flex items-center gap-2">
                  <Filter size={10} className="text-amber-400" />
                  <SelectValue
                    placeholder={`${itemsPerPage} itens por página`}
                  />
                </div>
              </SelectTrigger>
              <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                {Array.from({ length: 5 }, (_, i) => (i + 1) * 4).map((num) => (
                  <SelectItem
                    key={num}
                    value={String(num)}
                    className="hover:bg-[#0126fb]/50"
                  >
                    {num} por página
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InovationFilters;
