/* eslint-disable @typescript-eslint/no-explicit-any */
// RoomsContent.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { format, areIntervalsOverlapping } from "date-fns";
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import CustomModal from "../../Global/Custom/CustomModal";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ExtendedReservation,
  RoomReservationFormValues,
  roomReservationSchema,
} from "@/lib/schemas/reservationsSchema";
import { Avatar } from "@radix-ui/react-avatar";
import { AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ModalConfirm from "../../Global/ModalConfirm";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "@/lib/auth/AuthProvider";
import { Room } from "@prisma/client";

export interface RoomsPageData {
  reservations: ExtendedReservation[];
  rooms: Room[];
}

export type FlattenedReservation = {
  id: string;
  title: string;
  roomName: string;
  userName: string;
  formattedDate: string;
  original: ExtendedReservation;
};

interface RoomsContentProps {
  initialData: RoomsPageData;
  isDirector: boolean;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const RoomsContent = ({ initialData, isDirector }: RoomsContentProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReservation, setEditingReservation] =
    useState<ExtendedReservation | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ExtendedReservation | null>(
    null
  );

  const form = useForm<RoomReservationFormValues>({
    resolver: zodResolver(roomReservationSchema),
  });

  const data = initialData;

  const availableRooms = data?.rooms || [];

  // --- Apenas Update/Delete aqui ---
  const { mutate: updateReservation, isPending: isSaving } = useMutation({
    mutationFn: async (formData: RoomReservationFormValues) => {
      if (!editingReservation) return;

      const hourEnter = new Date(`${formData.date}T${formData.hourEnter}:00`);
      const hourLeave = new Date(`${formData.date}T${formData.hourLeave}:00`);

      const freshData = await queryClient.fetchQuery<RoomsPageData>({
        queryKey: ["reservationsData"],
      });

      const hasConflict = freshData.reservations.some((res) => {
        if (res.id === editingReservation.id) return false;
        if (res.roomId !== formData.roomId) return false;
        return areIntervalsOverlapping(
          { start: hourEnter, end: hourLeave },
          { start: new Date(res.hourEnter), end: new Date(res.hourLeave) }
        );
      });

      if (hourEnter >= hourLeave) {
        throw new Error("Hora de entrada deve ser menor que a hora de saída.");
      }
      if (hasConflict) {
        throw new Error(
          "Esta sala já está reservada para o horário selecionado."
        );
      }

      const payload = {
        ...formData,
        date: hourEnter.toISOString(),
        hourEnter: hourEnter.toISOString(),
        hourLeave: hourLeave.toISOString(),
        userId: user!.id,
        status: "BUSY",
      };

      return axios.patch(
        `${API_URL}/api/reserve/${editingReservation.id}`,
        payload
      );
    },
    onSuccess: () => {
      toast.success("Reserva atualizada com sucesso!");
      setIsModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reservationsData"] });
    },
    onError: (error: any) =>
      toast.error("Erro na atualização", {
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

  // Handlers
  const handleFormSubmit = (formData: RoomReservationFormValues) =>
    updateReservation(formData);

  const handleDeleteConfirm = () =>
    itemToDelete && deleteReservation(itemToDelete.id);

  // Derived Data
  const myReservations = useMemo(
    () => (data?.reservations || []).filter((res) => res.userId === user!.id),
    [data?.reservations, user]
  );

  const processDataForTable = (
    reservations: ExtendedReservation[]
  ): FlattenedReservation[] =>
    reservations.map((res) => ({
      id: res.id,
      title: res.title ?? "Sem título",
      roomName: res.room.name,
      userName: res.user.name,
      formattedDate:
        formatInTimeZone(
          res.hourEnter,
          "America/Sao_Paulo",
          "dd/MM/yyy HH:mm"
        ) +
        " - " +
        formatInTimeZone(res.hourLeave, "America/Sao_Paulo", "HH:mm"),
      original: res,
    }));

  const processedMyReservations = useMemo(
    () => processDataForTable(myReservations),
    [myReservations]
  );
  const processedAllReservations = useMemo(
    () => processDataForTable(data?.reservations || []),
    [data?.reservations]
  );

  const openEditModal = (reservation: ExtendedReservation) => {
    setEditingReservation(reservation);
const timeZone = "America/Sao_Paulo";
    const zonedEnter = toZonedTime(new Date(reservation.hourEnter), timeZone);
const zonedLeave = toZonedTime(new Date(reservation.hourLeave), timeZone);
    form.reset({
      date: format(zonedEnter, "yyyy-MM-dd"),
      title: reservation.title ?? "Sem título",
      hourEnter: format(zonedEnter, "HH:mm"),
      hourLeave: format(zonedLeave, "HH:mm"),
      roomId: reservation.roomId,
    });
    setIsModalOpen(true);
  };

  const createColumns = (
    isMyReservations: boolean
  ): ColumnDef<FlattenedReservation>[] => [
    { accessorKey: "roomName", header: "Sala" },
    { accessorKey: "formattedDate", header: "Período" },
    { accessorKey: "title", header: "Título" },
    {
      accessorKey: "userName",
      header: "Reservado por",
      cell: (row) => (
        <div className="flex items-center gap-3 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={row.original.user.imageUrl ?? undefined}
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
      cell: (row) =>
        (isDirector || isMyReservations) && (
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => openEditModal(row.original)}
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
        ),
    },
  ];

  return (
    <>
      <div className="mt-6 space-y-8">
        <CustomTable
          data={processedMyReservations}
          columns={createColumns(true)}
          filterColumns={["roomName", "userName", "formattedDate"]}
          title="Minhas Reservas"
          itemsPerPage={5}
          type="onlyView"
        />
        <CustomTable
          data={processedAllReservations}
          columns={createColumns(false)}
          filterColumns={["roomName", "userName", "formattedDate"]}
          title="Últimas Reservas"
          itemsPerPage={5}
          type="onlyView"
        />
      </div>

      {/* Modal só para editar */}
      <CustomModal<RoomReservationFormValues>
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Editar Reserva"
        form={form}
        setIsEditing={() => {}}
        onSubmit={handleFormSubmit}
        isLoading={isSaving}
        isEditing={true}
        fields={[
          { accessorKey: "date", header: "Data", type: "date" },
          { accessorKey: "title", header: "Título", type: "text" },
          { accessorKey: "hourEnter", header: "Entrada", type: "time" },
          { accessorKey: "hourLeave", header: "Saída", type: "time" },
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
