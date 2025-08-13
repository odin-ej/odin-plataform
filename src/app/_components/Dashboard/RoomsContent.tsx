/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// RoomsContent.tsx

"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  parse,
  addDays,
  areIntervalsOverlapping,
  isBefore,
  startOfToday,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// Componentes UI e Tipos
import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import CustomModal from "../Global/Custom/CustomModal";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Room } from "@prisma/client";
import {
  ExtendedReservation,
  ReservationFormValues,
  reservationSchema,
} from "@/lib/schemas/roomSchema";
import { cn } from "@/lib/utils";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ModalConfirm from "../Global/ModalConfirm";
import { RoomsPageData } from "@/app/(dashboard)/reserva-salinhas/page";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

/*
Agrupar todas as reservas em um só lugar

Fazer uma forma de dividir entre duas formas: itens e salas.
  Fazer sistema de Tabs navigation para reserva de salinhas, salas eaufba
  Fazer sistema de Tabs navigation para reserva de notebooks, cameras

**/

// --- Tipos e Enums ---
enum CalendarView {
  MONTH = "month",
  WEEK = "week",
}

// Tipo para os dados "achatados" que serão passados para a tabela
type FlattenedReservation = {
  id: string;
  title: string;
  roomName: string;
  userName: string;
  formattedDate: string;
  original: ExtendedReservation;
};

