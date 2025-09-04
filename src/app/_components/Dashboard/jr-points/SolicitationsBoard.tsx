/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Prisma } from "@prisma/client";
import { Building, Inbox, Search, User } from "lucide-react";
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
        template: { select: { name: true } };
      };
    };
    attachments: true;
  };
}>;

const SolicitationsBoard = ({
  solicitations = [],
  reports = [],
  onCardClick,
}: {
  solicitations: FullJRPointsSolicitation[];
  reports: FullJRPointsReport[];
  onCardClick: (item: any) => void;
}) => {
  const [activeTab, setActiveTab] = useState<
    "PENDING" | "APPROVED" | "REJECTED"
  >("PENDING");
  const [targetFilter, setTargetFilter] = useState<
    "all" | "user" | "enterprise"
  >("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("6");
  const [searchTerm, setSearchTerm] = useState("");
  const allRequests = useMemo(
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
    let items = allRequests.filter((r) => r.status === activeTab);

    if (targetFilter === "user") {
      items = items.filter((r) => !r.isForEnterprise);
    } else if (targetFilter === "enterprise") {
      items = items.filter((r) => r.isForEnterprise);
    }

    // Apply search term filter
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

    return items;
  }, [allRequests, activeTab, targetFilter, searchTerm]);

  // Pagina os dados filtrados
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * Number(itemsPerPage);
    return filteredData.slice(startIndex, startIndex + Number(itemsPerPage));
  }, [filteredData, currentPage, itemsPerPage]);

  const totalPages =
    Math.ceil(filteredData.length / Number(itemsPerPage)) === 0
      ? 1
      : Math.ceil(filteredData.length / Number(itemsPerPage));

  const TABS = [
    { status: "PENDING", label: "Pendentes" },
    { status: "APPROVED", label: "Aprovadas" },
    { status: "REJECTED", label: "Rejeitadas" },
  ];

  return (
    <div className="min-w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-6 text-white shadow-lg mt-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex lg:flex-row flex-col justify-center md:justify-between text-center xl:text-start w-full items-center gap-2">
          <h2 className="text-2xl w-full text-center xl:text-start  font-bold text-[#0126fb]">
            Painel de Requisições
          </h2>
          <div className="flex w-full items-center justify-center flex-col gap-2 md:gap-4">
            <div className="xl:mb-2 xl:mt-0 flex w-full items-center justify-center lg:justify-end gap-2">
              <Select value={itemsPerPage} onValueChange={setItemsPerPage}>
                <SelectTrigger className="w-[240px] bg-[#00205e]/50 border-[#00205e] text-white">
                  <SelectValue
                    placeholder={`${itemsPerPage} itens por página`}
                  />
                </SelectTrigger>
                <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                  {Array.from({ length: 5 }, (_, i) => (i + 1) * 6).map(
                    (num) => (
                      <SelectItem
                        key={num}
                        value={String(num)}
                        className="hover:bg-[#0126fb]/50"
                      >
                        {num} itens por página
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col w-full md:justify-end justify-center md:flex-row gap-2 sm:gap-4 items-center">
              <div className="relative flex-grow w-full xl:flex-grow-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Pesquisar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 text-xs md:text-md bg-[#00205e]/50 border-gray-700 text-white placeholder:text-gray-500 pl-9 w-full"
                />
              </div>
              {/* Target Filter Buttons */}
              <div className="flex sm:flex-row flex-col sm:mt-0 mt-2 w-full sm:w-auto items-center gap-2 p-1 bg-[#00205e]/50 rounded-lg">
                <Button
                  size="sm"
                  onClick={() => setTargetFilter("all")}
                  variant={targetFilter === "all" ? "default" : "ghost"}
                  className={cn(
                    "bg-transparent hover:bg-[#f5b719]/90 disabled:bg-[#f5b719]/50 hover:text-white",
                    targetFilter === "all" && "bg-[#f5b719]"
                  )}
                >
                  Todos
                </Button>
                <Button
                  size="sm"
                  onClick={() => setTargetFilter("user")}
                  variant={targetFilter === "user" ? "default" : "ghost"}
                  className={cn(
                    "bg-transparent hover:bg-[#0126fb]/90 disabled:bg-[#0126fb]/50 hover:text-white",
                    targetFilter === "user" && "bg-[#0126fb]"
                  )}
                >
                  <User className="h-4 w-4 mr-2" /> Pessoais
                </Button>
                <Button
                  size="sm"
                  onClick={() => setTargetFilter("enterprise")}
                  variant={targetFilter === "enterprise" ? "default" : "ghost"}
                  className={cn(
                    "bg-transparent hover:bg-[#00205e]/90 disabled:bg-[#00205e]/50",
                    targetFilter === "enterprise" && "bg-[#00205e]"
                  )}
                >
                  <Building className="h-4 w-4 mr-2" /> Da Empresa
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Abas de Status */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex sm:flex-row flex-col items-center justify-center sm:justify-start  sm:space-x-6">
          {TABS.map((tab) => (
            <button
              key={tab.status}
              onClick={() => setActiveTab(tab.status as any)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors
                ${
                  activeTab === tab.status
                    ? "border-[#f5b719] text-[#f5b719]"
                    : "border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500"
                }`}
            >
              {tab.label} (
              {allRequests.filter((r) => r.status === tab.status).length})
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo da Aba */}
      <div className="mt-6">
        {paginatedData.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedData.map((item) => (
              <RequestCard
                key={item.id}
                item={item}
                onCardClick={onCardClick}
              />
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
