/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import CustomCard from "@/app/_components/Global/Custom/CustomCard";
import {
  Lightbulb,
  Rocket,
  Mic,
  Zap,
  LayoutGrid,
  Search,
  Filter,
  X,
  Plus,
  Settings,
  Check,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InnovationCard } from "./InovationCard";
import { InnovationModal } from "./InovationDetailsModal";
import { FullInovationInitiative } from "./InovationCard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteInovationInitiativeById,
  getAllInovationInitiatives,
  togglePinInovationInitiativeById,
} from "@/lib/actions/inovation";
import {
  AreaInovationInitiative,
  InovationInitiativeType,
  SubAreaInovationInitiative,
} from "@prisma/client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { InitiativeWizard } from "./InitiativeWizard";
import { checkUserPermission, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { INOVATION_LEADERS } from "@/lib/permissions";
import Pagination from "../../Global/Custom/Pagination";
import ModalConfirm from "../../Global/ModalConfirm";
import { toast } from "sonner";

interface InovationContentProps {
  initialData: FullInovationInitiative[];
}

// Configuração de textos para as categorias
const CATEGORY_INFO = {
  [InovationInitiativeType.Iniciativa]: {
    description: "Projetos de Transformação",
    subDescription:
      "Melhorias de processos, novas metodologias e soluções táticas que otimizam o dia a dia.",
  },
  [InovationInitiativeType.Pilula]: {
    description: "Conhecimento Rápido",
    subDescription:
      "Apresentações curtas e focadas para transmitir insights específicos de forma ágil.",
  },
  [InovationInitiativeType.Nucleo]: {
    description: "Operações e Inovação",
    subDescription:
      "Atividades do Núcleo de Inovação, operações e iniciativas para a empresa.",
  },
  [InovationInitiativeType.Evento]: {
    description: "Conexão e Aprendizado",
    subDescription:
      "Momentos de imersão que unem a empresa para compartilhar conhecimento e cultura.",
  },
};

const InovationContent = ({ initialData }: InovationContentProps) => {
  const [selectedInitiative, setSelectedInitiative] =
    useState<FullInovationInitiative | null>(null);
  const [itemToDelete, setItemToDelete] =
    useState<FullInovationInitiative | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [activeTab, setActiveTab] = useState<InovationInitiativeType>(
    InovationInitiativeType.Iniciativa
  );

  // --- Estados de Filtro ---
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [subAreaFilter, setSubAreaFilter] = useState<string>("all");
  const [fixedFilter, setFixedFilter] = useState<string>("all");
  const [ownFilter, setOwnFilter] = useState<string>("all");
  const [isWizardOpen, setIsWizardOpen] = useState(false); // Novo State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("4");
  const [isReviewMode, setIsReviewMode] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: initiatives } = useQuery({
    queryKey: ["inovation-initiatives"],
    queryFn: async () => await getAllInovationInitiatives(),
    initialData,
  });

  const canManage = checkUserPermission(user, INOVATION_LEADERS);

  const { mutate: togglePin } = useMutation({
    mutationFn: ({ id, isFixed }: { id: string; isFixed: boolean }) =>
      togglePinInovationInitiativeById(id, isFixed),
    onSuccess: () => {
      // Invalidate or refetch queries if needed
      queryClient.invalidateQueries({ queryKey: ["inovation-initiatives"] });
      toast.success("Iniciativa fixada/desfixada com sucesso!");
    },
    onError: () => {
      toast.error(
        "Erro ao fixar/desfixar iniciativa. Tente novamente mais tarde."
      );
    },
  });

  const { mutate: deleteInitiative, isPending: isDeleting } = useMutation({
    mutationFn: deleteInovationInitiativeById,
    onSuccess: () => {
      // Invalidate or refetch queries if needed
      queryClient.invalidateQueries({ queryKey: ["inovation-initiatives"] });
      toast.success("Iniciativa deletada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao deletar iniciativa. Tente novamente mais tarde.");
    },
  });

  const handleCardClick = (initiative: FullInovationInitiative) => {
    setSelectedInitiative(initiative);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setAreaFilter("all");
    setSemesterFilter("all");
    setSubAreaFilter("all");
    setOwnFilter("all");
    setFixedFilter("all");
  };

  const onAction = (action: string, data: FullInovationInitiative) => {
    switch (action) {
      case "pin":
        togglePin({ id: data.id, isFixed: data.isFixed });
        break;
      case "edit":
        // Lógica para editar
        //Abrir wizard com dados preenchidos
        setIsWizardOpen(true);
        setSelectedInitiative(data);
        break;
      case "review":
        setIsReviewMode(true);
        setIsWizardOpen(true);
        setSelectedInitiative(data);
        break;
      case "delete":
        setItemToDelete(data);
        break;
      default:
        break;
    }
  };

  // --- Lógica de Filtragem (Memoizada) ---
  const filteredInitiatives = useMemo(() => {
    if (!initiatives) return [];

    return initiatives.filter((item) => {
      // 0. Filtro de Aba (CRUCIAL PARA PAGINAÇÃO CORRETA)
      // Se não filtrarmos aqui, o totalPages conta itens de outras abas.
      if (item.type !== activeTab) {
        return false;
      }

      if (ownFilter === "Proprio") {
      return item.authorId === user!.id;
    }

      // 1. Busca por texto (Título)
      if (
        searchQuery &&
        !item.title.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 2. Filtro de Fixação
      if (fixedFilter !== "all") {
        if (fixedFilter === "Sim" && !item.isFixed) return false;
        if (fixedFilter === "Não" && item.isFixed) return false;
      }

      // 3. Filtro de Status (Com lógica de isReviewMode)
      const hasPrivilegedAccess = isManaging || isReviewMode;

      // Se NÃO for gerente/auditor e o filtro for "todos",
      // mostra apenas o que é público (Aprovado/Rodando)
      if (statusFilter === "all" && !hasPrivilegedAccess) {
        if (item.status !== "APPROVED" && item.status !== "RUNNING") {
          return false;
        }
      }

      // Se for gerente/auditor e filtro "todos", mostra tudo (incluindo PENDING/REJECTED).
      // Se tiver um filtro específico selecionado (ex: PENDING), respeita ele.
      if (statusFilter !== "all" && item.status !== statusFilter) return false;

      // 4. Filtro de Sub-Area
      if (
        subAreaFilter !== "all" &&
        !item.subAreas.some((a: any) => a === subAreaFilter)
      )
        return false;

      // 5. Filtro de Área
      if (
        areaFilter !== "all" &&
        !item.areas.some((a: any) => a === areaFilter)
      )
        return false;

      // 6. Filtro de Semestre
      if (semesterFilter !== "all" && item.semester?.name !== semesterFilter)
        return false;

      return true;
    });
  }, [
    user,
    initiatives,
    ownFilter,
    activeTab, // Adicionado às dependências
    searchQuery,
    fixedFilter,
    statusFilter,
    areaFilter,
    subAreaFilter,
    semesterFilter,
    isManaging,
    isReviewMode, // Adicionado às dependências
  ]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * Number(itemsPerPage);
    return filteredInitiatives.slice(
      startIndex,
      startIndex + Number(itemsPerPage)
    );
  }, [filteredInitiatives, currentPage, itemsPerPage]);

  const totalPages =
    Math.ceil(filteredInitiatives.length / Number(itemsPerPage)) || 1;

  const categories = [
    {
      id: InovationInitiativeType.Iniciativa,
      label: "Iniciativas",
      icon: Lightbulb,
    },
    { id: InovationInitiativeType.Pilula, label: "Pílulas", icon: Mic },
    {
      id: InovationInitiativeType.Nucleo,
      label: "Núcleo de Inovação",
      icon: Zap,
    },
    { id: InovationInitiativeType.Evento, label: "Eventos", icon: Rocket },
  ];

  const hasActiveFilters =
    searchQuery !== "" ||
    statusFilter !== "all" ||
    areaFilter !== "all" ||
    subAreaFilter !== "all" ||
    fixedFilter !== "all" ||
    semesterFilter !== "all" || 
    ownFilter !== "all";

  // Extrair opções únicas para os selects baseado nos dados (opcional, ou use estáticos)
  const semesterOptions = Array.from(
    new Set(initiatives?.map((i) => i.semester?.name).filter(Boolean))
  );
  // Adapte para pegar suas áreas reais do Enum ou do banco
  const areaOptions = AreaInovationInitiative
    ? Object.values(AreaInovationInitiative)
    : [];

  const subAreaOptions = SubAreaInovationInitiative
    ? Object.values(SubAreaInovationInitiative)
    : [];

  const statusOptions = useMemo(() => {
    return isManaging
      ? ["PENDING", "APPROVED", "RUNNING", "REJECTED"]
      : ["APPROVED", "RUNNING"];
  }, [isManaging]);

  return (
    <div className="p-4 space-y-8 min-h-screen">
      <CustomCard
        title="Inovação"
        type="introduction"
        icon={Lightbulb}
        value={initiatives?.length || 0}
        description="Espaço para promover a inovação da Casinha dos Sonhos e impulsionar o crescimento."
      />

      <div className="flex flex-col md:flex-row justify-end items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex md:flex-row flex-col gap-3 w-full md:w-auto">
          {/* Botão Gerenciar (Apenas Autorizados) */}
          {canManage && (
            <Button
              variant="outline"
              onClick={() => setIsManaging(!isManaging)}
              className={cn(
                "w-full md:w-auto border-blue-900/50 bg-[#0b1629] text-slate-300 hover:text-white hover:bg-blue-900/50 hover:border-blue-500/50 transition-all",
                isManaging && "bg-blue-900/50 border-[#0126fb] text-white"
              )}
            >
              {isManaging ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Settings className="mr-2 h-4 w-4" />
              )}
              {isManaging ? "Modo Gerenciar" : "Gerenciar"}
            </Button>
          )}

          {/* Botão Adicionar */}
          <Button
            onClick={() => setIsWizardOpen(true)}
            className="w-full md:w-auto bg-amber-400 hover:bg-amber-500 text-black font-bold shadow-[0_0_15px_rgba(251,191,36,0.3)] hover:shadow-[0_0_25px_rgba(251,191,36,0.5)] transition-all"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Iniciativa
          </Button>
        </div>
      </div>

      <div className="w-full">
        <Tabs
          value={activeTab}
          onValueChange={(value) =>
            setActiveTab(value as InovationInitiativeType)
          }
          className="w-full  rounded-lg py-2"
        >
          {/* Menu de Navegação */}
          <div className="flex justify-center items-center mb-8 w-full">
            <TabsList
              className="
                bg-[#010d26] 
                border border-blue-900/30
                p-2
                rounded-2xl
                flex flex-wrap
                items-start
                gap-2
                w-full
                max-w-3xl
                h-auto
              "
            >
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="rounded-full px-4 py-2 text-slate-400 whitespace-nowrap flex items-center justify-center data-[state=active]:bg-amber-400 data-[state=active]:text-black transition-all font-medium"
                >
                  <cat.icon size={16} className="mr-2" />
                  {cat.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {categories.map((cat) => {
            const catData = paginatedData.filter((i) => i.type === cat.id);
            const info = CATEGORY_INFO[cat.id];

            return (
              <TabsContent key={cat.id} value={cat.id} className="mt-0">
                <div className="bg-[#010d26] rounded-3xl border border-blue-900/20 p-8 min-h-[500px]">
                  {/* Header da Aba com Toolbar de Filtros Inserida */}
                  <div className="flex flex-col justify-center items-start gap-6 mb-8 border-b border-blue-900/20 pb-6">
                    <div className="max-w-2xl">
                      <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                        <cat.icon className="text-amber-400" />
                        {cat.label}{" "}
                        <span className="text-slate-500 text-lg font-normal">
                          - {info.description}
                        </span>
                      </h2>
                      <p className="text-slate-400 text-sm">
                        {info.subDescription}
                      </p>
                    </div>

                    {/* BARRA DE FILTROS */}
                    <div className="flex flex-col mt-3 lg:flex-row gap-3 w-full">
                      <div className="flex gap-2 w-full">
                        <div className="relative w-full flex items-center 2xl:w-100">
                          <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                            size={14}
                          />
                          <Input
                            placeholder="Pesquisar por nome..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
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
                        <div>
                          <h4 className="text-white font-semibold">Status:</h4>
                          <Select
                            value={statusFilter}
                            onValueChange={setStatusFilter}
                          >
                            <SelectTrigger className="w-[110px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
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

                        <div>
                          <h4 className="text-white font-semibold">Pessoal:</h4>
                          <Select
                            value={ownFilter}
                            onValueChange={setOwnFilter}
                          >
                            <SelectTrigger className="w-[110px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                              <div className="flex items-center gap-2">
                                <Filter size={10} className="text-amber-400" />
                                <SelectValue placeholder="Status" />
                              </div>
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                              <SelectItem value="all">Todos</SelectItem>
                              <SelectItem value="Proprio">Próprio</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <h4 className="text-white font-semibold">Área:</h4>
                          <Select
                            value={areaFilter}
                            onValueChange={setAreaFilter}
                          >
                            <SelectTrigger className="w-[110px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                              <SelectValue placeholder="Área" />
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
                          <h4 className="text-white font-semibold">Subárea:</h4>
                          <Select
                            value={subAreaFilter}
                            onValueChange={setSubAreaFilter}
                          >
                            <SelectTrigger className="w-[110px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                              <SelectValue placeholder="Área" />
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
                          <h4 className="text-white font-semibold">
                            Semestre:
                          </h4>
                          <Select
                            value={semesterFilter}
                            onValueChange={setSemesterFilter}
                          >
                            <SelectTrigger className="w-[110px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                              <SelectValue placeholder="Semestre" />
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

                        <div>
                          <h4 className="text-white font-semibold">Fixado:</h4>
                          <Select
                            value={fixedFilter}
                            onValueChange={setFixedFilter}
                          >
                            <SelectTrigger className="w-[110px] bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                              <SelectValue placeholder="Semestre" />
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

                        <div>
                          <h4 className="text-white font-semibold">Itens:</h4>
                          <Select
                            value={itemsPerPage}
                            onValueChange={setItemsPerPage}
                          >
                            <SelectTrigger className="w-fit bg-[#020817] border-blue-900/30 text-slate-300 h-8 text-xs">
                              <SelectValue
                                placeholder={`${itemsPerPage} itens por página`}
                              />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0b1629] border-blue-900/30 text-slate-200">
                              {Array.from(
                                { length: 5 },
                                (_, i) => (i + 1) * 4
                              ).map((num) => (
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

                  {/* Grid de Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {catData.map((initiative) => (
                      <InnovationCard
                        key={initiative.id}
                        data={initiative}
                        isManaging={isManaging}
                        onAction={(action, data) => onAction(action, data)}
                        userId={user!.id}
                        onClick={() => handleCardClick(initiative)}
                      />
                    ))}

                    {/* Estado Vazio caso não tenha itens */}
                    {catData.length === 0 && (
                      <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                        <LayoutGrid size={48} className="mb-4 opacity-20" />
                        <p>
                          {hasActiveFilters
                            ? "Nenhuma iniciativa encontrada com esses filtros."
                            : "Nenhuma iniciativa encontrada nesta categoria."}
                        </p>
                        {hasActiveFilters && (
                          <Button
                            variant="link"
                            onClick={clearFilters}
                            className="text-amber-400 mt-2 h-auto p-0"
                          >
                            Limpar filtros
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </Tabs>
      </div>

      <InnovationModal
        data={selectedInitiative}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedInitiative(null);
        }}
      />

      <InitiativeWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          // Reseta estados auxiliares ao fechar
          setTimeout(() => {
            setSelectedInitiative(null);
            setIsReviewMode(false);
          }, 300);
        }}
        dataToEdit={selectedInitiative} // Passa a iniciativa selecionada para edição/auditoria
        isAuditMode={isReviewMode}
      />

      {itemToDelete && (
        <ModalConfirm
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => deleteInitiative(itemToDelete.id)}
          open={!!itemToDelete}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

export default InovationContent;
