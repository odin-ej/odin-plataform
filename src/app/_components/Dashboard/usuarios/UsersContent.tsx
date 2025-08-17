/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { toast } from "sonner";
import { Role } from "@prisma/client";

// Seus imports de componentes e schemas
import CustomCard from "@/app/_components/Global/Custom/CustomCard";
import { TicketCheck, Users } from "lucide-react";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../../Global/Custom/CustomModal";
import {
  MemberWithFullRoles,
  RegistrationRequestWithRoles,
  UniversalMember,
  userProfileSchema,
  UserProfileValues,
} from "@/lib/schemas/memberFormSchema";
import { formatDateForInput, getModalFields } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ModalConfirm from "../../Global/ModalConfirm";

// --- PROPS CORRIGIDAS ---
// Voltamos ao formato original, que é mais claro para os componentes pais
interface UsersContentProps {
  members: UniversalMember[];
  exMembers: UniversalMember[];
  availableRoles: Role[];
  type?: "approve" | "users";
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ROLE_ID_OUTRO = process.env.OTHER_ROLE_ID as string;

// Tipagem para os dados gerenciados pela query
interface QueryData {
  list: UniversalMember[];
  roles: Role[];
}

const UsersContent = ({
  members: initialMembers,
  exMembers: initialExMembers,
  availableRoles: initialRoles,
  type = "users",
}: UsersContentProps) => {
  // --- ESTADO DA UI (Permanece) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  // No início do seu componente UsersContent
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItems, setSelectedItems] = useState<UniversalMember[]>([]);
  const [itemToDelete, setItemToDelete] = useState<UniversalMember | null>(
    null
  );

  const queryClient = useQueryClient();
  const form = useForm<UserProfileValues>({
    resolver: zodResolver(userProfileSchema),
  });

  const roles = form.watch("roles");
  const isWorking = form.watch("isWorking");

  useEffect(() => {
    const hasOutro = roles?.includes(ROLE_ID_OUTRO);

    // Se a opção "Outro" NÃO estiver selecionada, limpa o campo otherRole.
    if (!hasOutro && form.getValues("otherRole")) {
      form.setValue("otherRole", "", { shouldValidate: true });
    }

    if (isWorking === "Não") {
      form.setValue("workplace", "", { shouldValidate: true });
    }
  }, [roles, form, isWorking]);

  // --- QUERY DINÂMICA (A Correção Principal) ---
  const queryKey = ["userData", type]; // Chave dinâmica baseada no tipo de página

