"use client";
import { RolesManagementPageProps } from "@/app/(dashboard)/gerenciar-cargos/page";
import CustomCard from "../Global/Custom/CustomCard";
import { BookUser, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../Global/Custom/CustomModal";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AreaRoles, Role } from "@prisma/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useMemo, useState } from "react";
import { cn, exportToExcel } from "@/lib/utils";
import RoleMemberCard, {
  areaConfig,
  isConfigurableArea,
} from "./RoleMemberCard";
import { MemberWithFullRoles } from "@/lib/schemas/memberFormSchema";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ModalConfirm from "../Global/ModalConfirm";
import { toast } from "sonner";
import { roleCreateSchema, RolesFormValues, RolesUpdateFormValues, roleUpdateSchema, } from "@/lib/schemas/roleSchema";
import CreateRoleModal from "./CreateRoleModal";

interface RolesContentProps {
  initialData: RolesManagementPageProps;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RolesContent = ({ initialData }: RolesContentProps) => {
  const queryClient = useQueryClient()
  const [selectedArea, setSelectedArea] = useState<AreaRoles | "TODOS">(
    "TODOS"
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Role | null>(null);

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
    queryKey: ["roles"],
    queryFn: async () => {
      const [rolesRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/roles`),
        axios.get(`${API_URL}/api/users`),
      ]);
      const roles: Role[] = rolesRes.data;
      const users: MemberWithFullRoles[] = usersRes.data.users;

      return { roles, users };
    },
    initialData,
  });

  const {mutate: createRole, isPending: isCreating} =  useMutation({
    mutationFn: async (data: RolesFormValues) => {
      await axios.post(`${API_URL}/api/roles`, data);
    },
    onSuccess: () => {
      toast.success("Cargo criado com sucesso!");
      createForm.reset();
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: () => {
      toast.error("Erro ao criar cargo!");
    },
  })

  const { mutate: updateRole, isPending: isUpdating } = useMutation({
    mutationFn: async (data: RolesUpdateFormValues) => {
      await axios.patch(`${API_URL}/api/roles/${data.id}`, data);
    },
    onSuccess: () => {
      toast.success("Cargo atualizado com sucesso!");
      setIsEditModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
    onError: () => {
      toast.error("Erro ao atualizar cargo!");
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
    onError: () => {
      toast.error("Erro ao deletar cargo!");
    }
  });

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    if (selectedArea === "TODOS") {
      return data.users.filter((user) => user.currentRole && !user.isExMember); // Mostra todos com cargo definido
    }
    return data.users.filter((user) =>
      user.currentRole?.area.includes(selectedArea)
    );
  }, [data?.users, selectedArea]);

  const areas = useMemo(() => {
    const allAreas = new Set<AreaRoles>();
    data?.roles
      .forEach((role) => role.area.forEach((area) => allAreas.add(area)));
    return Array.from(allAreas);
  }, [data?.roles]);


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
      if (data.roles.length === 0) return alert("Nenhum dado para exportar");
      const dataToExport = data.roles.map((u) => ({
        Nome: u.name,
        Descricao: u.description,
        Areas: u.area.join(", "),
        Membros_Atuais: filteredUsers.filter((user) => user.currentRole?.id === u.id).map((user) => user.name).join(', '),
        Data_Criacao: new Date(u.createdAt).toLocaleDateString().split("T")[0],
        Data_Atualizacao: new Date(u.updatedAt).toLocaleDateString().split("T")[0],
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
        value={initialData.roles.length}
        type="introduction"
        description="Gerencie os cargos da Casinha dos Sonhos."
      />
      <div className="p-4 sm:p-6">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Organograma da Empresa
          </h1>
          <p className="mt-2 text-lg text-[#f5b719]">
            Navegue pelos cargos e conheça quem faz parte de cada área.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
          <Button
            onClick={() => setSelectedArea("TODOS")}
            variant={selectedArea === "TODOS" ? "default" : "outline"}
            className={cn(
              "border-blue-800 text-white transition-all ",
              selectedArea === "TODOS"
                ? "bg-[#f5b719] hover:!text-white hover:bg-[#f5b719]/90"
                : "bg-[0126fb]/30 hover:!text-white hover:bg-[0126fb]/60"
          )}
          >
            Todos
          </Button>
          {areas.map((area) => {
            if (!isConfigurableArea(area)) return null;
            const config = areaConfig[area];
            return (
              <Button
                key={area}
                onClick={() => setSelectedArea(area)}
                variant={selectedArea === area ? "default" : "outline"}
                className={cn(
                  "border-blue-800 text-white transition-all",
                  selectedArea === area
                    ? `${config.color} hover:${config.color}/90 text-white`
                    : "bg-blue-900/30 hover:bg-blue-900/60"
                )}
              >
                <config.icon className="w-4 h-4 mr-2" />
                {config.label}
              </Button>
            );
          })}
        </div>

        {filteredUsers.length > 0 ? (
          <Carousel
            opts={{ align: "start", loop: true }}
            className="w-full mx-auto"
          >
            <CarouselContent className="-ml-4">
              {filteredUsers.map((user) => (
                <CarouselItem
                  key={user.id}
                  className="pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
                >
                  <div className="p-1">
                    <RoleMemberCard user={user} />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white bg-blue-900/50 border-blue-800 hover:bg-blue-900/80" />
            <CarouselNext className="text-white bg-blue-900/50 border-blue-800 hover:bg-blue-900/80" />
          </Carousel>
        ) : (
          <div className="text-center py-16 px-6 bg-[#010d26]/50 rounded-lg">
            <h3 className="text-xl font-semibold text-white">
              Nenhum membro encontrado
            </h3>
            <p className="mt-2 text-gray-400">
              Não há membros com cargo definido nesta área.
            </p>
          </div>
        )}
      </div>
      <CustomTable
        columns={rolesColumns}
        data={data.roles}
        filterColumns={["name", "description", 'area']}
        title="Cargos"
        onRowClick={(row) => openModal(row)}
        onEdit={(row) => openModal(row)}
        onDelete={(row) => setItemToDelete(row)}
        onExportClick={() => handleRolesExport()}
        type="noSelection"
        itemsPerPage={10}
        handleActionClick={() => setIsCreateModalOpen(true)}
      />
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
    </>
  );
};

export default RolesContent;
