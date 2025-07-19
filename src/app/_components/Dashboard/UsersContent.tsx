/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import CustomCard from "@/app/_components/Global/Custom/CustomCard";
import { TicketCheck, Users } from "lucide-react";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import CustomModal from "../Global/Custom/CustomModal";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  UniversalMember,
  RegistrationRequestWithRoles,
  userProfileSchema,
  UserProfileValues,
  MemberWithFullRoles,
} from "@/lib/schemas/memberFormSchema";

import { User, Role } from ".prisma/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  formatDateForInput,
  getModalFields,
  parseBrazilianDate,
} from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UsersContentProps {
  members: UniversalMember[];
  exMembers: UniversalMember[];
  availableRoles: Role[];
  type?: string;
}

const UsersContent = ({
  members,
  exMembers,
  availableRoles,
  type = "users",
}: UsersContentProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Estado para controlar o modo do modal
  const [selectedItems, setSelectedItems] = useState<
    User[] | UniversalMember[]
  >([]);
  const router = useRouter();

  const form = useForm<UserProfileValues>({
    resolver: zodResolver(userProfileSchema),
  });

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
      isExMember: user.isExMember ? "Sim" : "Não",
      alumniDreamer: user.alumniDreamer ?? false ? "Sim" : "Não", // O schema da API espera "Sim" ou "Não"
      roles: user.roles.map((role) => role.id), // O schema da API espera um array de IDs
      roleId: "currentRole" in user ? user.currentRole?.id : undefined,
    });
    setIsEditing(isButtonEdit);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (data: UserProfileValues) => {
    try {

      setIsLoading(true);

      let imageUrl = data.imageUrl;
      if (data.image instanceof File) {
        const file = data.image;

        const presignedUrlResponse = await fetch("/api/s3-upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileType: file.type, fileSize: file.size }),
        });

        if (!presignedUrlResponse.ok) {
          throw new Error("Não foi possível preparar o upload da imagem.");
        }

        const { url, key } = await presignedUrlResponse.json();

        // Usa a nova função de upload que atualiza o estado de progresso
        const uploadResponse = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });

        if (!uploadResponse.ok) {
          throw new Error("Falha ao enviar a imagem para o S3.");
        }

        imageUrl = `https://${process.env.NEXT_PUBLIC_AWS_S3_BUCKET_NAME}.s3.amazonaws.com/${key}`;
      }

      const payload = { ...data };

      // 2. Se for um ex-membro, remova o campo 'roleId' que é inválido para ele
      if (payload.isExMember === "Sim") {
        delete payload.roleId;
      }

      const url =
        type === "users"
          ? `/api/users/${data.id}`
          : `/api/registration-requests/${data.id}`;
      const response = await fetch(url, {
        method: "PATCH",

        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, imageUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Falha ao atualizar o utilizador."
        );
      }
      toast.success(`Utilizador ${data.name} atualizado com sucesso!`);
      setIsModalOpen(false);
      router.refresh(); // Recarrega os dados da página para refletir a alteração
    } catch (error: any) {
      toast.error("Erro", { description: error.message });
    }
    setIsLoading(false);
  };

  // CORREÇÃO: Função de exclusão implementada
  const handleDelete = async (user: User | UniversalMember) => {
    if (confirm(`Tem a certeza que quer apagar o membro ${user.name}?`)) {
      try {
        const url =
          type === "users"
            ? `/api/users/${user.id}`
            : `/api/registration-requests/${user.id}`;
        const response = await fetch(url, {
          method: "DELETE",
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Falha ao apagar o utilizador.");
        }
        toast.success(`Membro ${user.name} apagado com sucesso!`);
        router.refresh();
      } catch (error: any) {
        toast.error("Erro", { description: error.message });
      }
    }
  };

  // CORREÇÃO: Função de ação em massa implementada
  const handleActionClick = async () => {
    if (selectedItems.length === 0) return;
    if (
      confirm(
        `Tem certeza que deseja criar ${selectedItems.length} membros selecionados?`
      )
    ) {
      try {
        setIsLoading(true);
        const idsToAdd = selectedItems.map((item) => item.id);
        // Supondo que você tem uma API para apagar em massa
        const response = await fetch("/api/users/register-many", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: idsToAdd }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || "Falha ao criar os usuários.");
        }

        if (result.successful.length > 0) {
          toast.success("Aprovação Concluída", {
            description: `${result.successful.length} registos foram aprovados com sucesso.`,
          });
        }

        if (result.failed.length > 0) {
          toast.error("Alguns Registos Falharam", {
            description: `${result.failed.length} registos não puderam ser aprovados. Verifique a tabela para mais detalhes.`,
          });
        }
        setSelectedItems([]);
        router.refresh();
      } catch (error: any) {
        toast.error("Erro", { description: error.message });
      }
    }
    setIsLoading(false);
  };

  const formatedRoles = availableRoles.map((role) => ({
    value: role.id,
    label: role.name,
  }));

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
          return row.roles[0].name;
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

  // Define quais campos aparecerão no modal de edição
  const isExMemberBoolean = form.watch("isExMember") === "Sim";

  // REMOVA COMPLETAMENTE a constante 'allowedFields'.

  // Simplifique a criação dos campos:
  const filteredRoles = formatedRoles.filter((role) => role.label !== "Outro");
  const fields = getModalFields<UserProfileValues>(
    isExMemberBoolean, // A função já usa este booleano para a lógica
    isExMemberBoolean ? formatedRoles : filteredRoles
  );

  const onInvalid = (_errors: any) => {
    toast.error("Formulário Inválido", {
      description: "Por favor, corrija os campos destacados e tente novamente.",
    });
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
          onDelete={handleDelete}
          title="Membros"
          itemsPerPage={10}
          onSelectionChange={setSelectedItems}
          isActionLoading={isLoading}
          handleActionClick={type !== "users" ? handleActionClick : undefined}
          disabled={isLoading || selectedItems.length === 0}
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
          ]}
          data={exMembers}
          title="Ex-membros"
          onRowClick={(row) => openModal(row, false)}
          onEdit={(row) => openModal(row, true)}
          onDelete={handleDelete}
          isActionLoading={isLoading}
          itemsPerPage={10}
          onSelectionChange={setSelectedItems}
          handleActionClick={type !== "users" ? handleActionClick : undefined}
          disabled={isLoading || selectedItems.length === 0}
          type={type === "users" ? "noSelection" : undefined}
        />
      </div>

      <CustomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        form={form}
        onSubmit={handleModalSubmit}
        fields={fields} // Passa a definição dos campos para o modal
        title="Detalhes do Usuário"
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onInvalid={onInvalid}
        isLoading={isLoading}
      />
    </>
  );
};

export default UsersContent;
