/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  School,
  Box,
  CalendarClock,
  Loader2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CustomCard from "../../Global/Custom/CustomCard";
import RoomsContent from "./RoomsContent";
import SalasEaufbaContent from "./SalasEaufbaContent";
import ItemsContent from "./ItemsContent";
import { ReservationsPageData } from "@/app/(dashboard)/central-de-reservas/page";
import UnifiedCalendar, { CalendarEvent } from "./UnifiedCalendar";
import { useAuth } from "@/lib/auth/AuthProvider";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import CreateReservationModal from "./CreateReservationModal"; // Modal genérico para criação
import { toast } from "sonner";
import {
  EaufbaReservationFormValues,
  ItemForm,
  RoomReservationFormValues,
} from "@/lib/schemas/reservationsSchema";
import DailyScheduleView from "./DailyScheduleView";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const ReservationsContent = ({
  initialData,
}: {
  initialData: ReservationsPageData;
}) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("salinhas");

  const queryClient = useQueryClient();
  const canMutate = checkUserPermission(user, DIRECTORS_ONLY) || checkUserPermission(user, {allowedRoles: ['Gerente de Conexões']});
  const isDirector = checkUserPermission(user, DIRECTORS_ONLY)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data } = useQuery<ReservationsPageData>({
    queryKey: ["reservationsData"],
    queryFn: async () => {
      const response = await axios.get<ReservationsPageData>(
        `${API_URL}/api/reserve/central`
      );
      return response.data;
    },
    initialData,
  });

  const {
    eaufbaRequests,
    itemReservations,
    reservableItems,
    roomReservations,
    rooms,
  } = data || {};
  // --- Mutations para criação ---
  const { mutate: createReservation, isPending: isCreatingReservation } =
    useMutation({
      mutationFn: async (formData: RoomReservationFormValues) =>
        axios.post("/api/reserve", formData),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
        toast.success("Reserva realizada com sucesso!");
        setIsModalOpen(false);
      },
      onError: (error: any) => {
        toast.error("Houve um erro ao realizar a reserva: ", error.message);
      },
    });

  const { mutate: createEaufba, isPending: isCreatingEaufba } = useMutation({
    mutationFn: async (formData: EaufbaReservationFormValues) =>
      axios.post("/api/reserve/salas-eaufba", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
      toast.success("Reserva realizada com sucesso!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error("Houve um erro ao realizar a reserva: ", error.message);
    },
  });

  const { mutate: createItem, isPending: isCreatingItem } = useMutation({
    mutationFn: async (formData: ItemForm) =>
      axios.post("/api/reserve/items", formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
      toast.success("Reserva realizada com sucesso!");
      setIsModalOpen(false);
    },
    onError: (error: any) => {
      toast.error("Houve um erro ao realizar a reserva: ", error.message);
    },
  });

  const allEvents = useMemo((): CalendarEvent[] => {
    if (!roomReservations || !eaufbaRequests || !itemReservations) return [];
    const roomEvents = roomReservations.map((r) => ({
      id: r.id,
      title: r.title || r.room.name,
      start: new Date(r.hourEnter),
      end: new Date(r.hourLeave),
      type: "salinha" as const,
      color: "#0126fb",
      original: r,
    }));
    const eaufbaEvents = eaufbaRequests
      .filter((r) => r.status === "APPROVED")
      .map((r) => ({
        id: r.id,
        title: r.title,
        start: new Date(r.date),
        end: new Date(r.date),
        type: "eaufba" as const,
        color: "#010d26",
        original: r,
      }));
    const itemEvents = itemReservations.map((r) => ({
      id: r.id,
      title: r.item.name,
      start: new Date(r.startDate),
      end: new Date(r.endDate),
      type: "item" as const,
      color: "#f5b719",
      original: r,
    }));
    return [...roomEvents, ...eaufbaEvents, ...itemEvents];
  }, [eaufbaRequests, itemReservations, roomReservations]);

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedDate(event.start);
    setActiveTab(
      event.type === "salinha"
        ? "salinhas"
        : event.type === "item"
          ? "itens"
          : "salasEaufba"
    );
    setIsModalOpen(true);
  };

  const allReservations = useMemo(() => {
    if (!roomReservations || !itemReservations || !eaufbaRequests) return [];
    return [
      ...roomReservations.map((r) => ({ ...r, type: "salinha" as const })),
      ...itemReservations.map((r) => ({ ...r, type: "item" as const })),
      ...eaufbaRequests.map((r) => ({ ...r, type: "eaufba" as const })),
    ];
  }, [roomReservations, itemReservations, eaufbaRequests]);

  if (
    !eaufbaRequests ||
    !itemReservations ||
    !reservableItems ||
    !roomReservations ||
    !rooms
  ) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-[#f5b719] animate-spin" />
      </div>
    );
  }

  // Conteúdos "burros", apenas exibição
  const roomsContent = (
    <RoomsContent
      initialData={{
        rooms,
        reservations: roomReservations,
      }}
      isDirector={canMutate}
    />
  );
  const eaufbaContent = (
    <SalasEaufbaContent
      initialData={{ reserveRequestToConections: eaufbaRequests }}
    />
  );
  const itemsContent = (
    <ItemsContent
      initialData={{
        items: reservableItems,
        reservations: itemReservations,
      }}
      isDirector={isDirector}
    />
  );

  return (
    <>
      <CustomCard
        type="introduction"
        value={0}
        icon={CalendarClock}
        title="Central de Reservas"
        description="Gerencie todas as reservas em um único lugar."
      />

      <div className="mt-6 grid grid-cols-1 gap-6">
        <DailyScheduleView
          rooms={rooms}
          items={reservableItems}
          reservations={allReservations as any}
        />
        <UnifiedCalendar
          events={allEvents}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
          isDirector={isDirector}
        />
      </div>

      <div className="mt-8">
        {/* Tabs Desktop */}
        <div className="hidden md:block">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-transparent text-[#f5b719] border-[#f5b719] border-2">
              <TabsTrigger
                className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                value="salinhas"
              >
                <CalendarIcon className="mr-2 h-4 w-4" /> Salinhas
              </TabsTrigger>
              <TabsTrigger
                className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                value="salasEaufba"
              >
                <School className="mr-2 h-4 w-4" /> Salas EAUFBA
              </TabsTrigger>
              <TabsTrigger
                className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                value="itens"
              >
                <Box className="mr-2 h-4 w-4" /> Equipamentos
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Tabs Mobile */}
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full md:w-[240px] bg-[#f5b719]/10 border-[#f5b719] text-[#f5b719]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#00205e]/90 text-white border-[#f5b719]">
              <SelectItem value="salinhas">
                <CalendarIcon className="mr-2 h-4 w-4" /> Salinhas
              </SelectItem>
              <SelectItem value="salasEaufba">
                <School className="mr-2 h-4 w-4" /> Salas EAUFBA
              </SelectItem>
              <SelectItem value="itens">
                <Box className="mr-2 h-4 w-4" /> Equipamentos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-6">
        {activeTab === "salinhas" && roomsContent}
        {activeTab === "salasEaufba" && eaufbaContent}
        {activeTab === "itens" && itemsContent}
      </div>

      {/* MODAIS DE CRIAÇÃO/EDIÇÃO */}
      {selectedDate && (
        <CreateReservationModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedDate(null);
          }}
          selectedDate={selectedDate}
          createRoomReservation={createReservation}
          createItemReservation={createItem}
          createEaufbaRequest={createEaufba}
          rooms={rooms}
          items={reservableItems}
          existingItemReservations={itemReservations}
          existingRoomReservations={roomReservations}
          isLoading={
            isCreatingEaufba || isCreatingReservation || isCreatingItem
          }
        />
      )}
    </>
  );
};

export default ReservationsContent;
