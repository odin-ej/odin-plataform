/* eslint-disable @typescript-eslint/no-explicit-any */
import { Button } from "@/components/ui/button";
import { Prisma } from "@prisma/client";
import { Building, Inbox, User } from "lucide-react";
import { useMemo, useState } from "react";
import Pagination from "../../Global/Custom/Pagination";
import RequestCard from "./RequestCard";
import { cn } from "@/lib/utils";

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
    attachments: true;
    membersSelected: true;
    tags: {
      include: {
        assigner: true;
        actionType: true;
      };
    };
  };
}>;

/**
 * Report com o relacionamento de user incluso
 */
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
    tag: {
      include: { assigner: true; actionType: true };
    };
    attachments: true;
  };
}>;

const ITEMS_PER_PAGE = 5;

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
    setCurrentPage(1); // Reseta a página ao mudar o filtro
    let items = allRequests.filter((r) => r.status === activeTab);
    if (targetFilter === "user") {
      items = items.filter((r) => !r.isForEnterprise);
    } else if (targetFilter === "enterprise") {
      items = items.filter((r) => r.isForEnterprise);
    }
    return items;
  }, [allRequests, activeTab, targetFilter]);
  // Pagina os dados filtrados
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredData, currentPage]);

  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE) === 0 ? 1 : Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const TABS = [
    { status: "PENDING", label: "Pendentes" },
    { status: "APPROVED", label: "Aprovadas" },
    { status: "REJECTED", label: "Rejeitadas" },
  ];

  return (
    <div className="min-w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-6 text-white shadow-lg mt-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl font-bold text-[#0126fb]">
          Painel de Requisições
        </h2>
        <div className="flex items-center gap-2 p-1 bg-[#00205e]/50 rounded-lg">
          <Button
            size="sm"
            onClick={() => setTargetFilter("all")}
            variant={targetFilter === "all" ? "default" : "ghost"}
            className={cn('bg-transparent hover:bg-[#f5b719]/90 disabled:bg-[#f5b719]/50 hover:text-white', targetFilter === "all" && 'bg-[#f5b719]')}
          >
            Todos
          </Button>
          <Button
            size="sm"
            onClick={() => setTargetFilter("user")}
            variant={targetFilter === "user" ? "default" : "ghost"}
            className={cn('bg-transparent hover:bg-[#0126fb]/90 disabled:bg-[#0126fb]/50 hover:text-white', targetFilter === "user" && 'bg-[#0126fb]')}
          >
            <User className="h-4 w-4 mr-2" /> Pessoais
          </Button>
          <Button
            size="sm"
            onClick={() => setTargetFilter("enterprise")}
            variant={targetFilter === "enterprise" ? "default" : "ghost"}
            className={cn("bg-transparent hover:bg-[#00205e]/90 disabled:bg-[#00205e]/50" ,
              targetFilter === "enterprise" && 'bg-[#00205e]'
            )}
          >
            <Building className="h-4 w-4 mr-2" /> Da Empresa
          </Button>
        </div>
      </div>

      {/* Abas de Status */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-6">
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
            <p className="text-sm mt-2">
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
