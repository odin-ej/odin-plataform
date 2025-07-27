/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { Tag, User, ActionType } from "@prisma/client";
import { JrPointIconBlue } from "../Global/JrPointsIcon";
import { useState } from "react";
import AdminActionsModal from "./AdminActionsModal";

import {
  ActionTypeWithCount,
  TagWithAction,
  UserRankingInfo,
} from "@/lib/schemas/pointsSchema";
import UserTagsModal from "./UserTagsModal";
import CustomModal from "../Global/Custom/CustomModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import ModalConfirm from "../Global/ModalConfirm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { JrEnterprisePointsPageData } from "@/app/(dashboard)/jr-points/nossa-empresa/page";
import axios from "axios";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const EnterprisePageContent = ({
  initialData,
}: {
  initialData: JrEnterprisePointsPageData;
}) => {
  const queryClient = useQueryClient();
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isUserTagsModalOpen, setIsUserTagsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<UserRankingInfo | null>(
    null
  );
  const [itemToDelete, setItemToDelete] = useState<{
    type: "tag" | "action-type";
    id: string;
  } | null>(null);

  const form = useForm(); // Formulário genérico para o modal de edição
  const { user } = useAuth();

  const isDirector = checkUserPermission(user, DIRECTORS_ONLY);

  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["enterprisePointsData"],
    queryFn: async (): Promise<JrEnterprisePointsPageData> => {
      const { data } = await axios.get(`${API_URL}/api/jr-points`);
      return data;
    },
    initialData: initialData,
  });

  const { mutate: editItem, isPending: isEditingItem } = useMutation({
    mutationFn: async (formData: any) => {
      const endpoint = `${API_URL}/${editingItem.type}s/${editingItem.id}`;
      return axios.patch(endpoint, formData);
    },
    onSuccess: () => {
      toast.success("Item atualizado com sucesso!");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao Atualizar", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: deleteItem, isPending: isDeletingItem } = useMutation({
    mutationFn: (item: { type: "tag" | "action-type"; id: string }) => {
      return axios.delete(`${API_URL}/${item.type}s/${item.id}`);
    },
    onSuccess: () => {
      toast.success("Item apagado com sucesso!");
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao apagar", {
        description: error.response?.data?.message,
      }),
  });

  const handleEditSubmit = (formData: any) => editItem(formData);
  const handleDeleteConfirm = () => itemToDelete && deleteItem(itemToDelete);

  const handleOpenEditModal = (
    item: Tag | ActionType,
    type: "tag" | "action-type"
  ) => {
    form.reset(item);
    setEditingItem({ ...item, type });
    setIsEditModalOpen(true);
  };

  const {
    enterprisePoints,
    enterpriseTags,
    usersRanking,
    allUsers,
    allTags,
    allActionTypes,
  } = data!;

  const tagColumns: ColumnDef<TagWithAction>[] = [
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "actionType",
      header: "Tipo",
      cell: (row) => row.actionType?.name || "N/A",
    },
    { accessorKey: "value", header: "Pontos", className: "text-right" },
  ];

  const actionTypesColumns: ColumnDef<ActionTypeWithCount>[] = [
    { accessorKey: "name", header: "Nome da Ação" },
    {
      accessorKey: "_count",
      header: "Nº de Tags",
      cell: (row) => row._count?.tags ?? 0,
      className: "text-center",
    },
  ];

  const rankingColumns: ColumnDef<UserRankingInfo>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.imageUrl ?? undefined} />
            <AvatarFallback>{row.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "tagsCount",
      header: "Tags Recebidas",
      className: "text-center",
    },
    {
      accessorKey: "totalPoints",
      header: "Total de Pontos",
      className: "text-right text-[#f5b719] font-bold",
    },
  ];

  const enterpriseAsUserPlaceholder: User = {
    id: "enterprise-points-id", // ID especial que a API irá reconhecer.
    name: "Pontos da Empresa", // Nome que aparecerá no seletor.
    email: "enterprise@empresajr.org", // Dados fictícios para satisfazer o tipo
    emailEJ: "enterprise@empresajr.org",
    imageUrl: "/Logo.png",
    password: "",
    birthDate: new Date(),
    phone: "",
    semesterEntryEj: "",
    semesterLeaveEj: null,
    linkedin: null,
    instagram: null,
    course: null,
    about: "Este item representa a pontuação geral da Empresa JR.",
    aboutEj: null,
    isExMember: false,
    alumniDreamer: false,
    otherRole: null,
    dailyMessageCount: 0,
    lastMessageDate: null,
    currentRoleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const usersForModal = [enterpriseAsUserPlaceholder, ...allUsers];

  const totalUsersPoints = usersRanking.reduce(
    (acc, user) => acc + user.totalPoints,
    0
  );

  const actionTypesOptions = allActionTypes.map((actionType) => ({
    value: actionType.id,
    label: actionType.name,
  }));

  if (isLoadingData) {
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CustomCard
          type="link"
          title="Pontuação da Empresa"
          value={enterprisePoints}
          icon={JrPointIconBlue}
          className="mt-6"
        />
        <CustomCard
          type="link"
          title="Total de Pontos Sócios(as)"
          value={totalUsersPoints}
          icon={JrPointIconBlue}
          className="mt-6"
        />
      </div>

      <div className="mt-6 flex justify-end">
        {isDirector && (
          <Button
            onClick={() => setIsActionsModalOpen(true)}
            className="bg-[#0126fb] hover:bg-[#0126fb]/80"
          >
            <Plus className="mr-2 h-4 w-4" />
            Gerir Pontos e Ações
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 mt-4">
        {isDirector && (
          <CustomTable<UserRankingInfo>
            title="Pontuação dos Membros"
            columns={rankingColumns}
            data={usersRanking}
            filterColumns={["name"]}
            onRowClick={(user) => {
              setSelectedUser(user);
              setIsUserTagsModalOpen(true);
            }}
            itemsPerPage={15}
            type="onlyView"
          />
        )}
        <CustomTable<TagWithAction>
          title="Tags da Empresa"
          columns={tagColumns}
          data={enterpriseTags}
          filterColumns={["description", "actionType"]}
          itemsPerPage={6}
          onEdit={(item) => handleOpenEditModal(item, "tag")}
          onDelete={(item) => setItemToDelete({ type: "tag", id: item.id })}
          onRowClick={(item) => handleOpenEditModal(item, "tag")}
          type="noSelection"
        />
        {isDirector && (
          <>
            <CustomTable<TagWithAction>
              title="Tags Gerais (Modelos)"
              columns={tagColumns}
              data={allTags}
              filterColumns={["description"]}
              itemsPerPage={6}
              onEdit={(item) => handleOpenEditModal(item, "tag")}
              onDelete={(item) => setItemToDelete({ type: "tag", id: item.id })}
              onRowClick={(item) => handleOpenEditModal(item, "tag")}
              type="noSelection"
            />
            <CustomTable<ActionTypeWithCount>
              title="Tipos de Ações"
              columns={actionTypesColumns}
              data={allActionTypes}
              filterColumns={["name", "description"]}
              itemsPerPage={6}
              onEdit={(item) => handleOpenEditModal(item, "action-type")}
              onDelete={(item) => setItemToDelete({ type: "tag", id: item.id })}
              onRowClick={(item) => handleOpenEditModal(item, "action-type")}
              type="noSelection"
            />
          </>
        )}
      </div>

      {isDirector && (
        <AdminActionsModal
          isOpen={isActionsModalOpen}
          onClose={() => setIsActionsModalOpen(false)}
          allActionTypes={allActionTypes}
          allUsers={usersForModal} // Passa os usuários do ranking para o modal
          allTags={allTags}
        />
      )}
      <UserTagsModal
        isOpen={isUserTagsModalOpen}
        onClose={() => setIsUserTagsModalOpen(false)}
        user={selectedUser}
      />

      {/* O CustomModal é agora usado para edição */}
      {editingItem && (
        <CustomModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          form={form}
          onSubmit={handleEditSubmit}
          fields={
            editingItem.type === "tag"
              ? [
                  { accessorKey: "description", header: "Descrição" },
                  {
                    accessorKey: "actionTypeId",
                    header: "Tipo de Ação",
                    type: "select",
                    options: actionTypesOptions,
                  },
                  { accessorKey: "value", header: "Valor" },
                ]
              : [
                  { accessorKey: "name", header: "Nome" },
                  { accessorKey: "description", header: "Descrição" },
                ]
          }
          title={`Editar ${
            editingItem.type === "tag" ? "Tag" : "Tipo de Ação"
          }`}
          isEditing={editingItem ? true : false}
          isLoading={isEditingItem}
          setIsEditing={() => editingItem && setIsEditModalOpen(false)}
        />
      )}

      {itemToDelete && (
        <ModalConfirm
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeletingItem}
        />
      )}
    </>
  );
};

export default EnterprisePageContent;
