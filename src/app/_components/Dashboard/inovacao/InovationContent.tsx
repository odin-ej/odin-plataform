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
import { Button } from "@/components/ui/button";
import { InitiativeWizard } from "./InitiativeWizard";
import { checkUserPermission, cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import { INOVATION_LEADERS } from "@/lib/permissions";
import Pagination from "../../Global/Custom/Pagination";
import ModalConfirm from "../../Global/ModalConfirm";
import { toast } from "sonner";
import InovationFilters from "./InovationFilters";

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
  const [myInitiativesFilter, setMyInitiativesFilter] = useState<
    Record<string, any>
  >({
    searchQuery: "",
    statusFilter: "all",
    areaFilter: "all",
    semesterFilter: "all",
    subAreaFilter: "all",
  });
  const [enterpriseInitiativesFilter, setEnterpriseInitiativesFilter] =
    useState<Record<string, any>>({
      searchQuery: "",
      statusFilter: "all",
      areaFilter: "all",
      semesterFilter: "all",
      subAreaFilter: "all",
      fixedFilter: "all",
      memberFilter: "all",
    });
  const [isWizardOpen, setIsWizardOpen] = useState(false); // Novo State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState("4");
  const [myCurrentPage, setMyCurrentPage] = useState(1);
  const [myItemsPerPage, setMyItemsPerPage] = useState("4");
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
      setItemToDelete(null);
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
    setEnterpriseInitiativesFilter({
      searchQuery: "",
      statusFilter: "all",
      areaFilter: "all",
      semesterFilter: "all",
      subAreaFilter: "all",
      fixedFilter: "all",
      memberFilter: "all",
    });
  };

  const clearMyFilters = () => {
    setMyInitiativesFilter({
      searchQuery: "",
      statusFilter: "all",
      areaFilter: "all",
      semesterFilter: "all",
      subAreaFilter: "all",
    });
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

  // --- Lógica de Filtragem Memorizdas das Minhas inicitivas

  const myFilteredInitiatives = useMemo(() => {
    if (!initiatives) return [];

    return initiatives.filter((item) => {
      if (item.type !== activeTab) {
        return false;
      }

      if (item.authorId !== user?.id) return false; // Excluir minhas iniciativas

      // 1. Busca por texto (Título)
      if (
        myInitiativesFilter.searchQuery &&
        !item.title.toLowerCase().includes(myInitiativesFilter.searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Se for gerente/auditor e filtro "todos", mostra tudo (incluindo PENDING/REJECTED).
      // Se tiver um filtro específico selecionado (ex: PENDING), respeita ele.
      if (
        myInitiativesFilter.statusFilter !== "all" &&
        item.status !== myInitiativesFilter.statusFilter
      )
        return false;

      // 4. Filtro de Sub-Area
      if (
        myInitiativesFilter.subAreaFilter !== "all" &&
        !item.subAreas.some((a: any) => a === myInitiativesFilter.subAreaFilter)
      )
        return false;

      // 5. Filtro de Área
      if (
        myInitiativesFilter.areaFilter !== "all" &&
        !item.areas.some((a: any) => a === myInitiativesFilter.areaFilter)
      )
        return false;

      // 6. Filtro de Semestre
      if (
        myInitiativesFilter.semesterFilter !== "all" &&
        item.semester?.name !== myInitiativesFilter.semesterFilter
      )
        return false;

      return true;
    });
  }, [
    user,
    initiatives,
    activeTab, // Adicionado às dependências
    myInitiativesFilter,
  ]);

  // --- Lógica de Filtragem (Memorizada) ---
  const filteredInitiatives = useMemo(() => {
    if (!initiatives) return [];

    return initiatives.filter((item) => {
      if (item.type !== activeTab) {
        return false;
      }

      if (item.authorId === user?.id) return false; // Excluir minhas iniciativas

      // 1. Busca por texto (Título)
      if (
        enterpriseInitiativesFilter.searchQuery &&
        !item.title.toLowerCase().includes(enterpriseInitiativesFilter.searchQuery.toLowerCase())
      ) {
        return false;
      }

      // 2. Filtro de Fixação
      if (enterpriseInitiativesFilter.fixedFilter !== "all") {
        if (enterpriseInitiativesFilter.fixedFilter === "Sim" && !item.isFixed)
          return false;
        if (enterpriseInitiativesFilter.fixedFilter === "Não" && item.isFixed)
          return false;
      }

      // 3. Filtro de Status (Com lógica de isReviewMode)
      const hasPrivilegedAccess = isManaging || isReviewMode;

      // Se NÃO for gerente/auditor e o filtro for "todos",
      // mostra apenas o que é público (Aprovado/Rodando)
      if (
        enterpriseInitiativesFilter.statusFilter === "all" &&
        !hasPrivilegedAccess
      ) {
        if (item.status !== "APPROVED" && item.status !== "RUNNING") {
          return false;
        }
      }

      // Se for gerente/auditor e filtro "todos", mostra tudo (incluindo PENDING/REJECTED).
      // Se tiver um filtro específico selecionado (ex: PENDING), respeita ele.
      if (
        enterpriseInitiativesFilter.statusFilter !== "all" &&
        item.status !== enterpriseInitiativesFilter.statusFilter
      )
        return false;

      // 4. Filtro de Sub-Area
      if (
        enterpriseInitiativesFilter.subAreaFilter !== "all" &&
        !item.subAreas.some(
          (a: any) => a === enterpriseInitiativesFilter.subAreaFilter
        )
      )
        return false;

      // 5. Filtro de Área
      if (
        enterpriseInitiativesFilter.areaFilter !== "all" &&
        !item.areas.some((a: any) => a === enterpriseInitiativesFilter.areaFilter)
      )
        return false;

      // 6. Filtro de Semestre
      if (enterpriseInitiativesFilter.semesterFilter !== "all" && item.semester?.name !== enterpriseInitiativesFilter.semesterFilter)
        return false;

      return true;
    });
  }, [
    user,
    initiatives,
    activeTab, // Adicionado às dependências
    enterpriseInitiativesFilter,
    isManaging,
    isReviewMode, // Adicionado às dependências
  ]);

  const myPaginatedData = useMemo(() => {
    const startIndex = (myCurrentPage - 1) * Number(myItemsPerPage);
    return myFilteredInitiatives.slice(
      startIndex,
      startIndex + Number(myItemsPerPage)
    );
  }, [myFilteredInitiatives, myCurrentPage, myItemsPerPage]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * Number(itemsPerPage);
    return filteredInitiatives.slice(
      startIndex,
      startIndex + Number(itemsPerPage)
    );
  }, [filteredInitiatives, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    const enterprise = Math.ceil(
      filteredInitiatives.length / Number(itemsPerPage)
    );
    const user = Math.ceil(
      myFilteredInitiatives.length / Number(myItemsPerPage)
    );

    return { enterprise, user };
  }, [
    filteredInitiatives,
    myFilteredInitiatives,
    itemsPerPage,
    myItemsPerPage,
  ]);

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
    enterpriseInitiativesFilter.searchQuery !== "" ||
    enterpriseInitiativesFilter.statusFilter !== "all" ||
    enterpriseInitiativesFilter.areaFilter !== "all" ||
    enterpriseInitiativesFilter.subAreaFilter !== "all" ||
    enterpriseInitiativesFilter.fixedFilter !== "all" ||
    enterpriseInitiativesFilter.semesterFilter !== "all" ||
    enterpriseInitiativesFilter.memberFilter !== "all";
  const hasMyActiveFilters =
    myInitiativesFilter.searchQuery !== "" ||
    myInitiativesFilter.statusFilter !== "all" ||
    myInitiativesFilter.areaFilter !== "all" ||
    myInitiativesFilter.subAreaFilter !== "all" ||
    myInitiativesFilter.semesterFilter !== "all";

  // Extrair opções únicas para os selects baseado nos dados (opcional, ou use estáticos)
  const semesterOptions = Array.from(
    new Set(initiatives?.filter((i) => i.status === "APPROVED" || i.status === "RUNNING").map((i) => i.semester?.name).filter(Boolean))
  );

  const memberOptions = Array.from(
    new Set(initiatives?.filter((i) => i.status === "APPROVED" || i.status === "RUNNING").map((i) => i.author.name).filter(Boolean))
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
            const myCatData = myPaginatedData.filter((i) => i.type === cat.id);
            const info = CATEGORY_INFO[cat.id];

            return (
              <TabsContent key={cat.id} value={cat.id} className="mt-0">
                <div className="bg-[#010d26] rounded-3xl border border-blue-900/20 p-8 min-h-[500px]">
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

                  {/* Minhas Iniciativas */}
                  <div>
                    {/* Header da Aba com Toolbar de Filtros Inserida */}
                    <InovationFilters
                      
                      label={cat.label}
                     
                      areaOptions={areaOptions}
                      subAreaOptions={subAreaOptions}
                      semesterOptions={semesterOptions}
                      itemsPerPage={myItemsPerPage}
                      setItemsPerPage={setMyItemsPerPage}
                      statusOptions={[
                        "PENDING",
                        "RUNNING",
                        "APPROVED",
                        "REJECTED",
                      ]}
                      type="my"
                      initiativesFilter={myInitiativesFilter}
                      setInitiativesFilter={setMyInitiativesFilter}
                      hasActiveFilters={hasMyActiveFilters}
                      clearFilters={clearMyFilters}
                    />

                    {/* Grid de Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
                      {myCatData.map((initiative) => (
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
                      {myCatData.length === 0 && (
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

                    <Pagination
                      currentPage={myCurrentPage}
                      totalPages={totalPages.user}
                      onPageChange={setMyCurrentPage}
                    />
                  </div>

                  {/* Iniciativas da Casinha */}
                  <div className="mt-8">
                    <InovationFilters
                      label={cat.label}
                      areaOptions={areaOptions}
                      subAreaOptions={subAreaOptions}
                      semesterOptions={semesterOptions}
                      itemsPerPage={itemsPerPage}
                      setItemsPerPage={setItemsPerPage}
                      statusOptions={statusOptions}
                      type="all"
                      initiativesFilter={enterpriseInitiativesFilter}
                      setInitiativesFilter={setEnterpriseInitiativesFilter}
                      hasActiveFilters={hasActiveFilters}
                      clearFilters={clearFilters}
                      memberOptions={memberOptions}
                    />

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
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages.enterprise}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                </div>
              </TabsContent>
            );
          })}
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
