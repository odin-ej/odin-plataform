/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { RolesManagementPageProps } from "@/app/(dashboard)/gerenciar-cargos/page";
import CustomCard from "../../Global/Custom/CustomCard";
import { BookUser, Loader2, Sparkles } from "lucide-react";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../../Global/Custom/CustomModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AreaRoles, Role } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useMemo, useState } from "react";
import { exportToExcel } from "@/lib/utils";
import ModalConfirm from "../../Global/ModalConfirm";
import { toast } from "sonner";
import {
  roleCreateSchema,
  RolesFormValues,
  RolesUpdateFormValues,
  roleUpdateSchema,
} from "@/lib/schemas/roleSchema";
import CreateRoleModal from "./CreateRoleModal";
import Organograma from "./Organograma";
import { Button } from "@/components/ui/button";
import AttributeManagementModal from "./AttributeManagmentModal";

interface RolesContentProps {
  initialData: RolesManagementPageProps;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RolesContent = ({ initialData }: RolesContentProps) => {
  const queryClient = useQueryClient();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Role | null>(null);
  const [isAttributeModalOpen, setIsAttributeModalOpen] = useState(false);

  const createForm = useForm<RolesFormValues>({
    resolver: zodResolver(roleCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      area: [AreaRoles.TATICO],
    },
  });

  const updateForm = useForm<RolesUpdateFormValues>({
    resolver: zodResolver(roleUpdateSchema),
  });

  const { data, isLoading } = useQuery<RolesManagementPageProps>({
    queryKey: ["managment-roles"],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/managment-roles`);
      return response.data;
    },
    initialData,
  });

  const { mutate: createRole, isPending: isCreating } = useMutation({
    mutationFn: async (data: RolesFormValues) => {
      await axios.post(`${API_URL}/api/roles`, data);
    },
    onSuccess: () => {
      toast.success("Cargo criado com sucesso!");
      createForm.reset();
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar cargo!: ${error.response?.data?.message}`);
    },
  });

  const { mutate: updateRole, isPending: isUpdating } = useMutation({
    mutationFn: async (data: RolesUpdateFormValues) => {
      await axios.patch(`${API_URL}/api/roles/${data.id}`, data);
    },
    onSuccess: () => {
      toast.success("Cargo atualizado com sucesso!");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar cargo!: ${error.response?.data?.message}`);
    },
  });

  const { mutate: deleteRole, isPending: isDeleting } = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`${API_URL}/api/roles/${id}`);
    },
    onSuccess: () => {
      setItemToDelete(null);
      toast.success("Cargo deletado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao deletar cargo!: ${error.response?.data?.message}`);
    },
  });

  const { mutate: saveAttributes, isPending: isSavingAttributes } = useMutation(
    {
      mutationFn: (data: any) =>
        axios.post(`${API_URL}/api/attributes/sync`, data),
      onSuccess: () => {
        toast.success("Interesses e categorias salvos!");
        setIsAttributeModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["managment-roles"] });
      },
     onError: (error: any) => {
      toast.error(`Erro ao atualizar atributos!: ${error.response?.data?.message}`);
    },
    }
  );

  const {roles, users, interestCategories, professionalInterests} = data || {};

  const areas = useMemo(() => {
    const allAreas = new Set<AreaRoles>();
    roles.forEach((role) =>
      role.area.forEach((area) => allAreas.add(area))
    );
    return Array.from(allAreas);
  }, [roles]);

  const rolesColumns: ColumnDef<RolesFormValues>[] = [
    {
      accessorKey: "name",
      header: "Nome",
    },
    {
      accessorKey: "description",
      header: "Descrição",
    },
    {
      accessorKey: "area",
      header: "Áreas",
      cell: (row) => {
        return row.area.map((area: AreaRoles) => area).join(", ");
      },
    },
  ];

  const areaOptions = areas.map((area) => ({
    label: area,
    value: area,
  }));

  const rolesFields: FieldConfig<RolesUpdateFormValues>[] = [
    {
      type: "text",
      header: "Nome",
      accessorKey: "name",
    },
    {
      type: "text",
      header: "Descrição",
      accessorKey: "description",
    },
    {
      type: "checkbox",
      header: "Áreas",
      accessorKey: "area",
      options: areaOptions,
      renderView: (data) => (
        <div className="bg-[#00205e] w-full min-h-11 rounded-lg flex items-center justify-start gap-2 p-3">
          {data.area?.map((area: AreaRoles) => area).join(", ")}
        </div>
      ),
    },
  ];

  const openModal = (role: Role) => {
    updateForm.reset({
      id: role.id,
      name: role.name,
      description: role.description,
      area: role.area,
    });

    setIsEditModalOpen(true);
  };

  const handleRolesExport = () => {
    if (data.roles.length === 0 || data.users.length === 0)
      return alert("Nenhum dado para exportar");
    const dataToExport = data.roles.map((u) => ({
      Nome: u.name,
      Descricao: u.description,
      Areas: u.area.join(", "),
      Membros_Atuais: data.users
        .filter((user) => user.currentRole?.id === u.id)
        .map((user) => user.name)
        .join(", "),
      Data_Criacao: new Date(u.createdAt).toLocaleDateString().split("T")[0],
      Data_Atualizacao: new Date(u.updatedAt)
        .toLocaleDateString()
        .split("T")[0],
      Data_Exportacao: new Date().toLocaleDateString().split("T")[0],
    }));
    exportToExcel(dataToExport, "cargos_plataforma_odin");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-20">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  }

  return (
    <>
      <CustomCard
        icon={BookUser}
        title="Cargos"
        value={0}
        type="introduction"
        description="Gerencie os cargos da Casinha dos Sonhos."
      />
      <Organograma users={users} areas={areas} isManagment={true} />
      <CustomTable
        columns={rolesColumns}
        data={data.roles}
        filterColumns={["name", "description", "area"]}
        title="Cargos"
        onRowClick={(row) => openModal(row)}
        onEdit={(row) => openModal(row)}
        onDelete={(row) => setItemToDelete(row)}
        onExportClick={() => handleRolesExport()}
        type="noSelection"
        itemsPerPage={10}
        handleActionClick={() => setIsCreateModalOpen(true)}
      />

      <div className="mt-8 p-6 rounded-2xl border-2 border-dashed border-[#f5b719]/30 bg-[#010d26]">
        <div className="flex flex-col md:flex-row items-center text-center md:text-left gap-4">
          <div className="flex-shrink-0 grid place-items-center h-16 w-16 rounded-full bg-gradient-to-br from-[#f5b719]/20 to-[#f5b719]/5">
            <Sparkles className="h-8 w-8 text-[#f5b719]" />
          </div>
          <div className="flex-grow">
            <h3 className="text-xl font-bold text-white">
              Gerenciamento Centralizado de Interesses
            </h3>
            <p className="text-gray-400 mt-1">
              Clique aqui para abrir o painel e gerenciar todas as categorias e
              interesses profissionais em um único lugar, de forma rápida e
              integrada.
            </p>
          </div>
          <Button
            onClick={() => setIsAttributeModalOpen(true)}
            className="bg-[#f5b719] hover:bg-[#f5b719]/80 text-white font-bold"
          >
            Gerenciar Atributos
          </Button>
        </div>
      </div>

      {isEditModalOpen && (
        <CustomModal<RolesUpdateFormValues>
          title="Editar Cargo"
          fields={rolesFields}
          form={updateForm}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSubmit={(data) => updateRole(data)}
          isLoading={isUpdating}
          isEditing={isEditModalOpen}
          setIsEditing={setIsEditModalOpen}
        />
      )}
      {itemToDelete && (
        <ModalConfirm
          title="Quer mesmo excluir esse cargo?"
          description="Isso pode quebrar o acesso de algum usuário que esteja com esse cargo atualmente."
          onCancel={() => setItemToDelete(null)}
          open={!!itemToDelete}
          onConfirm={() => deleteRole(itemToDelete.id)}
          isLoading={isDeleting}
        />
      )}
      {isCreateModalOpen && (
        <CreateRoleModal
          form={createForm}
          isLoading={isCreating}
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(data) => createRole(data)}
          areaOptions={areaOptions}
        />
      )}

      <AttributeManagementModal
        isOpen={isAttributeModalOpen}
        onClose={() => setIsAttributeModalOpen(false)}
        onSave={saveAttributes}
        isLoading={isSavingAttributes}
        initialCategories={interestCategories}
        initialInterests={professionalInterests}
      />
    </>
  );
};

export default RolesContent;
