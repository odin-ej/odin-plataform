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
import { Room } from ".prisma/client";
import {
  ExtendedReservation,
  ReservationFormValues,
  reservationSchema,
} from "@/lib/schemas/roomSchema";
import { cn } from "@/lib/utils";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ModalConfirm from "../Global/ModalConfirm";

// --- Tipos e Enums ---
enum CalendarView {
  MONTH = "month",
  WEEK = "week",
}

// Tipo para os dados "achatados" que serão passados para a tabela
type FlattenedReservation = {
  id: string;
  roomName: string;
  userName: string;
  formattedDate: string;
  original: ExtendedReservation;
};

// ===================================================================
// 2. COMPONENTE PRINCIPAL (RoomsContent)
// ===================================================================
interface RoomsContentProps {
  myReservations: ExtendedReservation[];
  allReservations: ExtendedReservation[];
  availableRooms: Room[];
  currentUserId: string;
  isDirector: boolean;
}

const RoomsContent = ({
  myReservations,
  allReservations,
  availableRooms,
  currentUserId,
  isDirector,
}: RoomsContentProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<ExtendedReservation | null>(null);
  const [view, setView] = useState<CalendarView>(CalendarView.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [removeRoomId, setRemoveRoomId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const router = useRouter();

  const form = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
  });

  const processDataForTable = (
    data: ExtendedReservation[]
  ): FlattenedReservation[] => {
    return data.map((res) => ({
      id: res.id,
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
  const processedAllReservations = useMemo(
    () => processDataForTable(allReservations),
    [allReservations]
  );

  // CORREÇÃO: useMemo movido para o nível superior do componente.
  const reservationsByDay = useMemo(() => {
    const map = new Map<string, ExtendedReservation[]>();
    allReservations.forEach((res) => {
      const dayKey = format(new Date(res.date), "yyyy-MM-dd");
      if (!map.has(dayKey)) map.set(dayKey, []);
      map.get(dayKey)?.push(res);
    });
    return map;
  }, [allReservations]);

  const openModal = (reservation?: ExtendedReservation, date?: Date) => {
    if (reservation) {
      setEditingReservation(reservation);
      form.reset({
        date: format(new Date(reservation.date), "yyyy-MM-dd"),
        hourEnter: format(new Date(reservation.hourEnter), "HH:mm"),
        hourLeave: format(new Date(reservation.hourLeave), "HH:mm"),
        roomId: reservation.roomId,
      });
    } else {
      setEditingReservation(null);
      form.reset({
        date: date ? format(date, "yyyy-MM-dd") : "",
        hourEnter: "",
        hourLeave: "",
        roomId: undefined,
      });
    }
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (data: ReservationFormValues) => {
    try {
      setIsLoading(true);
      const reservationDate = parse(data.date, "yyyy-MM-dd", new Date());
      const hourEnter = new Date(`${data.date}T${data.hourEnter}:00`);
      const hourLeave = new Date(`${data.date}T${data.hourLeave}:00`);

      if (hourLeave <= hourEnter) {
        toast.error("Erro de Validação", {
          description:
            "O horário de saída deve ser posterior ao horário de entrada.",
        });
        return;
      }

      // **Lógica de Verificação de Conflito**
      const hasConflict = allReservations.some((res) => {
        // Ignora a própria reserva durante a edição
        if (editingReservation && res.id === editingReservation.id) {
          return false;
        }
        // Verifica se é na mesma sala
        if (res.roomId !== data.roomId) {
          return false;
        }
        // Compara os intervalos de tempo
        setIsLoading(false);
        return areIntervalsOverlapping(
          { start: hourEnter, end: hourLeave },
          { start: new Date(res.hourEnter), end: new Date(res.hourLeave) },
          { inclusive: false } // Não permite sobreposição nem mesmo de 1 segundo
        );
      });

      if (hasConflict) {
        toast.error("Conflito de Reserva", {
          description:
            "Esta sala já está reservada para o horário selecionado. Por favor, escolha outro horário.",
        });
        setIsLoading(false);
        return;
      }

      const payload = {
        date: reservationDate.toISOString(),
        hourEnter: hourEnter.toISOString(),
        hourLeave: hourLeave.toISOString(),
        roomId: data.roomId,
        userId: currentUserId,
        status: "BUSY", // Supondo que uma reserva criada está sempre ocupada
      };

      const endpoint = editingReservation
        ? `/api/reserve/${editingReservation.id}`
        : "/api/reserve";
      const method = editingReservation ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Falha ao ${editingReservation ? "atualizar" : "criar"} a reserva.`
        );
      }

      toast.success(
        `Reserva ${editingReservation ? "atualizada" : "criada"} com sucesso!`
      );
      setIsModalOpen(false);
      router.refresh();
    } catch (error: any) {
      toast.error("Erro", { description: error.message });
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if(isLoading) return;
    try {
      setIsLoading(true)
      const response = await fetch(`/api/reserve/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Falha ao cancelar a reserva.");
      toast.success("Reserva cancelada com sucesso!");
      router.refresh();
          setIsConfirmModalOpen(false)
    } catch (error: any) {
      toast.error("Erro", { description: error.message });
    }
    setIsLoading(false)
    setIsConfirmModalOpen(false)
  };

  const handleClickDeleteButton = (linkId: string) => {
    setIsConfirmModalOpen(true);
    setRemoveRoomId(linkId);
  };

  const createColumns = (
    isMyReservations: boolean
  ): ColumnDef<FlattenedReservation>[] => [
    { accessorKey: "roomName", header: "Sala" },
    { accessorKey: "formattedDate", header: "Período" },
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
                onClick={() => handleClickDeleteButton(row.original.id)}
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
            return (
              <div
                key={day.toString()}
                className={cn(
                  "h-24 sm:h-32 p-1 sm:p-2 border border-gray-800 rounded-md cursor-pointer transition-colors overflow-hidden",
                  view === "month" &&
                    !isSameMonth(day, monthStart) &&
                    "text-gray-600 bg-black/20 pointer-events-none",
                  isToday(day) && "bg-blue-500/20",
                  "hover:bg-[#00205e]"
                )}
                onClick={() => {
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
                        title={`${format(new Date(res.hourEnter), "HH:mm")} ${
                          res.room.name
                        } - ${res.user.name}`}
                      >
                        <span className="hidden sm:inline">{`${format(
                          new Date(res.hourEnter),
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
        isLoading={isLoading}
        isEditing={true}
        fields={[
          {
            accessorKey: "date",
            header: "Data da Reserva",
            mask: "date",
            type: "date",
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

      {typeof removeRoomId === "string" && isConfirmModalOpen && (
        <ModalConfirm
          open={isConfirmModalOpen}
          onCancel={() => setIsConfirmModalOpen(false)}
          onConfirm={() => handleDelete(removeRoomId)}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

export default RoomsContent;
