/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Prisma, TagTemplate } from "@prisma/client";
import {
  Building,
  Inbox,
  Search,
  User,
  FilePlus,
  ShieldAlert,
} from "lucide-react";
import { useMemo, useState } from "react";
import Pagination from "../../Global/Custom/Pagination";
import RequestCard from "./RequestCard";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CommandMultiSelect from "../../Global/Custom/CommandMultiSelect";

export type FullJRPointsSolicitation = Prisma.JRPointsSolicitationGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        imageUrl: true;
        email: true; // pode adicionar outros campos se precisar
      };
    };
    reviewer: {
      select: {
        id: true;
        name: true;
        imageUrl: true;
        email: true;
      };
    };
    jrPointsVersion: { select: { versionName: true } };
    attachments: true;
    membersSelected: true;
    tags: {
      include: {
        actionType: true;
      };
    };
  };
}>;

export type FullJRPointsReport = Prisma.JRPointsReportGetPayload<{
  include: {
    user: {
      select: {
        id: true;
        name: true;
        imageUrl: true;
        email: true;
      };
    };
    jrPointsVersion: { select: { versionName: true } };
    reviewer: {
      select: {
        id: true;
        name: true;
        imageUrl: true;
        email: true;
      };
    };
    tag: {
      include: {
        assigner: true;
        actionType: true;
        template: { select: { name: true; id: true } };
      };
    };
    attachments: true;
  };
}>;

