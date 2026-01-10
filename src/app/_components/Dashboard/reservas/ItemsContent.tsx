"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import {
  ReservableItem,
  ItemReservation,
  User,
  ItemAreas,
  ItemStatus,
} from "@prisma/client";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../../Global/Custom/CustomModal";
import ModalConfirm from "../../Global/ModalConfirm";
import { zodResolver } from "@hookform/resolvers/zod";
import { format, isBefore } from "date-fns";
import { useAuth } from "@/lib/auth/AuthProvider";
import {
  ItemForm,
  ItemReservationFormValues,
  itemReservationSchema,
  itemSchema,
} from "@/lib/schemas/reservationsSchema";
import { fromZonedTime } from "date-fns-tz";
import { Box } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isItemAvailableForReservation } from "@/lib/utils";

// --- TIPOS ---
export type ItemWithRelations = ItemReservation & {
  user: User;
  item: ReservableItem;
};

interface ItemsContentProps {
  initialData: {
    items: ReservableItem[];
    reservations: ItemWithRelations[];
  };
  isDirector: boolean;
  // Mantido para compatibilidade; criação de reserva continua com o componente pai
  openModal?: (reservation?: ItemWithRelations, date?: Date) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ItemsContent = ({ initialData, isDirector }: ItemsContentProps) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // --- ESTADOS ---
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ReservableItem | null>(null);
  const [editingReservation, setEditingReservation] =
    useState<ItemWithRelations | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{
    id: string;
    name: string;
    type: "item" | "reservation";
  } | null>(null);

  // --- FORMULÁRIOS ---
  const itemForm = useForm<ItemForm>({ resolver: zodResolver(itemSchema) });
  const reservationForm = useForm<ItemReservationFormValues>({
    resolver: zodResolver(itemReservationSchema),
  });

