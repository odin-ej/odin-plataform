"use client";

// --- Imports ---
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parse } from "date-fns";
import { toast } from "sonner";
import {
  RequestStatus,
  ReserveRequestToConections,
  User,
} from "@prisma/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../../Global/Custom/CustomModal";
import ModalConfirm from "../../Global/ModalConfirm";

// --- Autenticação e Permissões ---
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { formatInTimeZone } from "date-fns-tz";

// --- Tipos e Schemas ---
const formValidationSchema = z.object({
  title: z.string().min(3, "O título deve ter no mínimo 3 caracteres."),
  description: z
    .string()
    .min(10, "A descrição deve ter no mínimo 10 caracteres."),
  date: z.string().min(10, "A data no formato DD/MM/AAAA é obrigatória."),
  status: z.nativeEnum(RequestStatus).optional(),
});

type ReserveRequestFormValues = z.infer<typeof formValidationSchema>;

export type RequestWithApplicant = ReserveRequestToConections & { applicant: User };
interface SalasEaufbaPageProps {
  initialData: {
    reserveRequestToConections: RequestWithApplicant[];
  };
}


// --- Componente Principal ---
const SalasEaufbaContent = ({ initialData }: SalasEaufbaPageProps) => {
  // --- Estados ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RequestWithApplicant | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] =
    useState<RequestWithApplicant | null>(null);

  // --- Hooks ---
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const data = initialData

  const userHasAllowedRole = checkUserPermission(user, {
    ...DIRECTORS_ONLY,
    allowedRoles: ["Assessor(a) de Conexões"],
  });

  const form = useForm<ReserveRequestFormValues>({
    resolver: zodResolver(formValidationSchema),
  });

  const { mutate: updateRequest, isPending: isUpdating } = useMutation({
    mutationFn: (values: Partial<ReserveRequestFormValues>) => {
      if (!selectedRequest) throw new Error("Nenhuma solicitação selecionada.");
      return axios.patch(
        `/api/reserve/salas-eaufba/${selectedRequest.id}`,
        values
      );
    },
    onSuccess: () => {
      toast.success("Solicitação atualizada com sucesso!");
      queryClient.invalidateQueries({
        queryKey: ["reservationsData"],
      });
      handleCloseModal();
    },
    onError: (error: AxiosError<{ message?: string }>) =>
      toast.error("Erro ao atualizar solicitação.", {
        description: error.response?.data?.message || error.message,
      }),
  });

  const { mutate: deleteRequest, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => axios.delete(`/api/reserve/salas-eaufba/${id}`),
    onSuccess: () => {
      toast.success("Solicitação deletada com sucesso!");
      setIsDeleteModalOpen(false);
      queryClient.invalidateQueries({
        queryKey: ["reservationsData"],
      });
    },
    onError: (error: AxiosError<{ message?: string }>) =>
      toast.error("Erro ao deletar solicitação.", {
        description: error.response?.data?.message || error.message,
      }),
  });

  // --- Manipuladores de Eventos ---
  const isLoading =  isUpdating || isDeleting;

  const handleOpenEditModal = (request: RequestWithApplicant) => {
    setSelectedRequest(request);
    form.reset({
      title: request.title,
      description: request.description,
      status: request.status,
      date: formatInTimeZone(new Date(request.date), "America/Sao_Paulo", "dd/MM/yyyy"),
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedRequest(null);
  };

  const handleDeleteClick = (item: RequestWithApplicant) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const onSubmit = (values: ReserveRequestFormValues) => {
    const parsedDate = parse(values.date, "dd/MM/yyyy", new Date());

    if (isNaN(parsedDate.getTime())) {
      toast.error("Data inválida", {
        description: "Por favor, insira uma data no formato DD/MM/AAAA.",
      });
      return;
    }

    const payload: Partial<ReserveRequestFormValues> & { date: string } = {
      ...values,
      date: parsedDate.toISOString(),
    };

    // Se o usuário NÃO tiver permissão para alterar o status,
    // removemos o campo 'status' do objeto antes de enviar para a API.
    if (!userHasAllowedRole) {
      delete (payload as Partial<ReserveRequestFormValues>).status;
    }

    if (selectedRequest) {
      updateRequest(payload);
    } else {
      toast.error("Nenhuma solicitação selecionada.");
    }
  };

  // --- Definições de Colunas e Campos ---
  const requestColumns: ColumnDef<RequestWithApplicant>[] = [
    {
      accessorKey: "date",
      header: "Data da Solicitação",
      cell: (row) =>
        new Date(row.date).toLocaleDateString("pt-BR", { timeZone: "UTC" }),
    },
    { accessorKey: "title", header: "Título" },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => {
        const statusMap: Record<RequestStatus, string> = {
          PENDING: "Em análise",
          REQUESTED: 'Solicitada ao Apoio',
          APPROVED: "Aprovada",
          REJECTED: "Rejeitada",
        };
        return statusMap[row.status] || "Desconhecido";
      },
    },
    {
      accessorKey: "applicant",
      header: "Solicitante",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
          <AvatarImage
            src={row.applicant.imageUrl}
            alt={row.applicant.name}
            className="object-cover"
          />
          
          <AvatarFallback className="bg-[#0126fb] text-xs">
            {row.applicant.name
              .split(" ")
              .map((n) => n[0])
              .join("")
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-white p-1">{row.applicant.name}</span>
        </div>
      ),
    },
  ];

  const getModalFields = (): FieldConfig<ReserveRequestFormValues>[] => {
    const isEditing = Boolean(selectedRequest);

    // Regra 1: Define se o CONTEÚDO (título, data, etc.) pode ser editado.
    // Apenas ao criar um novo, ou se o dono estiver editando um pedido AINDA PENDENTE.
    const canEditContent =
      !isEditing ||
      (selectedRequest?.applicantId === user?.id &&
        selectedRequest?.status === "PENDING");

    // Regra 2: Define se o STATUS pode ser editado.
    // Apenas usuários com a role específica podem alterar o status.
    const canEditStatus = userHasAllowedRole;
    // Define os campos base, que sempre aparecem.
    // A propriedade 'disabled' é controlada pela regra 'canEditContent'.
    const fields: FieldConfig<ReserveRequestFormValues>[] = [
      { accessorKey: "title", header: "Título", disabled: !canEditContent },
      {
        accessorKey: "date",
        header: "Data da Solicitação",
        mask: "date",
        disabled: !canEditContent,
      },
      {
        accessorKey: "description",
        header: "Descrição",
        type: "textarea",
        disabled: !canEditContent, //mesmo retornando false, aparentemente isso daqui fica como false também por algum motivo
      },
    ];

    // Se estiver em modo de edição, SEMPRE adicionamos o campo de status.
    if (isEditing) {
      fields.push({
        accessorKey: "status",
        header: "Status",
        type: "select",
        options: [
          { value: "PENDING", label: "Em análise" },
          { value: "REQUESTED", label: "Solicitada ao Apoio" },
          { value: "APPROVED", label: "Aprovada" },
          { value: "REJECTED", label: "Rejeitada" },
        ],
        // AQUI ESTÁ A LÓGICA CHAVE:
        // O campo fica desabilitado se o usuário NÃO tiver a permissão para editar o status.
        disabled: !canEditStatus,
      });
    }

    return fields;
  };

  const myRequests =
    data?.reserveRequestToConections?.filter(
      (req) => req.applicantId === user?.id
    ) || [];
  const allRequests = data?.reserveRequestToConections || [];

  return (
    <>
      <div className="mt-6 flex flex-col gap-8">
        <CustomTable
          data={myRequests}
          columns={requestColumns}
          filterColumns={["title", "status"]}
          title="Minhas Solicitações"
          type="noSelection"
          onDelete={handleDeleteClick}
          onEdit={handleOpenEditModal}
          isRowDeletable={(row) => !isLoading && row.status === "PENDING"}
          isRowEditable={(row) => !isLoading && row.status === "PENDING"}
        />

        <CustomTable
          data={allRequests}
          columns={requestColumns}
          filterColumns={["title", "status"]}
          title="Todas as Solicitações"
          type={userHasAllowedRole ? "noSelection" : "onlyView"}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteClick}
          isRowEditable={() => userHasAllowedRole}
          isRowDeletable={() => userHasAllowedRole}
        />
      </div>

      <CustomModal
        fields={getModalFields()}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          "Detalhes da Solicitação"
        }
        form={form}
        onSubmit={onSubmit}
        isLoading={isUpdating}
        isEditing={true}
        setIsEditing={() => {}}
      />

      {itemToDelete && (
        <ModalConfirm
          open={isDeleteModalOpen}
          onCancel={() => setIsDeleteModalOpen(false)}
          onConfirm={() => deleteRequest(itemToDelete.id)}
          isLoading={isDeleting}
          title="Confirmar Exclusão"
          description="Você tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita."
        />
      )}
    </>
  );
};

export default SalasEaufbaContent;