// ===================================================================
// 2. COMPONENTE PRINCIPAL (RoomsContent)
// ===================================================================
interface RoomsContentProps {
  initialData: RoomsPageData;
  currentUserId: string;
  isDirector: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RoomsContent = ({
  initialData,
  currentUserId,
  isDirector,
}: RoomsContentProps) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<ExtendedReservation | null>(null);
  const [view, setView] = useState<CalendarView>(CalendarView.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [itemToDelete, setItemToDelete] = useState<ExtendedReservation | null>(
    null
  );

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
  });

  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["reservationsData"],
    queryFn: async (): Promise<RoomsPageData> => {
      const { data } = await axios.get(`${API_URL}/api/reserve`);
      return data;
    },
    initialData: initialData,
  });

  // Data from query is the source of truth
  const availableRooms = data?.rooms || [];

  // --- MUTATIONS for Create, Update, Delete ---
  const { mutate: createOrUpdateReservation, isPending: isSaving } =
    useMutation({
      mutationFn: async (formData: ReservationFormValues) => {
        // ... your date parsing and validation logic from handleFormSubmit ...
        const hourEnter = new Date(`${formData.date}T${formData.hourEnter}:00`);
        const hourLeave = new Date(`${formData.date}T${formData.hourLeave}:00`);
        // The conflict check can now also be part of the mutation
        const freshData = await queryClient.fetchQuery<RoomsPageData>({
          queryKey: ["reservationsData"],
        });
        const freshReservations = freshData.reservations;
        const hasConflict = freshReservations.some((res) => {
          if (editingReservation && res.id === editingReservation.id)
            return false;
          if (res.roomId !== formData.roomId) return false;
          return areIntervalsOverlapping(
            { start: hourEnter, end: hourLeave },
            { start: new Date(res.hourEnter), end: new Date(res.hourLeave) }
          );
        });

        if (hourEnter >= hourLeave) {
          throw new Error(
            "Hora de entrada deve ser menor que a hora de saída."
          );
        }

        if (hasConflict)
          throw new Error(
            "Esta sala já está reservada para o horário selecionado."
          );

        const payload = {
          title: formData.title,
          date: hourEnter.toISOString(),
          hourEnter: hourEnter.toISOString(),
          hourLeave: hourLeave.toISOString(),
          roomId: formData.roomId,
          userId: currentUserId,
          status: "BUSY",
        };

        const endpoint = editingReservation
          ? `${API_URL}/api/reserve/${editingReservation.id}`
          : `${API_URL}/api/reserve`;
        const method = editingReservation ? "patch" : "post";
        const { data } = await axios[method](endpoint, payload);
        return data;
      },
      onSuccess: (_, formData) => {
        toast.success(
          `Reserva ${editingReservation ? "atualizada" : "criada"} com sucesso!`
        );
        setIsModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
      },
      onError: (error: any) =>
        toast.error("Erro na reserva", {
          description: error.message || error.response?.data?.message,
        }),
    });

  const { mutate: deleteReservation, isPending: isDeleting } = useMutation({
    mutationFn: (reservationId: string) =>
      axios.delete(`${API_URL}/api/reserve/${reservationId}`),
    onSuccess: () => {
      toast.success("Reserva cancelada com sucesso!");
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao cancelar", {
        description: error.response?.data?.message,
      }),
  });

  // --- Simplified Handlers ---
  const handleFormSubmit = (formData: ReservationFormValues) =>
    createOrUpdateReservation(formData);
  const handleDeleteConfirm = () =>
    itemToDelete && deleteReservation(itemToDelete.id);

  // --- Derived Data (useMemo) ---
  const myReservations = useMemo(() => {
    // 1. Pega a lista de dentro do useMemo. Se não existir, usa um array vazio local.
    const reservations = data?.reservations || [];
    // 2. Faz o filtro
    return reservations.filter((res) => res.userId === currentUserId);
  }, [data?.reservations, currentUserId]);

  const processDataForTable = (
    data: ExtendedReservation[]
  ): FlattenedReservation[] => {
    return data.map((res) => ({
      id: res.id,
      title: res.title,
      roomName: res.room.name,
      userName: res.user.name,
      formattedDate:
        format(new Date(res.hourEnter), "dd/MM/yyyy HH:mm") +
        " - " +
        format(new Date(res.hourLeave), "HH:mm"),
      original: res,
    }));
  };

  const processedMyReservations = useMemo(
    () => processDataForTable(myReservations),
    [myReservations]
  );
  const processedAllReservations = useMemo(() => {
    // 1. Pega a lista de dentro do useMemo. Se não existir, usa um array vazio local.
    const reservations = data?.reservations || [];

    // 2. Chama a função de processamento com a lista estável.
    return processDataForTable(reservations);
  }, [data?.reservations]);

  // CORREÇÃO: useMemo movido para o nível superior do componente.
  const reservationsByDay = useMemo(() => {
    const map = new Map<string, ExtendedReservation[]>();
    const reservations = data?.reservations || [];
    reservations.forEach((res) => {
      const dayKey = format(new Date(res.date), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)?.push(res);
    });
    return map;
  }, [data.reservations]);

  const openModal = (reservation?: ExtendedReservation, date?: Date) => {
    if (reservation) {
      setEditingReservation(reservation);
      form.reset({
        date: format(new Date(reservation.date), "yyyy-MM-dd"),
        title: reservation.title,
        hourEnter: format(new Date(reservation.hourEnter), "HH:mm"),
        hourLeave: format(new Date(reservation.hourLeave), "HH:mm"),
        roomId: reservation.roomId,
      });
    } else {
      setEditingReservation(null);
      form.reset({
        date: date ? format(date, "yyyy-MM-dd") : "",
        title: "",
        hourEnter: "",
        hourLeave: "",
        roomId: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const createColumns = (
    isMyReservations: boolean
  ): ColumnDef<FlattenedReservation>[] => [
    { accessorKey: "roomName", header: "Sala" },
    { accessorKey: "formattedDate", header: "Período" },
    { accessorKey: 'title', header: 'Titulo' },
    {
      accessorKey: "userName",
      header: "Reservado por",
      cell: (row) => (
        <div className="flex items-center gap-3 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.original.user.imageUrl as string}
              alt={row.original.user.name}
              className="object-cover rounded-full"
            />
            <AvatarFallback className="bg-[#0126fb] text-xs">
              {row.original.user.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <span className="font-medium">
            {row.original.user.name.split(" ")[0] +
              " " +
              row.original.user.name.split(" ")[
                row.original.user.name.split(" ").length - 1
              ]}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "Ações",
      cell: (row) => {
        if (isDirector || isMyReservations) {
          return (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => openModal(row.original)}
              >
                <Pencil className="h-4 w-4 text-[#f5b719]" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setItemToDelete(row.original)}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          );
        }
        return null;
      },
    },
  ];

  // ===================================================================
  // RENDERIZAÇÃO DO CALENDÁRIO
  // ===================================================================
  const renderCalendar = () => {
    const moveDate = (amount: number) => {
      if (view === CalendarView.MONTH) {
        setCurrentDate(addMonths(currentDate, amount));
      } else {
        setCurrentDate(addDays(currentDate, amount * 7));
      }
    };

    const headerFormat =
      view === CalendarView.MONTH ? "MMMM yyyy" : "MMMM yyyy";
    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const weekStart = startOfWeek(currentDate, { locale: ptBR });

    const days =
      view === CalendarView.MONTH
        ? eachDayOfInterval({
            start: startOfWeek(monthStart, { locale: ptBR }),
            end: endOfWeek(monthEnd, { locale: ptBR }),
          })
        : eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
    return (
      <div className="w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-2 sm:p-6 text-white shadow-lg">
        {/* Cabeçalho Responsivo */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="icon" onClick={() => moveDate(-1)}>
              <ChevronLeft />
            </Button>
            <h2 className="text-lg sm:text-xl font-bold text-center text-[#f5b719] capitalize w-32 sm:w-auto">
              {format(currentDate, headerFormat, { locale: ptBR })}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => moveDate(1)}>
              <ChevronRight />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setView(CalendarView.WEEK)}
              variant={view === "week" ? "default" : "ghost"}
              disabled={view === "week"}
              className="bg-[#0126fb] hover:bg-[#0126fb]/80 px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm"
            >
              Semana
            </Button>
            <Button
              onClick={() => setView(CalendarView.MONTH)}
              disabled={view === "month"}
              variant={view === "month" ? "default" : "ghost"}
              className="bg-[#0126fb] hover:bg-[#0126fb]/80 px-3 py-1 text-xs sm:px-4 sm:py-2 sm:text-sm"
            >
              Mês
            </Button>
          </div>
        </div>

        {/* Dias da Semana Responsivos */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-400 mb-2">
          {weekDays.map((day) => (
            <div key={day}>
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Grid do Calendário Responsivo */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const dayKey = format(day, "yyyy-MM-dd");
            const dayReservations = reservationsByDay.get(dayKey) || [];
            const MAX_VISIBLE_RESERVATIONS = 2;
            const sortedReservations = dayReservations.sort(
              (a, b) =>
                new Date(a.hourEnter).getTime() -
                new Date(b.hourEnter).getTime()
            );
            const isPast = isBefore(day, startOfToday());
            return (
              <div
                key={day.toString()}
                className={cn(
                  "h-24 sm:h-32 p-1 sm:p-2 border border-gray-800 rounded-md cursor-pointer transition-colors overflow-hidden",
                  view === "month" &&
                    !isSameMonth(day, monthStart) &&
                    "text-gray-600 bg-black/20 pointer-events-none",
                  isPast && "text-gray-600 bg-black/20 pointer-events-none",
                  isToday(day) && "bg-blue-500/20",
                  "hover:bg-[#00205e]"
                )}
                onClick={() => {
                  if (isPast) return;
                  if (view === "month" && !isSameMonth(day, monthStart)) return;
                  openModal(undefined, day);
                }}
              >
                <span
                  className={cn(
                    "font-bold text-xs sm:text-base",
                    isToday(day) && "text-[#f5b719]"
                  )}
                >
                  {format(day, "d")}
                </span>
                <div className="mt-1 space-y-1 text-[10px] sm:text-xs overflow-y-auto max-h-[6.5rem] scrollbar-thin scrollbar-thumb-gray-700">
                  {/* Lógica para limitar as reservas visíveis */}
                  {sortedReservations
                    .slice(0, MAX_VISIBLE_RESERVATIONS)
                    .map((res) => (
                      <div
                        key={res.id}
                        className="bg-[#0126fb]/70 p-1 rounded truncate"
                        title={`${format(new Date(res.hourEnter), "HH:mm")} - ${format(new Date(res.hourLeave), "HH:mm")} ${
                          res.room.name
                        } - ${res.user.name}`}
                      >
                        <span className="hidden sm:inline">{`${format(
                          new Date(res.hourEnter),
                          "HH:mm"
                        )} `}</span>{" "}
                        -{" "}
                        <span className="hidden sm:inline">{`${format(
                          new Date(res.hourLeave),
                          "HH:mm"
                        )} `}</span>
                        <span className="font-semibold">{res.room.name}</span>
                      </div>
                    ))}
                  {/* Indicador de mais reservas */}
                  {sortedReservations.length > MAX_VISIBLE_RESERVATIONS && (
                    <div className="text-center text-gray-400 font-bold pt-1">
                      + {sortedReservations.length - MAX_VISIBLE_RESERVATIONS}{" "}
                      mais...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <>
      <CustomCard
        value={0}
        title="Reserva de Salinhas"
        type="introduction"
        icon={CalendarClock}
        description="Acompanhe e faça a reserva de salinhas."
      />

      <div className="mt-6">{renderCalendar()}</div>

      <div className="mt-6 space-y-8">
        <CustomTable<FlattenedReservation>
          data={processedMyReservations}
          columns={createColumns(true)}
          filterColumns={["roomName", "userName", "formattedDate"]}
          title="Minhas Reservas"
          itemsPerPage={5}
          type="onlyView"
        />
        <CustomTable<FlattenedReservation>
          data={processedAllReservations}
          columns={createColumns(false)}
          filterColumns={["roomName", "userName", "formattedDate"]}
          title="Últimas Reservas"
          itemsPerPage={5}
          type="onlyView"
        />
      </div>

      <CustomModal<ReservationFormValues>
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReservation ? "Editar Reserva" : "Criar Nova Reserva"}
        form={form}
        setIsEditing={setIsModalOpen}
        onSubmit={handleFormSubmit}
        isLoading={isSaving}
        isEditing={true}
        fields={[
          {
            accessorKey: "date",
            header: "Data da Reserva",
            mask: "date",
            type: "date",
          },
          {
            accessorKey: "title",
            header: "Título da Reserva",
            type: "text",
          },
          {
            accessorKey: "hourEnter",
            header: "Horário de Entrada",
            type: "time",
          },
          {
            accessorKey: "hourLeave",
            header: "Horário de Saída",
            type: "time",
          },
          {
            accessorKey: "roomId",
            header: "Sala",
            type: "select",
            options: availableRooms.map((room) => ({
              value: room.id,
              label: room.name,
            })),
          },
        ]}
      />

      {itemToDelete && (
        <ModalConfirm
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          onConfirm={handleDeleteConfirm}
          isLoading={isDeleting}
        />
      )}
    </>
  );
};

export default RoomsContent;