  // --- MUTATIONS ---
  const { mutate: createOrUpdateItem, isPending: isSavingItem } = useMutation({
    mutationFn: (data: ItemForm) => {
      const endpoint = editingItem
        ? `/api/items/${editingItem.id}`
        : "/api/items";
      const method = editingItem ? "patch" : "post";
      return axios[method](`${API_URL}${endpoint}`, data);
    },
    onSuccess: () => {
      toast.success(
        `Item ${editingItem ? "atualizado" : "criado"} com sucesso!`
      );
      setIsItemModalOpen(false);
      setEditingItem(null);
      itemForm.reset();
      queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
    },
    onError: (error: AxiosError<{ message: string }>) =>
      toast.error("Falha ao salvar item", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: createOrUpdateReservation, isPending: isSavingReservation } =
    useMutation({
      mutationFn: (data: ItemReservationFormValues) => {
        const timeZone = "America/Sao_Paulo";
        const startDateTime = fromZonedTime(
          `${data.startDate} ${data.startTime}`,
          timeZone
        );
        const endDateTime = fromZonedTime(
          `${data.endDate} ${data.endTime}`,
          timeZone
        );

        // 3. Validar se a hora de término é anterior ou igual à de início.
        if (!isBefore(startDateTime, endDateTime)) {
          throw new Error(
            "O horário de término deve ser posterior ao de início."
          );
        }

        const endpoint = editingReservation
          ? `/api/reserve/items/${editingReservation.id}`
          : "/api/reserve/items";
        const method = editingReservation ? "patch" : "post";
        return axios[method](`${API_URL}${endpoint}`, {
          ...data,
          userId: user!.id,
        });
      },
      onSuccess: () => {
        toast.success(
          `Reserva ${editingReservation ? "atualizada" : "criada"} com sucesso!`
        );
        setIsReservationModalOpen(false);
        setEditingReservation(null);
        reservationForm.reset();
        queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
      },
      onError: (error: AxiosError<{ message: string }>) =>
        toast.error("Falha na reserva", {
          description: error.response?.data?.message,
        }),
    });

  const { mutate: deleteMutation, isPending: isDeleting } = useMutation({
    mutationFn: (item: { type: "item" | "reservation"; id: string }) => {
      const endpoint =
        item.type === "item"
          ? `/api/items/${item.id}`
          : `/api/reserve/items/${item.id}`;
      return axios.delete(`${API_URL}${endpoint}`);
    },
    onSuccess: () => {
      toast.success("Excluído com sucesso!");
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
    },
    onError: (error: AxiosError<{ message: string }>) =>
      toast.error("Falha ao excluir", {
        description: error.response?.data?.message,
      }),
  });

  // --- HANDLERS (ITENS) ---
  const handleOpenCreateItemModal = () => {
    setEditingItem(null);
    itemForm.reset({
      name: "",
      description: "",
      status: ItemStatus.AVAILABLE,
    });
    setIsItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: ReservableItem) => {
    setEditingItem(item);
    itemForm.reset({
      name: item.name,
      description: item.description ?? "",
      status: item.status,
    });
    setIsItemModalOpen(true);
  };

  // --- HANDLERS (RESERVAS) ---
  // Criação de reserva deve ser feita pelo componente pai via CreateReserveModal.
  // Aqui apenas edição/remoção de reservas:
  const handleOpenEditReservationModal = (reservation: ItemWithRelations) => {
    setEditingReservation(reservation);
    reservationForm.reset({
      type: "item",
      title: reservation.title,
      itemId: reservation.itemId,
      startDate: format(new Date(reservation.startDate), "yyyy-MM-dd"),
      startTime: format(new Date(reservation.startDate), "HH:mm"),
      endDate: format(new Date(reservation.endDate), "yyyy-MM-dd"),
      endTime: format(new Date(reservation.endDate), "HH:mm"),
    });
    setIsReservationModalOpen(true);
  };

  // --- COLUNAS E CAMPOS ---
  const itemColumns: ColumnDef<ReservableItem>[] = [
    {
      accessorKey: "name",
      header: "Item",
      cell: (row) => (
        <div className="flex">
          <Box className="mr-2 h-4 w-4" />
          <span>{row.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) =>
        isItemAvailableForReservation(row, initialData.reservations)
          ? "Disponível"
          : row.status === "MAINTENANCE"
          ? "Em manutenção"
          : "Em uso",
    },
    {
      accessorKey: "description",
      header: "Disponível em",
      cell: (row) => {
        const reservationsForItem = initialData.reservations.filter(
          (res) => res.itemId === row.id
        );

        const now = new Date();

        // 1. Verifica se existe reserva ATIVA
        const activeReservation = reservationsForItem.find((res) => {
          const start = new Date(res.startDate);
          const end = new Date(res.endDate);
          return start <= now && now < end;
        });

        if (activeReservation) {
          return "Reservado agora";
        }

        // 2. Próxima reserva futura
        const nextReservation = reservationsForItem
          .map((res) => ({
            start: new Date(res.startDate),
          }))
          .filter(({ start }) => start > now)
          .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

        if (nextReservation) {
          return format(nextReservation.start, "dd/MM/yyyy 'às' HH:mm");
        }

        // 3. Totalmente livre
        return "Agora";
      },
    },
    {
      accessorKey: "areas",
      header: "Áreas Permitidas",
      cell: (row) =>
        row.areas
          .map((area) =>
            area === "CONSULTORIA"
              ? "Consultoria"
              : area === "DIRETORIA"
              ? "Diretoria"
              : area === "GERAL"
              ? "Geral"
              : area === "TATICO"
              ? "Tático"
              : "Sem área"
          )
          .join(", "),
    },
  ];

  const reservationColumns: ColumnDef<ItemWithRelations>[] = [
    {
      accessorKey: "item",
      header: "Item",
      cell: (row) => (
        <div className="flex">
          <Box className="mr-2 h-4 w-4" />
          <span>{row.item.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "user",
      header: "Reservado por",
      cell: (row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ">
            <AvatarImage
              className="object-cover"
              src={row.user.imageUrl ?? undefined}
            />
            <AvatarFallback>{row.user.name.substring(0, 2)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.user.name}</span>
        </div>
      ),
    },
    {
      accessorKey: "startDate",
      header: "De",
      cell: (row) => format(new Date(row.startDate), "dd/MM/yy HH:mm"),
    },
    {
      accessorKey: "endDate",
      header: "Até",
      cell: (row) => format(new Date(row.endDate), "dd/MM/yy HH:mm"),
    },
  ];

  const itemEntityFields: FieldConfig<ItemForm>[] = [
    { accessorKey: "name", header: "Nome do Item", type: "text" },
    { accessorKey: "description", header: "Descrição", type: "textarea" },
    {
      accessorKey: "areas",
      header: "Áreas Permitidas",
      type: "checkbox",
      options: Object.values(ItemAreas).map((a) => ({
        value: a,
        label:
          a === "CONSULTORIA"
            ? "Consultoria"
            : a === "TATICO"
            ? "Tático"
            : a === "DIRETORIA"
            ? "Diretoria"
            : a === "GERAL"
            ? "Geral"
            : "",
      })),
    },
    {
      accessorKey: "status",
      header: "Status",
      type: "select",
      options: Object.values(ItemStatus).map((s) => ({
        value: s,
        label:
          s === "AVAILABLE"
            ? "Disponível"
            : s === "IN_USE"
            ? "Em uso"
            : "Em manutenção",
      })),
    },
  ];

  const reservationFields: FieldConfig<ItemReservationFormValues>[] = [
    {
      accessorKey: "itemId",
      header: "Item",
      type: "select",
      options: initialData.items.map((i) => ({ value: i.id, label: i.name })),
    },
    { accessorKey: "startDate", header: "Data de Retirada", type: "date" },
    { accessorKey: "startTime", header: "Hora de Retirada", type: "time" },
    { accessorKey: "endDate", header: "Data de Devolução", type: "date" },
    { accessorKey: "endTime", header: "Hora de Devolução", type: "time" },
  ];

  const myReservations = useMemo(() => {
    return initialData.reservations.filter((res) => res.userId === user?.id);
  }, [initialData.reservations, user]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleInvalidSubmit = (errors: any) => {
    console.error("Erros de validação do formulário:", errors);
    // Pega a mensagem de erro do primeiro campo que falhou
    //@ts-expect-error Erro esperado
    const firstErrorMessage = Object.values(errors)[0].message;
    toast.error("Formulário inválido", {
      description:
        (firstErrorMessage as string) ||
        "Por favor, verifique os campos e tente novamente.",
    });
  };

  return (
    <div>
      {/* Tabela de Itens */}
      <CustomTable
        title="Itens Disponíveis"
        data={initialData.items}
        columns={itemColumns}
        filterColumns={["name", "status"]}
        type={isDirector ? "noSelection" : "onlyView"}
        onEdit={isDirector ? handleOpenEditItemModal : undefined}
        onDelete={
          isDirector
            ? (item) =>
                setItemToDelete({ id: item.id, name: item.name, type: "item" })
            : undefined
        }
        handleActionClick={isDirector ? handleOpenCreateItemModal : undefined}
        itemsPerPage={5}
      />

      <div className="mt-6" />

      <CustomTable
        title="Minhas Reservas"
        data={myReservations}
        columns={reservationColumns}
        filterColumns={["item.name", "user.name"]}
        type={"noSelection"}
        onEdit={handleOpenEditReservationModal}
        onDelete={(item) =>
          setItemToDelete({
            id: item.id,
            name: item.item.name,
            type: "reservation",
          })
        }
        itemsPerPage={5}
      />

      <div className="mt-6" />

      {/* Tabela de Reservas (somente editar/excluir aqui) */}
      {isDirector && (
        <CustomTable
          title="Próximas Reservas de Itens"
          data={initialData.reservations}
          columns={reservationColumns}
          filterColumns={["item.name", "user.name"]}
          type="noSelection"
          onEdit={handleOpenEditReservationModal}
          onDelete={(item) =>
            setItemToDelete({
              id: item.id,
              name: item.item.name,
              type: "reservation",
            })
          }
          itemsPerPage={10}
        />
      )}

      {/* Modal CRIAR/EDITAR ITEM */}
      {isItemModalOpen && (
        <CustomModal
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          title={editingItem ? "Editar Item" : "Criar Novo Item"}
          form={itemForm}
          onSubmit={createOrUpdateItem}
          isLoading={isSavingItem}
          isEditing={true}
          fields={itemEntityFields}
          setIsEditing={() => {}}
          onInvalid={handleInvalidSubmit}
        />
      )}

      {/* Modal EDITAR RESERVA */}
      {isReservationModalOpen && (
        <CustomModal
          isOpen={isReservationModalOpen}
          onClose={() => {
            setIsReservationModalOpen(false);
            setEditingReservation(null);
          }}
          title={"Editar Reserva de Item"}
          form={reservationForm}
          onSubmit={createOrUpdateReservation}
          isLoading={isSavingReservation}
          isEditing={true}
          fields={reservationFields}
          setIsEditing={() => {}}
          onInvalid={handleInvalidSubmit}
        />
      )}

      {/* Modal CONFIRMAR EXCLUSÃO */}
      {itemToDelete && (
        <ModalConfirm
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => deleteMutation(itemToDelete)}
          isLoading={isDeleting}
          title={`Confirmar Exclusão`}
          description={`Tem certeza que deseja excluir ${
            itemToDelete.type === "item" ? "o item" : "a reserva de"
          } "${itemToDelete.name}"?`}
        />
      )}
    </div>
  );
};

export default ItemsContent;
