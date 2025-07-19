/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import { Tag, User, ActionType } from ".prisma/client";
import { JrPointIconBlue } from "../Global/JrPointsIcon";
import { useState } from "react";
import AdminActionsModal from "./AdminActionsModal";

import {
  actionTypeSchema,
  ActionTypeWithCount,
  tagSchema,
  TagWithAction,
  UserRankingInfo,
} from "@/lib/schemas/pointsSchema";
import UserTagsModal from "./UserTagsModal";
import CustomModal from "../Global/Custom/CustomModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import ModalConfirm from "../Global/ModalConfirm";

interface EnterprisePageContentProps {
  enterprisePoints: number;
  enterpriseTags: TagWithAction[];
  usersRanking: UserRankingInfo[];
  allUsers: User[];
  allTags: TagWithAction[];
  allActionTypes: ActionTypeWithCount[];
}

const EnterprisePageContent = ({
  enterprisePoints,
  enterpriseTags,
  usersRanking,
  allUsers,
  allTags,
  allActionTypes,
}: EnterprisePageContentProps) => {
  const isDirector = true;
  const [isActionsModalOpen, setIsActionsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUserTagsModalOpen, setIsUserTagsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedUser, setSelectedUser] = useState<UserRankingInfo | null>(
    null
  );
  const [removeItemId, setRemoveItemId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [typeItem, setTypeItem] = useState<"tag" | "action-type">("tag");
  const router = useRouter();

  const form = useForm(); // Formulário genérico para o modal de edição

  const handleOpenEditModal = (
    item: Tag | ActionType,
    type: "tag" | "action-type"
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const schema =
      type === "tag" ? tagSchema.partial() : actionTypeSchema.partial();
    form.reset(item); // Reseta o formulário com os dados do item
    setIsEditModalOpen(true);
    setEditingItem({ ...item, type });
  };

  const handleEditSubmit = async (data: any) => {
    try {
      setIsLoading(true);
      const endpoint = `/api/${editingItem.type}s/${editingItem.id}`;
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao atualizar o item.");
      }
      toast.success("Item atualizado com sucesso!");
      setIsEditModalOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Erro ao Atualizar", { description: error.message });
    }
    setIsLoading(false);
  };

  const handleDelete = async (type: "tag" | "action-type", id: string) => {
    if(isLoading) return;
    try {
      setIsLoading(true)
      const response = await fetch(`/api/${type}s/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(`Falha ao apagar o item.`);
      toast.success("Item apagado com sucesso!");
      router.refresh();
      setIsConfirmModalOpen(false)
    } catch (error: any) {
      toast.error("Erro", { description: error.message });
    }
    setIsLoading(false)
  };

  const handleClickDeleteButton = (type: "tag" | "action-type", linkId: string) => {
    setIsConfirmModalOpen(true);
    setTypeItem(type);
    setRemoveItemId(linkId);
  };

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
          onDelete={(item) => handleClickDeleteButton("tag", item.id)}
          onRowClick={(item) => handleOpenEditModal(item, "tag")}
          type='noSelection'
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
              onDelete={(item) => handleClickDeleteButton("tag", item.id)}
              onRowClick={(item) => handleOpenEditModal(item, "tag")}
              type='noSelection'
            />
            <CustomTable<ActionTypeWithCount>
              title="Tipos de Ações"
              columns={actionTypesColumns}
              data={allActionTypes}
              filterColumns={["name", "description"]}
              itemsPerPage={6}
              onEdit={(item) => handleOpenEditModal(item, "action-type")}
              onDelete={(item) => handleClickDeleteButton("action-type", item.id)}
              onRowClick={(item) => handleOpenEditModal(item, "action-type")}
              type='noSelection'
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
          isLoading={isLoading}
          setIsEditing={() => editingItem && setIsEditModalOpen(false)}
        />
      )}

       {typeof removeItemId === "string" && isConfirmModalOpen && (
        <ModalConfirm
          open={isConfirmModalOpen}
          onCancel={() => setIsConfirmModalOpen(false)}
          onConfirm={() => handleDelete(typeItem, removeItemId)}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

export default EnterprisePageContent;
