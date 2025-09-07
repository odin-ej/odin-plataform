/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import CustomCard from "../../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import { TagAreas } from "@prisma/client";
import { JrPointIconBlue } from "../../Global/JrPointsIcon";
import React, { useMemo, useState } from "react";
import AdminActionsModal, { getLabelForArea } from "./AdminActionsModal";
import {
  ActionTypeWithCount,
  EnterpriseInfo,
  TagTemplateWithAction,
  UserRankingInfo,
} from "@/lib/schemas/pointsSchema";
import UserTagsModal from "./UserTagsModal";
import CustomModal, { FieldConfig } from "../../Global/Custom/CustomModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Plus, CheckCircle, X, Building } from "lucide-react";
import { toast } from "sonner";
import { useForm, UseFormReturn } from "react-hook-form";
import ModalConfirm from "../../Global/ModalConfirm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { exportToExcel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { JrEnterprisePointsPageData } from "@/app/(dashboard)/gerenciar-jr-points/page";
import DataManagementPanel from "./DataManagementPanel";
import SolicitationsBoard from "./SolicitationsBoard";
import RequestReviewModal from "./RequestViewModal";
import { format } from "date-fns";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export type GenericSnapshot = {
  id: string;
  semester: string;
  totalPoints: number; // Campo unificado para a pontuação
  targetId: string; // 'enterprise-points-id' ou o ID do usuário
};

