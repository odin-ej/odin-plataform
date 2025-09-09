/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import CustomInput from "../../Global/Custom/CustomInput";
import CustomSelect from "../../Global/Custom/CustomSelect";
import { areIntervalsOverlapping, format } from "date-fns";
import { Room, ReservableItem, RoomStatus, ItemAreas } from "@prisma/client";
import { AlertCircle, Box, CalendarIcon, CheckCircle, Loader2, School } from "lucide-react";
import {
  ExtendedReservation,
  ReservationFormValues,
  reservationSchema,
} from "@/lib/schemas/reservationsSchema";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import { useAuth } from "@/lib/auth/AuthProvider";
import { ItemWithRelations } from "./ItemsContent";
import { fromZonedTime } from "date-fns-tz";
import { toast } from "sonner";

export const getDefaultValuesByType = (
  type: "salinha" | "item" | "eaufba",
  selectedDate: Date
): ReservationFormValues => {
  const formattedDate = format(selectedDate, "yyyy-MM-dd");

  switch (type) {
    case "salinha":
      return {
        type: "salinha",
        date: formattedDate,
        title: "",
        hourEnter: "",
        hourLeave: "",
        roomId: "",
        status: RoomStatus.BUSY, // ou o status inicial que você quiser
      };

    case "item":
      return {
        type: "item",
        id: undefined,
        title: "",
        itemId: "",
        startDate: formattedDate,
        startTime: "",
        endDate: formattedDate,
        endTime: "",
      };

    case "eaufba":
      return {
        type: "eaufba",
        date: formattedDate,
        title: "",
        description: "",
      };
  }
};

interface CreateReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  // Mutations que vêm do componente pai
  createRoomReservation: (data: any) => void;
  createItemReservation: (data: any) => void;
  createEaufbaRequest: (data: any) => void;
  // Dados para preencher os selects
  rooms: Room[];
  items: ReservableItem[];
  isLoading: boolean;
  existingRoomReservations: ExtendedReservation[];
  existingItemReservations: ItemWithRelations[];
}

