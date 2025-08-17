/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
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
import { Box, CalendarIcon, Loader2, School } from "lucide-react";
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
  existingItemReservations
}: CreateReservationModalProps) => {
  const [activeTab, setActiveTab] = useState<"salinha" | "item" | "eaufba">(
    "salinha"
  );

  const { user } = useAuth();

  const form = useForm<ReservationFormValues>({
    // O resolver muda dinamicamente com a aba
    resolver: zodResolver(reservationSchema),
    defaultValues: getDefaultValuesByType("salinha", selectedDate),
  });

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
      <DialogContent className="bg-[#010d26] max-w-none scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent w-[70%] max-h-[80vh] scrollb text-white border-2 border-[#0126fb]">
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
              <TabsList className="grid w-full grid-cols-3 bg-transparent text-[#f5b719] border-[#f5b719] border-2">
                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                  value="salinha"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" /> Salinhas
                </TabsTrigger>
                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                  value="eaufba"
                >
                  <School className="mr-2 h-4 w-4" /> Salas EAUFBA
                </TabsTrigger>
                <TabsTrigger
                  className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
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
                  <div className="flex gap-4">
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