// --- COMPONENTE PRINCIPAL DA PÁGINA ---
const EnterprisePageContent = ({
  initialData,
}: {
  initialData: JrEnterprisePointsPageData;
}) => {
  const queryClient = useQueryClient();
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isUserTagsModalOpen, setIsUserTagsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // Unifica modais de criação
  const [modalType, setModalType] = useState<"version" | "semester" | null>(
    null
  );
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [reviewingRequest, setReviewingRequest] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<UserRankingInfo | EnterpriseInfo | null>(
    null
  );
  const [itemToDelete, setItemToDelete] = useState<{
    type: "tag-template" | "action-type" | "version" | "snapshot" | "semester";
    id: string;
  } | null>(null);
  const [confirmationAction, setConfirmationAction] = useState<{
    action: () => void;
    title: string;
    description: string;
  } | null>(null);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      baseValue: 0,
      actionTypeId: "",
      areas: [],
      isScalable: false,
      escalationValue: undefined,
      escalationStreakDays: undefined,
      escalationCondition: "",
      versionName: "",
      implementationDate: "",
      endDate: "",
    },
  });

  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["enterprisePointsData"],
    queryFn: async (): Promise<JrEnterprisePointsPageData> => {
      const { data } = await axios.get(`${API_URL}/api/jr-points/management`);
      return data;
    },
    initialData: initialData,
  });

  const { mutate: editItem, isPending: isEditingItem } = useMutation({
    mutationFn: async (formData: any) => {
      const dataToSend = { ...formData };
      if (
        dataToSend.escalationValue === "" ||
        dataToSend.escalationValue === null
      )
        dataToSend.escalationValue = undefined;
      if (
        dataToSend.escalationStreakDays === "" ||
        dataToSend.escalationStreakDays === null
      )
        dataToSend.escalationStreakDays = undefined;
      const endpoint = `${API_URL}/api/jr-points/${editingItem.type}s/${editingItem.id}`;
      return axios.patch(endpoint, dataToSend);
    },
    onSuccess: () => {
      toast.success("Item atualizado com sucesso!");
      setIsEditModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao Atualizar", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: deleteItem, isPending: isDeletingItem } = useMutation({
    mutationFn: (item: { type: string; id: string }) =>
      axios.delete(`${API_URL}/api/jr-points/${item.type}s/${item.id}`),
    onSuccess: () => {
      toast.success("Item apagado!");
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao apagar", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: importMutation } = useMutation({
    mutationFn: (data: any[]) =>
      axios.post(`${API_URL}/api/jr-points/tags/import`, data),
    onSuccess: () => {
      toast.success("Dados importados!");
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro na importação", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: createSemesterMutation, isPending: isCreatingSemester } =
    useMutation({
      mutationFn: (data: any) =>
        axios.post(`${API_URL}/api/jr-points/semesters`, data),
      onSuccess: () => {
        toast.success("Novo semestre criado!");
        setIsCreateModalOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
      },
      onError: (error: any) =>
        toast.error("Erro ao criar semestre", {
          description: error.response?.data?.message,
        }),
    });

  const { mutate: toggleSemesterMutation } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch(`${API_URL}/api/jr-points/semesters/${id}`, { isActive }),
    onSuccess: () => {
      toast.success("Status do semestre atualizado!");
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao atualizar semestre", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: snapshotMutation, isPending: isTakingSnapshot } = useMutation(
    {
      mutationFn: (semesterId: string) =>
        axios.post(`${API_URL}/api/jr-points/snapshots`, { semesterId }), // Enviando o ID
      onSuccess: () => {
        toast.success("Snapshot salvo!");
        setConfirmationAction(null);
        queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
      },
      onError: (error: any) => {
        toast.error("Erro ao salvar snapshot", {
          description: error.response?.data?.message,
        });
        setConfirmationAction(null);
      },
    }
  );

  const { mutate: toggleVersionMutation } = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      axios.patch(`${API_URL}/api/jr-points/versions/${id}/toggle-version`, {
        isActive,
      }),
    onSuccess: () => {
      toast.success("Status da versão atualizado!");
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao atualizar versão", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: createVersionMutation, isPending: isCreatingVersion } =
    useMutation({
      mutationFn: (data: any) =>
        axios.post(`${API_URL}/api/jr-points/versions`, data),
      onSuccess: () => {
        toast.success("Nova versão criada!");
        setIsCreateModalOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
      },
      onError: (error: any) =>
        toast.error("Erro ao criar versão", {
          description: error.response?.data?.message,
        }),
    });

  const { mutate: reviewRequestMutation, isPending: isReviewing } = useMutation(
    {
      mutationFn: ({
        id,
        type,
        status,
        directorsNotes,
        newValue,
        newDescription,
      }: {
        id: string;
        type: string;
        status: string;
        directorsNotes: string;
        newValue?: number;
        newDescription?: string;
      }) =>
        axios.patch(`${API_URL}/api/jr-points/${type}s/${id}/approve`, {
          status,
          directorsNotes,
          newValue,
          newDescription,
        }),
      onSuccess: () => {
        toast.success("Status atualizado!");
        setIsReviewModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
      },
      onError: (error: any) =>
        toast.error("Erro ao atualizar status", {
          description: error.response?.data?.message,
        }),
    }
  );

  const handleOpenEditModal = (
    item: any,
    type: "tag-template" | "action-type" | "version" | "semester"
  ) => {
    form.reset(item); // Preenche o formulário com os dados do item
    setEditingItem({ ...item, type });
    // Reutiliza o mesmo modal de criação/edição para versões e semestres
    if (type === "version" || type === "semester") {
      if (type === "version") {
        form.reset({
          ...item,
          implementationDate: item.implementationDate
            ? format(item.implementationDate, "yyyy-MM-dd")
            : "",
          endDate: item.endDate ? format(item.endDate, "yyyy-MM-dd") : "",
        });
      }
      if (type === "semester") {
        form.reset({
          ...item,
          startDate: item.startDate ? format(item.startDate, "yyyy-MM-dd") : "",
          endDate: item.endDate ? format(item.endDate, "yyyy-MM-dd") : "",
        });
      }
      setModalType(type);
      setIsCreateModalOpen(true);
    } else {
      setIsEditModalOpen(true); // Modal genérico para tag-template e action-type
    }
  };

  const handleExport = (exportFn: () => void, title: string) => {
    setConfirmationAction({
      action: exportFn,
      title: `Confirmar Exportação`,
      description: `Deseja realmente exportar a tabela de ${title}?`,
    });
  };

  const handleSnapshot = (semesterId: string) => {
    setConfirmationAction({
      action: () => snapshotMutation(semesterId),
      title: "Confirmar Criação de Snapshot",
      description:
        "Esta ação criará uma cópia de segurança do JR Points atual e reiniciará ele por completo. Não pode ser desfeita. Você realmente deseja fazer isso?",
    });
  };

  const handleOpenReviewModal = (item: any) => {
    setReviewingRequest(item);
    setIsReviewModalOpen(true);
  };

  const {
    enterprisePoints,
    usersRanking,
    allUsers,
    allTagTemplates,
    allActionTypes,
    allVersions,
    usersSemesterScore,
    enterpriseSemesterScores,
    solicitations,
    jrPointsReports,
    allSemesters,
  } = data!;

  const tagColumns: ColumnDef<TagTemplateWithAction>[] = [
    { accessorKey: "name", header: "Nome do Modelo" },
    {
      accessorKey: "actionType",
      header: "Tipo",
      cell: (row) => row.actionType?.name || "N/A",
    },
    { accessorKey: "baseValue", header: "Pontos", className: "text-center" },
    {
      accessorKey: "isScalable",
      header: "Escalonável?",
      cell: (row) =>
        row.isScalable ? (
          <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
        ) : (
          <X className="h-5 w-5 text-gray-500 mx-auto" />
        ),
      className: "text-center",
    },
    {
      accessorKey: "areas",
      header: "Áreas",
      cell: (row) => (
        <div className="flex gap-1 flex-wrap justify-center">
          {row.areas.map((area) => (
            <Badge
              key={area}
              className="bg-[#0126fb] text-white hover:bg-[#0126fb]/80 hover:text-white transition-colors"
            >
              {getLabelForArea(area)}
            </Badge>
          ))}
        </div>
      ),
    },
  ];

  const rankingColumns: ColumnDef<UserRankingInfo | EnterpriseInfo>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.imageUrl ?? undefined} />
            <AvatarFallback>
              {" "}
              {row.id === "enterprise-points-id" ? (
                <Building size={16} />
              ) : (
                row.name.substring(0, 2)
              )}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "tagsCount",
      header: "Tags Totais Recebidas",
      className: "text-center",
    },
    {
      accessorKey: "totalPoints",
      header: "Pontos Atuais",
      className: "text-right text-[#f5b719] font-bold",
    },
  ];

  const actionTypesColumns: ColumnDef<ActionTypeWithCount>[] = [
    { accessorKey: "id", header: "ID" },
    { accessorKey: "name", header: "Nome da Ação" },
    {
      accessorKey: "_count",
      header: "Nº de Modelos",
      cell: (row) => row._count?.tagTemplates ?? 0,
      className: "text-center",
    },
  ];

  const getFieldsForType = (
    type: "tag-template" | "action-type",
    formInstance: UseFormReturn<any>
  ): FieldConfig<any>[] => {
    const isScalable = formInstance.watch("isScalable");
    if (type === "tag-template") {
      const fields: FieldConfig<any>[] = [
        { accessorKey: "name", header: "Nome do Modelo", type: "text" },
        { accessorKey: "description", header: "Descrição", type: "textarea" },
        { accessorKey: "baseValue", header: "Pontuação Base" },
        {
          accessorKey: "actionTypeId",
          header: "Tipo de Ação",
          type: "select",
          options: allActionTypes.map((at) => ({
            value: at.id,
            label: at.name,
          })),
        },
        {
          accessorKey: "areas",
          header: "Áreas",
          type: "checkbox",
          options: Object.values(TagAreas).map((area) => ({
            value: area,
            label: getLabelForArea(area),
          })),
        },
        {
          accessorKey: "isScalable",
          header: "É Escalonável?",
          type: "boolean",
        },
      ];
      if (isScalable) {
        fields.push(
          { accessorKey: "escalationValue", header: "Valor do Bônus/Pena" },
          {
            accessorKey: "escalationStreakDays",
            header: "Prazo do Streak (dias)",
          },
          {
            accessorKey: "escalationCondition",
            header: "Descrição da Regra",
            type: "textarea",
          }
        );
      }
      return fields;
    }
    return [
      { accessorKey: "name", header: "Nome da Categoria", type: "text" },
      {
        accessorKey: "description",
        header: "Descrição da Categoria",
        type: "textarea",
      },
    ];
  };

  const versionFields: FieldConfig<any>[] = [
    { accessorKey: "versionName", header: "Nome da Versão (Ex: 2025.2)" },
    { accessorKey: "description", header: "Descrição", type: "textarea" },
    {
      accessorKey: "implementationDate",
      header: "Data de Início",
      type: "date",
    },
    { accessorKey: "endDate", header: "Data de Fim", type: "date" },
  ];

  const semesterFields: FieldConfig<any>[] = [
    { accessorKey: "name", header: "Nome do Semestre (Ex: 2025.2)" },
    { accessorKey: "startDate", header: "Data de Início", type: "date" },
    { accessorKey: "endDate", header: "Data de Fim", type: "date" },
  ];

  const activeTagTemplates = useMemo(() => {
    if (!allTagTemplates) return [];
    // O '?' (optional chaining) previne erros se um template antigo não tiver versão
    return allTagTemplates.filter(
      (template) => template.jrPointsVersion?.isActive === true
    );
  }, [allTagTemplates]);

 const { usersRankingWithEnterprise, allSnapshots } = useMemo(() => {
    // 1. Cria o objeto "fake" para a empresa
    const enterpriseInfo: EnterpriseInfo = {
      id: "enterprise-points-id",
      name: "Pontuação da Empresa",
      totalPoints: enterprisePoints?.value  ?? 0,
      tagsCount: enterprisePoints?.tags.length  ?? 0, 
      imageUrl: "/logo-amarela.png", 
    };
    
    // 2. Cria o ranking combinado
    const sortedUserRanking = [...(usersRanking || [])].sort((a, b) => b.totalPoints - a.totalPoints);
    const combinedRanking = [enterpriseInfo, ...sortedUserRanking];

    // 3. Formata e combina os snapshots
    const userSnapshotsFormatted = (usersSemesterScore || []).map(s => ({
      id: s.id,
      semester: s.semester,
      totalPoints: s.totalPoints,
      targetId: s.userId,
    }));

    const enterpriseSnapshotsFormatted = (enterpriseSemesterScores || []).map(s => ({
      id: s.id,
      semester: s.semester,
      totalPoints: s.value, // <-- A MÁGICA: renomeia 'value' para 'totalPoints'
      targetId: 'enterprise-points-id',
    }));

    return {
      usersRankingWithEnterprise: combinedRanking,
      allSnapshots: [...userSnapshotsFormatted, ...enterpriseSnapshotsFormatted],
    };
  }, [usersRanking, enterprisePoints, usersSemesterScore, enterpriseSemesterScores]);

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }
  return (
    <>
      <CustomCard
        value={0}
        type="introduction"
        title="Controle do JR Points"
        description="Controle todo o funcionamento do JR-Points, gerenciando pontuação, ações, modelos e categorias."
        icon={JrPointIconBlue}
        className="mt-6"
      />
      <div className="grid grid-cols-1 lg:gap-6 lg:grid-cols-2">
        <CustomCard
          type="link"
          title="Pontuação da Empresa"
          value={enterprisePoints?.value ?? 0}
          icon={JrPointIconBlue}
          className="mt-6"
        />
        <CustomCard
          type="link"
          title="Total de Pontos Sócios(as)"
          value={usersRanking.reduce((acc, user) => acc + user.totalPoints, 0)}
          icon={JrPointIconBlue}
          className="mt-6"
        />
      </div>

      <div className="mt-6 flex justify-end">
        <Button
          onClick={() => setIsActionsModalOpen(true)}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80"
        >
          <Plus className="mr-2 h-4 w-4" /> Gerir Pontos e Ações
        </Button>
      </div>

      <DataManagementPanel
        isDisabled={isDeletingItem}
        onEditVersion={(version: any) =>
          handleOpenEditModal(version, "version")
        }
        onImport={importMutation}
        setItemToDelete={setItemToDelete}
        semesters={allSemesters}
        onSnapshot={handleSnapshot} // Passa a função que abre a confirmação
        onCreateSemester={() => {
          setEditingItem(null); // Limpa o item em edição para garantir o modo de criação
          setModalType("semester"); // Define o TIPO para semestre
          setIsCreateModalOpen(true); // ABRE o modal
        }}
        // ... outras props
        onCreateVersion={() => {
          setEditingItem(null); // Limpa o item em edição para garantir o modo de criação
          setModalType("version"); // Define o TIPO para versão
          setIsCreateModalOpen(true); // ABRE o modal
        }}
        onSemesterToggle={toggleSemesterMutation}
        onEditSemester={(semester: any) =>
          handleOpenEditModal(semester, "semester")
        }
        versions={allVersions}
        onVersionToggle={toggleVersionMutation}
        onExportTemplate={() =>
          handleExport(
            () =>
              exportToExcel(
                [
                  {
                    name: "Exemplo",
                    description: "...",
                    baseValue: 10,
                    actionTypeId: "ID",
                    isScalable: true,
                    escalationValue: 5,
                    escalationStreakDays: 7,
                    escalationCondition: "A cada semana",
                    areas: "GERAL",
                  },
                ],
                "modelo_importacao_tags"
              ),
            "Modelo de Tags"
          )
        }
        snapshots={usersSemesterScore}
      />

      <SolicitationsBoard
        solicitations={solicitations}
        reports={jrPointsReports}
        allTagTemplates={allTagTemplates}
        onCardClick={handleOpenReviewModal}
      />

      <div className="grid grid-cols-1 gap-6 mt-4">
        <CustomTable<UserRankingInfo | EnterpriseInfo>
          title="Pontuação dos Membros"
          columns={rankingColumns}
          data={usersRankingWithEnterprise}
          filterColumns={["name"]}
          onRowClick={(user) => {
            setSelectedUser(user);
            setIsUserTagsModalOpen(true);
          }}
          onExportClick={() =>
            handleExport(
              () => exportToExcel(usersRanking, "ranking_membros"),
              "Ranking de Membros"
            )
          }
          itemsPerPage={15}
          type="onlyView"
        />
        <CustomTable<TagTemplateWithAction>
          title="Tags Gerais (Modelos)"
          columns={tagColumns}
          data={allTagTemplates}
          filterColumns={["name", "description"]}
          onEdit={(item) => handleOpenEditModal(item, "tag-template")}
          onDelete={(item) =>
            setItemToDelete({ type: "tag-template", id: item.id })
          }
          onExportClick={() =>
            handleExport(
              () => exportToExcel(allTagTemplates, "modelos_tags"),
              "Modelos de Tags"
            )
          }
          type="noSelection"
        />
        <CustomTable<ActionTypeWithCount>
          title="Tipos de Ações"
          columns={actionTypesColumns}
          data={allActionTypes}
          filterColumns={["name"]}
          onEdit={(item) => handleOpenEditModal(item, "action-type")}
          onDelete={(item) =>
            setItemToDelete({ type: "action-type", id: item.id })
          }
          onExportClick={() =>
            handleExport(
              () => exportToExcel(allActionTypes, "tipos_acoes"),
              "Tipos de Ações"
            )
          }
          type="noSelection"
        />
      </div>

      {/* Modais */}
      <AdminActionsModal
        isOpen={isActionsModalOpen}
        onClose={() => setIsActionsModalOpen(false)}
        allActionTypes={allActionTypes}
        allUsers={allUsers}
        allTagTemplates={activeTagTemplates}
      />
      <UserTagsModal
        isOpen={isUserTagsModalOpen}
        onClose={() => setIsUserTagsModalOpen(false)}
        target={selectedUser}
        snapshots={allSnapshots}
        allTagTemplates={allTagTemplates}
      />

      {editingItem && (
        <CustomModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          form={form}
          onSubmit={(data) => editItem(data)}
          fields={getFieldsForType(editingItem.type, form)}
          title={`Editar ${editingItem.type === "tag-template" ? "Modelo de Tag" : "Tipo de Ação"}`}
          isEditing={true}
          isLoading={isEditingItem}
          setIsEditing={() => {}}
        />
      )}

      <CustomModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingItem(null);
          form.reset();
        }}
        form={form}
        onSubmit={
          editingItem
            ? (data) => editItem(data)
            : modalType === "version"
              ? createVersionMutation
              : createSemesterMutation
        }
        fields={modalType === "version" ? versionFields : semesterFields}
        title={
          editingItem
            ? `Editar ${modalType === "version" ? "Versão" : "Semestre"}`
            : `Criar Nov${modalType === "version" ? "a Versão" : "o Semestre"}`
        }
        isEditing={true} // Sempre em modo de edição de campos
        isLoading={isCreatingVersion || isCreatingSemester || isEditingItem}
        setIsEditing={() => {}}
      />

      <RequestReviewModal
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
        request={reviewingRequest}
        onReview={reviewRequestMutation}
        isReviewing={isReviewing}
      />

      {itemToDelete && (
        <ModalConfirm
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => deleteItem(itemToDelete)}
          isLoading={isDeletingItem}
        />
      )}
      {confirmationAction && (
        <ModalConfirm
          open={!!confirmationAction}
          onCancel={() => setConfirmationAction(null)}
          onConfirm={confirmationAction.action}
          title={confirmationAction.title}
          description={confirmationAction.description}
          isLoading={isTakingSnapshot}
        />
      )}
    </>
  );
};

export default EnterprisePageContent;