const SolicitationsBoard = ({
  solicitations = [],
  reports = [],
  allTagTemplates = [],
  onCardClick,
}: {
  solicitations: FullJRPointsSolicitation[];
  reports: FullJRPointsReport[];
  allTagTemplates: TagTemplate[];
  onCardClick: (item: any) => void;
}) => {
  const [activeTab, setActiveTab] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [requestType, setRequestType] = useState<
    "all" | "solicitation" | "report"
  >("all");
  const [targetFilter, setTargetFilter] = useState<
    "all" | "user" | "enterprise"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("6");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  const allItems = useMemo(
    () =>
      [
        ...solicitations.map((s) => ({ ...s, type: "solicitation" as const })),
        ...reports.map((r) => ({ ...r, type: "report" as const })),
      ].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [solicitations, reports]
  );

  const filteredData = useMemo(() => {
    setCurrentPage(1); // Reset page when filters change
    let items = allItems;

    // 1. Filtrar por tipo (Solicitação ou Denúncia)
    if (requestType === "solicitation") {
      items = items.filter((item) => item.type === "solicitation");
    } else if (requestType === "report") {
      items = items.filter((item) => item.type === "report");
    }

    // 2. Filtrar por status (Pendente, Aprovado, Rejeitado)
    items = items.filter((r) => r.status === activeTab);

    // 3. Filtrar por alvo (Pessoal ou Empresa)
    if (targetFilter === "user") {
      items = items.filter((r) => !r.isForEnterprise);
    } else if (targetFilter === "enterprise") {
      items = items.filter((r) => r.isForEnterprise);
    }

    // 4. Filtrar por termo de busca
    if (searchTerm) {
      const normalizedSearch = searchTerm
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      items = items.filter((item) => {
        const descriptionMatch = item.description
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(normalizedSearch);
        const userNameMatch = item.user.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .includes(normalizedSearch);
        return descriptionMatch || userNameMatch;
      });
    }

    // 5. Filtrar por tags selecionadas
    if (selectedTagIds.length > 0) {
      items = items.filter((item) => {
        if (item.type === "solicitation") {
          return item.tags.some((tag) => selectedTagIds.includes(tag.id));
        }
        if (item.type === "report") {
          return selectedTagIds.includes(item.tag.template?.id ?? "");
        }
        return false;
      });
    }

    return items;
  }, [allItems, activeTab, requestType, targetFilter, searchTerm, selectedTagIds]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * Number(itemsPerPage);
    return filteredData.slice(startIndex, startIndex + Number(itemsPerPage));
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages =
    Math.ceil(filteredData.length / Number(itemsPerPage)) || 1;

  const TABS = [
    { status: "PENDING", label: "Pendentes" },
    { status: "APPROVED", label: "Aprovadas" },
    { status: "REJECTED", label: "Rejeitadas" },
  ];

  return (
    <div className="min-w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-4 sm:p-6 text-white shadow-lg mt-6">
      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-center sm:text-left text-[#0126fb]">
          Painel de Requisições
        </h2>
        <div className="w-full sm:w-auto min-w-[220px]">
          <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
            <SelectTrigger className="w-full bg-[#00205e]/50 border-[#00205e] text-white">
              <SelectValue placeholder={`${itemsPerPage} itens por página`} />
            </SelectTrigger>
            <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
              {Array.from({ length: 5 }, (_, i) => (i + 1) * 6).map((num) => (
                <SelectItem
                  key={num}
                  value={String(num)}
                  className="hover:bg-[#0126fb]/50"
                >
                  {num} itens por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* PAINEL DE FILTROS RESPONSIVO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-4 mb-6">
        {/* Coluna Esquerda: Busca e Tags */}
        <div className="space-y-4">
          <div className="relative">
            <label className="text-sm font-medium text-white mb-2 block">
              Pesquisar
            </label>
            <Search className="absolute left-3 bottom-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Por nome ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-10 bg-[#00205e]/50 border-gray-700 text-white placeholder:text-gray-500 pl-9 w-full"
            />
          </div>
          <div>
            <CommandMultiSelect
              value={selectedTagIds}
              onChange={setSelectedTagIds}
              label="Filtrar por Tags"
              placeholder="Selecione uma ou mais tags..."
              options={allTagTemplates.map((t) => ({
                value: t.id,
                label: t.name,
              }))}
            />
          </div>
        </div>

        {/* Coluna Direita: Filtros de Botão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          <div className='col-span-1'>
            <label className="text-sm font-medium text-white mb-2 block">
              Tipo de Requisição
            </label>
            <div className="flex w-full flex-wrap items-center gap-2 p-1 bg-[#00205e]/50 rounded-lg">
              <Button
                size="sm"
                onClick={() => setRequestType("all")}
                className={cn(
                  "flex-1 bg-transparent hover:bg-[#f5b719]/90 hover:text-white",
                  requestType === "all" && "bg-[#f5b719]"
                )}
              >
                Todos
              </Button>
              <Button
                size="sm"
                onClick={() => setRequestType("solicitation")}
                className={cn(
                  "flex-1 bg-transparent hover:bg-[#0126fb]/90 hover:text-white",
                  requestType === "solicitation" && "bg-[#0126fb]"
                )}
              >
                <FilePlus className="h-4 w-4 mr-2" /> Solicitações
              </Button>
              <Button
                size="sm"
                onClick={() => setRequestType("report")}
                className={cn(
                  "flex-1 bg-transparent hover:bg-red-500/90 hover:text-white",
                  requestType === "report" && "bg-red-500"
                )}
              >
                <ShieldAlert className="h-4 w-4 mr-2" /> Denúncias
              </Button>
            </div>
          </div>
          <div className='col-span-1'>
            <label className="text-sm font-medium text-white mb-2 block">
              Alvo da Requisição
            </label>
            <div className="flex w-full flex-wrap items-center gap-2 p-1 bg-[#00205e]/50 rounded-lg">
              <Button
                size="sm"
                onClick={() => setTargetFilter("all")}
                className={cn(
                  "flex-1 bg-transparent hover:bg-[#f5b719]/90 hover:text-white",
                  targetFilter === "all" && "bg-[#f5b719]"
                )}
              >
                Todos
              </Button>
              <Button
                size="sm"
                onClick={() => setTargetFilter("user")}
                className={cn(
                  "flex-1 bg-transparent hover:bg-[#0126fb]/90 hover:text-white",
                  targetFilter === "user" && "bg-[#0126fb]"
                )}
              >
                <User className="h-4 w-4 mr-2" /> Pessoais
              </Button>
              <Button
                size="sm"
                onClick={() => setTargetFilter("enterprise")}
                className={cn(
                  "flex-1 bg-transparent hover:bg-[#00205e]/90",
                  targetFilter === "enterprise" && "bg-[#00205e]"
                )}
              >
                <Building className="h-4 w-4 mr-2" /> Empresa
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Abas de Status */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex flex-wrap justify-center sm:justify-start sm:space-x-6">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status as any)}
              className={cn(
                "whitespace-nowrap py-3 px-2 sm:px-1 border-b-2 font-medium text-sm transition-colors",
                activeTab === tab.status
                  ? "border-[#f5b719] text-[#f5b719]"
                  : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
              )}
            >
              {tab.label} ({allItems.filter((r) => r.status === tab.status).length})
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo da Aba */}
      <div className="mt-6">
        {paginatedData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedData.map((item) => (
              <RequestCard key={item.id} item={item} onCardClick={onCardClick} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 bg-[#00205e]/30 rounded-lg">
            <Inbox className="h-10 w-10" />
            <p className="text-sm mt-2 text-center">
              Nenhum item encontrado para este filtro.
            </p>
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default SolicitationsBoard;