  const { data } = useQuery<QueryData>({
    queryKey: queryKey,
    // A função de fetch agora é inteligente e busca no endpoint correto
    queryFn: async () => {
      const listEndpoint =
        type === "approve" ? "/registration-requests" : "/users";
      const [listRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/api${listEndpoint}`),
        axios.get(`${API_URL}/api/roles`),
      ]);
      // Normalizamos a resposta para sempre ter uma propriedade 'list' e 'roles'
      return {
        list: listRes.data.requests || listRes.data.users,
        roles: rolesRes.data,
      };
    },
    // O estado inicial é construído a partir das props recebidas do Server Component
    initialData: {
      list: [...initialMembers, ...initialExMembers],
      roles: initialRoles,
    },
  });

  const isExMemberBoolean = form.watch("isExMember") === "Sim";
  // --- MUTAÇÕES (Com Invalidação de Query Dinâmica) ---

  // 1. ATUALIZAR UM USUÁRIO
  const { mutate: updateUser, isPending: isUpdatingUser } = useMutation({
    mutationFn: async (formData: UserProfileValues) => {
      let imageUrl = formData.imageUrl;
      // Lógica de Upload S3 agora vive aqui dentro
      if (formData.image instanceof File) {
        const file = formData.image;
        const presignedUrlRes = await axios.post("/api/s3-upload", {
          fileType: file.type,
          fileSize: file.size,
          olderFile: imageUrl,
        });
        const { url, key } = presignedUrlRes.data;
        await axios.put(url, file, { headers: { "Content-Type": file.type } });
        imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
      }

      const { id } = formData;
      const apiUrl =
        type === "users"
          ? `${API_URL}/api/users/${id}`
          : `${API_URL}/api/registration-requests/${id}`;
      return axios.patch(apiUrl, { ...formData, imageUrl });
    },
    onSuccess: (_, variables) => {
      toast.success(`Usuário ${variables.name} atualizado!`);
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["pendingRegistrations"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao atualizar", {
        description: error.response?.data?.message,
      }),
  });
  // 2. DELETAR/REJEITAR UM USUÁRIO
  const { mutate: deleteUser, isPending: isDeletingUser } = useMutation({
    mutationFn: (user: UniversalMember) => {
      const url =
        type === "users"
          ? `${API_URL}/api/users/${user.id}`
          : `${API_URL}/api/registration-requests/${user.id}`;
      return axios.delete(url);
    },
    onSuccess: (_, user) => {
      toast.success(`Membro ${user.name} removido!`);
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: queryKey }); // Invalida a chave dinâmica
    },
    onError: (error: any) =>
      toast.error("Erro ao remover", {
        description: error.response?.data?.message,
      }),
  });

  // 3. APROVAR EM MASSA
  const { mutate: bulkApprove, isPending: isApprovingInBulk } = useMutation({
    mutationFn: (ids: string[]) =>
      axios.post(`${API_URL}/api/users/register-many`, { ids }),
    onSuccess: (response) => {
      const { successful, failed } = response.data;
      if (successful.length > 0)
        toast.success("Aprovação Concluída", {
          description: `${successful.length} registos aprovados.`,
        });
      if (failed.length > 0)
        toast.error("Alguns Registos Falharam", {
          description: `${failed.length} registos não puderam ser aprovados.`,
        });
      setSelectedItems([]);
      queryClient.invalidateQueries({ queryKey: queryKey }); // Invalida a chave dinâmica
    },
    onError: (error: any) =>
      toast.error("Erro na aprovação em massa", {
        description: error.response?.data?.message,
      }),
  });

  // --- HANDLERS (Simplificados) ---
  const handleModalSubmit = (formData: UserProfileValues) => {
    const outroSelecionado = formData.roles?.includes(ROLE_ID_OUTRO);
    if (!outroSelecionado && formData.otherRole) {
      toast.error(
        "Selecione a opção 'Outro' para preencher o campo 'Outro Cargo'"
      );
      return;
    }
    updateUser(formData);
  };

  const handleDeleteConfirm = (item: UniversalMember) => {
    setItemToDelete(item); // 1. Guarda o item que será deletado
    setIsDeleteModalOpen(true);
  };

  const handleActionClick = () => {
    if (selectedItems.length > 0)
      bulkApprove(selectedItems.map((item) => item.id));
  };

  // --- DADOS DERIVADOS (Filtragem dos dados da query) ---
  const { members, exMembers } = useMemo(() => {
    const userList = data?.list || []; // Usa a propriedade genérica 'list'
    return {
      members: userList.filter((user) => !user.isExMember),
      exMembers: userList.filter((user) => user.isExMember),
    };
  }, [data]);

  const availableRoles = data?.roles || initialRoles;

  const formatedRoles = isExMemberBoolean
    ? availableRoles.map((role) => ({
        value: role.id,
        label: role.name,
      }))
    : availableRoles
        .map((role) => ({
          value: role.id,
          label: role.name,
        }))
        .filter((role) => role.label !== "Outro");

  const memberColumns: ColumnDef<UniversalMember>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.imageUrl}
              alt={row.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-[#0126fb] text-xs">
              {row.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { accessorKey: "email", header: "E-mail" },
    { accessorKey: "emailEJ", header: "E-mail EJ" },
    { accessorKey: "phone", header: "Telefone" },
    {
      accessorKey: "roles",
      header: "Cargo",
      cell: (row) => {
        if ("currentRole" in row && row.currentRole) {
          // Se existir, exibe o nome do cargo principal
          return row.currentRole.name;
        }

        // 2. Se não existir (caso de um RegistrationRequest), usa a lógica antiga como fallback
        if (row.roles.length > 0) {
          return row.roles[row.roles.length - 1].name;
        }

        if ((row as RegistrationRequestWithRoles).roleId) {
          return (
            availableRoles.find(
              (role) => role.id === (row as RegistrationRequestWithRoles).roleId
            )?.name || "Outro"
          );
        }

        // 3. Fallback final se não houver nenhum cargo
        return "Sem cargo";
      },
    },
  ];

  const exMemberColumns: ColumnDef<UniversalMember>[] = [
    {
      accessorKey: "name",
      header: "Nome",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.imageUrl}
              alt={row.name}
              className="object-cover"
            />
            <AvatarFallback className="bg-[#0126fb] text-xs">
              {row.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    { accessorKey: "email", header: "E-mail" },
    { accessorKey: "emailEJ", header: "E-mail EJ" },
    { accessorKey: "phone", header: "Telefone" },
    { accessorKey: "semesterLeaveEj", header: "Semestre de saída" },
  ];

  const selectedRoles = form.watch("roles") || [];
  const fields = getModalFields<UserProfileValues>(
    isExMemberBoolean, // A função já usa este booleano para a lógica,
    selectedRoles,
    isWorking === "Sim"
  );

  const currentRoleField: FieldConfig<UserProfileValues> = {
    accessorKey: "roleId",
    header: "Cargo Atual",
    type: "select",
    options: formatedRoles,
    renderView(data) {
      if (isExMemberBoolean) return "Ex-membro";
      const role = formatedRoles.find(
        (role) => role.value === (data as UserProfileValues).roleId
      )?.label;
      if (!role) return "Nenhum cargo selecionionado";
      return (
        <div className="bg-[#00205e] w-full min-h-11 rounded-lg flex items-center justify-start gap-2 p-3">
          {role}
        </div>
      );
    },
  };

  const modalFields: FieldConfig<UserProfileValues>[] = [
    ...fields,
    {
      accessorKey: "password",
      header: "Senha",
      type: "password",
      renderView() {
        return (
          <div className="bg-[#00205e] w-full min-h-11 rounded-lg flex items-center justify-start gap-2 p-3">
            <span className="text-sm">*********</span>
          </div>
        );
      },
    },
    {
      accessorKey: "confPassword",
      header: "Confirmação da Senha",
      type: "password",
      renderView() {
        return (
          <div className="bg-[#00205e] w-full min-h-11 rounded-lg flex items-center justify-start gap-2 p-3">
            <span className="text-sm">*********</span>
          </div>
        );
      },
    },
  ];

  if (!isExMemberBoolean) modalFields.push(currentRoleField);

  const lastFields: FieldConfig<UserProfileValues>[] = [
    {
      accessorKey: "roles",
      header: "Cargos",
      type: "checkbox",
      options: formatedRoles,
      renderView(data) {
        const roles = formatedRoles.filter((role) =>
          data?.roles?.includes(role.value)
        );
        return (
          <div className="bg-[#00205e] w-full min-h-11 rounded-lg flex items-center justify-start gap-2 p-3">
            {roles.length > 0 ? (
              roles.map((role) => (
                <span key={role.value} className="text-sm">
                  {role.label}
                </span>
              ))
            ) : (
              <span className="text-sm">Nenhum cargo selecionado</span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "image",
      header: "Imagem de Perfil",
      type: "dropzone",
    },
  ];

  modalFields.push(...lastFields);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const onInvalid = (_errors: any) => {
    toast.error("Formulário Inválido", {
      description: "Por favor, corrija os campos destacados e tente novamente.",
    });
  };

  const openModal = (
    user: UniversalMember | MemberWithFullRoles,
    isButtonEdit: boolean
  ) => {
    form.reset({
      id: user.id,
      name: user.name,
      email: user.email,
      emailEJ: user.emailEJ,
      about: user.about ?? "",
      aboutEj: user.aboutEj ?? "",
      birthDate: formatDateForInput(user.birthDate),
      imageUrl: user.imageUrl,
      image: undefined,
      phone: user.phone,
      password: user.password || "",
      confPassword: user.password || "",
      course: user.course || "",
      semesterEntryEj: user.semesterEntryEj || "",
      semesterLeaveEj: user.semesterLeaveEj || "",
      linkedin: user.linkedin || "",
      instagram: user.instagram || "",
      otherRole: user.otherRole || "",
      isWorking: user.isWorking ? "Sim" : "Não",
      workplace: user.workplace || "",
      isExMember: user.isExMember ? "Sim" : "Não",
      alumniDreamer: (user.alumniDreamer ?? false) ? "Sim" : "Não", // O schema da API espera "Sim" ou "Não"
      roles: user.roles.map((role) => role.id), // O schema da API espera um array de IDs
      roleId:
        "currentRole" in user
          ? user.currentRole?.id
          : (user.roleId ?? user.roles[user.roles.length - 1]?.id),
    });
    setIsEditing(isButtonEdit);
    setIsModalOpen(true);
  };

  return (
    <>
      <CustomCard
        type="introduction"
        value="0"
        href="/perfil"
        description={
          type === "approve"
            ? "Aqui vocês pode aceitar as requisições de cadastro na plataforma."
            : "Aqui vocês pode modificar as informações de todos os usuários da plataforma."
        }
        title={type === "approve" ? "Cadastros Pendentes" : "Usuários"}
        icon={type === "approve" ? TicketCheck : Users}
      />

      <div className="flex flex-col gap-6 mt-6">
        <CustomTable<UniversalMember>
          columns={memberColumns}
          filterColumns={[
            "name",
            "email",
            "emailEJ",
            "phone",
            "semesterEntryEj",
            "course",
          ]}
          data={members}
          onRowClick={(row) => openModal(row, false)}
          onEdit={(row) => openModal(row, true)}
          onDelete={(row) => handleDeleteConfirm(row)}
          title="Membros"
          itemsPerPage={10}
          onSelectionChange={setSelectedItems}
          isActionLoading={isApprovingInBulk}
          handleActionClick={type !== "users" ? handleActionClick : undefined}
          disabled={isApprovingInBulk || selectedItems.length === 0}
          type={type === "users" ? "noSelection" : undefined}
        />
        <CustomTable<UniversalMember>
          columns={exMemberColumns}
          filterColumns={[
            "name",
            "email",
            "emailEJ",
            "phone",
            "semesterEntryEj",
            "semesterLeaveEj",
            "course",
            "otherRole",
            "workplace",
          ]}
          data={exMembers}
          title="Ex-membros"
          onRowClick={(row) => openModal(row, false)}
          onEdit={(row) => openModal(row, true)}
          onDelete={(row) => handleDeleteConfirm(row)}
          isActionLoading={isApprovingInBulk}
          itemsPerPage={10}
          onSelectionChange={setSelectedItems}
          handleActionClick={type !== "users" ? handleActionClick : undefined}
          disabled={isApprovingInBulk || selectedItems.length === 0}
          type={type === "users" ? "noSelection" : undefined}
        />
      </div>

      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        form={form}
        onSubmit={handleModalSubmit}
        fields={modalFields} // Passa a definição dos campos para o modal
        title="Detalhes do Usuário"
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onInvalid={onInvalid}
        isLoading={isUpdatingUser}
      />

      {itemToDelete && (
        <ModalConfirm
          open={isDeleteModalOpen}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => deleteUser(itemToDelete)}
          isLoading={isDeletingUser}
        />
      )}
    </>
  );
};

export default UsersContent;