const CreateReservationModal = ({
  isOpen,
  onClose,
  selectedDate,
  createRoomReservation,
  createItemReservation,
  createEaufbaRequest,
  rooms,
  items,
  isLoading,
  existingRoomReservations,
  existingItemReservations,
}: CreateReservationModalProps) => {
  const [activeTab, setActiveTab] = useState<"salinha" | "item" | "eaufba">(
    "salinha"
  );

  const { user } = useAuth();
  const timeZone = 'America/Sao_Paulo'
  const form = useForm<ReservationFormValues>({
    // O resolver muda dinamicamente com a aba
    resolver: zodResolver(reservationSchema),
    defaultValues: getDefaultValuesByType("salinha", selectedDate),
  });

  const watchDate = form.watch("date");
  const watchStart = form.watch("hourEnter");
  const watchEnd = form.watch("hourLeave");
  const watchRoom = form.watch("roomId");

  const watchItemId = form.watch("itemId");
  const watchItemStartDate = form.watch("startDate");
  const watchItemEndDate = form.watch("endDate");
  const watchItemStartTime = form.watch("startTime");
  const watchItemEndTime = form.watch("endTime");

  // ⚡ Verifica se há conflito em tempo real
  const conflictRoomInfo = useMemo(() => {
    if (!watchDate || !watchStart || !watchEnd || !watchRoom) return null;

    const newInterval = {
      start: fromZonedTime(`${watchDate} ${watchStart}`, "America/Sao_Paulo"),
      end: fromZonedTime(`${watchDate} ${watchEnd}`, "America/Sao_Paulo"),
    };

    if (newInterval.start >= newInterval.end) {
      return {
        type: "invalid",
        message: "Horário inicial deve ser antes do final.",
      };
    }

    const hasConflict = existingRoomReservations.some((reservation) => {
      if (reservation.roomId !== watchRoom) return false;
      return areIntervalsOverlapping(newInterval, {
        start: new Date(reservation.hourEnter),
        end: new Date(reservation.hourLeave),
      });
    });

    if (hasConflict) {
      return { type: "conflict", message: "Já existe reserva nesse horário." };
    }

    return { type: "free", message: "Horário disponível!" };
  }, [watchDate, watchStart, watchEnd, watchRoom, existingRoomReservations]);

  const occupiedRoomTimes = useMemo(() => {
    if (!watchDate || !watchRoom) return [];
    return existingRoomReservations
      .filter(
        (r) =>
          r.roomId === watchRoom &&
          format(new Date(r.hourEnter), "yyyy-MM-dd") === watchDate
      )
      .map((r) => ({
        start: format(new Date(r.hourEnter), "HH:mm"),
        end: format(new Date(r.hourLeave), "HH:mm"),
      })).sort((a, b) => (a.start > b.start ? 1 : -1));;
  }, [watchDate, watchRoom, existingRoomReservations]);

  const conflictItemInfo = useMemo(() => {
    if (
      !watchItemId ||
      !watchItemStartDate ||
      !watchItemEndDate ||
      !watchItemStartTime ||
      !watchItemEndTime
    )
      return null;

    const newInterval = {
      start: fromZonedTime(
        `${watchItemStartDate} ${watchItemStartTime}`,
        timeZone
      ),
      end: fromZonedTime(`${watchItemEndDate} ${watchItemEndTime}`, timeZone),
    };

    if (newInterval.start >= newInterval.end) {
      return {
        type: "invalid",
        message: "Data/hora inicial deve ser antes da final.",
      };
    }

    const hasConflict = existingItemReservations.some((reservation) => {
      if (reservation.itemId !== watchItemId) return false;
      return areIntervalsOverlapping(newInterval, {
        start: new Date(reservation.startDate),
        end: new Date(reservation.endDate),
      });
    });

    if (hasConflict)
      return {
        type: "conflict",
        message: "Este item já está reservado nesse período.",
      };
    return { type: "free", message: "Item disponível!" };
  }, [
    watchItemId,
    watchItemStartDate,
    watchItemEndDate,
    watchItemStartTime,
    watchItemEndTime,
    existingItemReservations,
  ]);

  // 🕒 Lista de períodos já reservados do item
  const occupiedItemTimes = useMemo(() => {
    if (!watchItemId) return [];
    return existingItemReservations
      .filter((r) => r.itemId === watchItemId)
      .map((r) => ({
        start: format(new Date(r.startDate), "dd/MM HH:mm"),
        end: format(new Date(r.endDate), "dd/MM HH:mm"),
      }));
  }, [watchItemId, existingItemReservations]).sort((a, b) => (a.start > b.start ? 1 : -1));;

  const onSubmit = (data: ReservationFormValues) => {
    const timeZone = "America/Sao_Paulo";

    // --- VERIFICAÇÃO DE CONFLITO PARA SALINHAS ---
    if (data.type === "salinha") {
      const newInterval = {
        start: fromZonedTime(`${data.date} ${data.hourEnter}`, timeZone),
        end: fromZonedTime(`${data.date} ${data.hourLeave}`, timeZone),
      };

      // Valida se a hora de início é anterior à de fim
      if (newInterval.start >= newInterval.end) {
        toast.error("Horário inválido", {
          description: "A hora de início deve ser anterior à hora de término.",
        });
        return; // Interrompe a submissão
      }

      const hasConflict = existingRoomReservations.some((reservation) => {
        // Verifica apenas as reservas da mesma sala
        if (reservation.roomId !== data.roomId) {
          return false;
        }
        const existingInterval = {
          start: new Date(reservation.hourEnter),
          end: new Date(reservation.hourLeave),
        };
        return areIntervalsOverlapping(newInterval, existingInterval);
      });

      if (hasConflict) {
        toast.error("Conflito de agendamento", {
          description:
            "Esta sala já está reservada para o horário selecionado.",
        });
        return; // Interrompe a submissão
      }

      createRoomReservation(data);
    }

    // --- VERIFICAÇÃO DE CONFLITO PARA ITENS ---
    else if (data.type === "item") {
      const newInterval = {
        start: fromZonedTime(`${data.startDate} ${data.startTime}`, timeZone),
        end: fromZonedTime(`${data.endDate} ${data.endTime}`, timeZone),
      };

      if (newInterval.start >= newInterval.end) {
        toast.error("Período inválido", {
          description: "A data/hora de início deve ser anterior à de término.",
        });
        return;
      }

      const hasConflict = existingItemReservations.some((reservation) => {
        if (reservation.itemId !== data.itemId) {
          return false;
        }
        const existingInterval = {
          start: new Date(reservation.startDate),
          end: new Date(reservation.endDate),
        };
        return areIntervalsOverlapping(newInterval, existingInterval);
      });

      if (hasConflict) {
        toast.error("Conflito de agendamento", {
          description:
            "Este item já está reservado para o período selecionado.",
        });
        return;
      }

      createItemReservation(data);
    }

    // --- LÓGICA PARA EAUFBA (SEM VERIFICAÇÃO DE CONFLITO) ---
    else if (data.type === "eaufba") {
      createEaufbaRequest(data);
    }
  };

  const userHasPermissionToItem = (item: ReservableItem) => {
    const userCurrentRoleAreas = user?.currentRole.area;
    if (
      item.areas.includes(ItemAreas.GERAL) ||
      item.areas.includes(ItemAreas.DIRETORIA)
    )
      return true;
    return userCurrentRoleAreas?.some((area: string) =>
      item.areas.includes(area as ItemAreas)
    );
  };

  const itensAvailable = items
    .filter(
      (item) =>
        item.status !== "IN_USE" &&
        item.status !== "MAINTENANCE" &&
        userHasPermissionToItem(item)
    )
    .map((item) => ({ value: item.id, label: item.name }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#010d26] max-w-none w-[90%] overflow-y-auto sm:w-[%50] scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent max-h-[80vh] text-white border-2 border-[#0126fb]">
        <DialogHeader>
          <DialogTitle>Criar Nova Reserva</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value as "salinha" | "item" | "eaufba");
                form.reset(
                  getDefaultValuesByType(
                    value as "salinha" | "item" | "eaufba",
                    selectedDate
                  )
                );
              }}
              className="w-full mt-4"
            >
              <TabsList className="grid w-full h-full grid-cols-1 sm:grid-cols-3 bg-transparent text-[#f5b719] border-[#f5b719] border-2">
                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10 data-[state=active]:text-white"
                  value="salinha"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" /> Salinhas
                </TabsTrigger>
                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10 data-[state=active]:text-white"
                  value="eaufba"
                >
                  <School className="mr-2 h-4 w-4" /> Salas EAUFBA
                </TabsTrigger>
                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10 data-[state=active]:text-white"
                  value="item"
                >
                  <Box className="mr-2 h-4 w-4" /> Equipamentos
                </TabsTrigger>
              </TabsList>

              <div className="mt-6 space-y-4">
                <TabsContent value="salinha" className="space-y-4">
                  <CustomInput
                    form={form}
                    field="title"
                    label="Título da Reserva"
                  />
                  <CustomInput
                    form={form}
                    field="date"
                    label="Data da Reserva"
                    type="date"
                  />
                  <CustomSelect
                    control={form.control}
                    name="roomId"
                    label="Sala"
                    placeholder="Selecione a salinha..."
                    options={rooms.map((r) => ({ value: r.id, label: r.name }))}
                  />
                  <div className="flex gap-4">
                    <CustomInput
                      form={form}
                      field="hourEnter"
                      label="Início"
                      type="time"
                    />
                    <CustomInput
                      form={form}
                      field="hourLeave"
                      label="Fim"
                      type="time"
                    />
                  </div>

                  {conflictRoomInfo && (
                    <p
                      className={`flex items-center gap-2 text-sm ${conflictRoomInfo.type === "free" ? "text-green-500" : "text-red-500"}`}
                    >
                      {conflictRoomInfo.type === "free" ? (
                        <CheckCircle size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      {conflictRoomInfo.message}
                    </p>
                  )}

                  {occupiedRoomTimes.length > 0 && (
                    <div className="text-xs text-gray-400 mt-2">
                      <p>Horários já reservados neste dia:</p>
                      <ul className="list-disc ml-4">
                        {occupiedRoomTimes.map((t, idx) => (
                          <li key={idx}>
                            {t.start} - {t.end}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="item" className="space-y-4">
                  <CustomSelect
                    control={form.control}
                    name="itemId"
                    label="Item"
                    placeholder="Selecione o item..."
                    options={itensAvailable}
                  />
                  <CustomInput
                    field="startDate"
                    form={form}
                    label="Dia de Retirada"
                    type="date"
                  />
                  <CustomInput
                    field="endDate"
                    form={form}
                    label="Dia de Devolução"
                    type="date"
                  />
                  <div className="flex flex-col sm:flex-row gap-4">
                    <CustomInput
                      form={form}
                      field="startTime"
                      label="Hora de Retirada"
                      type="time"
                    />
                    <CustomInput
                      form={form}
                      field="endTime"
                      label="Hora de Devolução"
                      type="time"
                    />
                  </div>

                  {conflictItemInfo && (
                    <p
                      className={`flex items-center gap-2 text-sm ${conflictItemInfo.type === "free" ? "text-green-500" : "text-red-500"}`}
                    >
                      {conflictItemInfo.type === "free" ? (
                        <CheckCircle size={16} />
                      ) : (
                        <AlertCircle size={16} />
                      )}
                      {conflictItemInfo.message}
                    </p>
                  )}

                  {occupiedItemTimes.length > 0 && (
                    <div className="text-xs text-gray-400 mt-2">
                      <p>Reservas já feitas para este item:</p>
                      <ul className="list-disc ml-4">
                        {occupiedItemTimes.map((t, idx) => (
                          <li key={idx}>
                            {t.start} → {t.end}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="eaufba" className="space-y-4">
                  <CustomInput
                    form={form}
                    field="title"
                    label="Título da Solicitação"
                  />
                  <CustomInput
                    form={form}
                    label="Data da Solicitação"
                    field="date"
                    type="date"
                  />
                  <CustomTextArea
                    form={form}
                    field="description"
                    label="Descrição / Justificativa"
                  />
                </TabsContent>
              </div>
            </Tabs>
            <DialogFooter className="mt-6">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-[#0126fb] hover:bg-[#0126fb]/80 transition-colors"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  "Confirmar Reserva"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
export default CreateReservationModal;
