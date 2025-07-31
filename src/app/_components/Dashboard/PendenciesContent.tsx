/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo, useEffect } from "react";
import { Clock, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../Global/Custom/CustomModal";
import { Badge } from "@/components/ui/badge";

import { AreaRoles, TaskStatus, User } from "@prisma/client";
import {
  FullTask,
  TaskFormValues,
  taskUpdateSchema,
} from "@/lib/schemas/projectsAreaSchema";
import { sortTasks } from "@/lib/tasks-utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDateForInput } from "@/lib/utils";
import { useAuth } from "@/lib/auth/AuthProvider";
import ModalConfirm from "../Global/ModalConfirm";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MyPendenciesPageData } from "@/app/(dashboard)/minhas-pendencias/page";
import axios from "axios";
import { MemberWithRoles } from "@/lib/schemas/memberFormSchema";
import { getAssignableUsers } from "@/lib/permissions";

interface PendenciesContentQueryData {
  myTasks: FullTask[];
  formatedUsers: { value: string; label: string }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Mapeamento para tradução e estilo dos status
const statusConfig = {
  [TaskStatus.PENDING]: {
    label: "Pendente",
    className: "bg-yellow-500 hover:bg-yellow-600",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "Em Progresso",
    className: "bg-blue-500 hover:bg-blue-600",
  },
  [TaskStatus.COMPLETED]: {
    label: "Concluída",
    className: "bg-green-600 hover:bg-green-700",
  },
  [TaskStatus.CANCELED]: {
    label: "Cancelada",
    className: "bg-gray-500 hover:bg-gray-600",
  },
};

const PendenciesContent = ({
  initialData,
}: {
  initialData: MyPendenciesPageData;
}) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // --- ESTADO LOCAL (Apenas para UI) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FullTask | null>(null);
  const [itemToDelete, setItemToDelete] = useState<FullTask | null>(null);
  const taskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskUpdateSchema),
  });
  useEffect(() => {
    if (selectedItem) {
      taskForm.reset({
        ...selectedItem,
        deadline: formatDateForInput(selectedItem.deadline),
        responsibles: selectedItem.responsibles.map((r) => r.id),
      });
    }
  }, [selectedItem, taskForm]);

  const openModal = (item: FullTask, editMode = false) => {
    setSelectedItem(item);
    setIsEditing(editMode);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsEditing(false);
    setSelectedItem(null);
  };

  const formatedInitialData = useMemo(() => {
    const verifiedUsers: MemberWithRoles[] = getAssignableUsers(
      user!,
      initialData.allUsers
    );
    const verifyIsMe = (user_: MemberWithRoles) => user_.id === user?.id;
    const formatedUsers = verifiedUsers.map((user: MemberWithRoles) => ({
      value: user.id,
      label: verifyIsMe(user) ? "Eu" : user.name,
    }));
    return { myTasks: initialData.myTasks, formatedUsers };
  }, [initialData, user]);

  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["myTasksData"],
    queryFn: async (): Promise<PendenciesContentQueryData> => {
      const [tasksRes, usersRes] = await Promise.all([
        axios.get(`${API_URL}/api/tasks`),
        axios.get(`${API_URL}/api/users`),
      ]);
      const users: MemberWithRoles[] = usersRes.data.users.filter(
        (u: MemberWithRoles) => !u.isExMember
      );
      const verifiedUsers: MemberWithRoles[] = getAssignableUsers(user, users);
      const verifyIsMe = (user_: MemberWithRoles) => user_.id === user?.id;
      const formatedUsers = verifiedUsers.map((user: MemberWithRoles) => ({
        value: user.id,
        label: verifyIsMe(user) ? "Eu" : user.name,
      }));
      return { myTasks: tasksRes.data, formatedUsers: formatedUsers };
    },
    initialData: formatedInitialData,
  });

  const { mutate: updateTask, isPending: isUpdatingTask } = useMutation({
    mutationFn: (taskData: TaskFormValues) =>
      axios.patch(`${API_URL}/api/tasks/${selectedItem!.id}`, taskData),
    onSuccess: () => {
      toast.success("Tarefa atualizada com sucesso!");
      closeModal();
      queryClient.invalidateQueries({ queryKey: ["myTasksData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao salvar", {
        description: error.response?.data?.message,
      }),
  });

  const { mutate: deleteTask, isPending: isDeletingTask } = useMutation({
    mutationFn: (taskId: string) =>
      axios.delete(`${API_URL}/api/tasks/${taskId}`),
    onSuccess: () => {
      toast.success("Tarefa deletada com sucesso!");
      setItemToDelete(null);
      queryClient.invalidateQueries({ queryKey: ["myTasksData"] });
    },
    onError: (error: any) =>
      toast.error("Erro ao deletar", {
        description: error.response?.data?.message,
      }),
  });

  const { pendingTasks, otherTasks } = useMemo(() => {
    const tasks = data?.myTasks || [];
    const pending = tasks
      .filter((t) => t.status !== "COMPLETED" && t.status !== "CANCELED")
      .sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
    const other = tasks.filter(
      (t) => t.status === "COMPLETED" || t.status === "CANCELED"
    );
    return { pendingTasks: pending, otherTasks: sortTasks(other) };
  }, [data?.myTasks]);

  const taskColumns = useMemo<ColumnDef<FullTask>[]>(
    () => [
      { accessorKey: "title", header: "Título" },
      {
        accessorKey: "status",
        header: "Status",
        cell: (row) => {
          const status = row.status;
          const config = statusConfig[status];
          return (
            <Badge className={`${config.className} text-white border-none`}>
              {config.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "deadline",
        header: "Prazo",
        cell: (row) => {
          const deadline = new Date(row.deadline);
          const daysLeft = differenceInDays(deadline, new Date());
          const isUrgent =
            daysLeft <= 1 &&
            row.status !== TaskStatus.COMPLETED &&
            row.status !== TaskStatus.CANCELED;
          const formattedDate = formatDateForInput(row.deadline);
          return (
            <span className={isUrgent ? "text-red-500 font-bold" : ""}>
              {formattedDate}
            </span>
          );
        },
      },
      {
        accessorKey: "responsibles",
        header: "Responsáveis",
        cell: (row) => {
          const responsibles = row.responsibles;
          if (!responsibles || responsibles.length === 0)
            return <span className="text-xs text-gray-500">Ninguém</span>;
          return (
            <div className="flex items-center -space-x-2">
              {responsibles.slice(0, 3).map((user: User) => (
                <Avatar
                  key={user.id}
                  className="h-7 w-7 border-2 border-background"
                >
                  <AvatarImage src={user.imageUrl || ""} alt={user.name} />
                  <AvatarFallback className="text-xs bg-gray-700">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {responsibles.length > 3 && (
                <div className="flex items-center justify-center h-7 w-7 rounded-full bg-[#0126fb] text-white text-xs font-bold z-10 border-2 border-background">
                  +{responsibles.length - 3}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "authorId",
        header: "Autor(a)",
        cell: (row) => {
          const author = row.author;
          if (!author)
            return <span className="text-xs text-gray-500">Desconhecido</span>;
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarImage src={author.imageUrl || ""} alt={author.name} />
                <AvatarFallback className="text-xs bg-gray-700">
                  {author.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{author.name}</span>
            </div>
          );
        },
      },
    ],
    []
  );

  const taskFields: FieldConfig<TaskFormValues>[] = [
    { accessorKey: "title", header: "Título" },
    { accessorKey: "description", header: "Descrição", type: "text" },
    { accessorKey: "deadline", header: "Prazo", mask: "date" },
    {
      accessorKey: "status",
      header: "Status",
      type: "select",
      options: Object.values(TaskStatus).map((s) => ({
        value: s,
        label: statusConfig[s].label,
      })),
      renderView: (row) => {
        switch (row.status) {
          case TaskStatus.CANCELED:
            return (
              <Badge className="bg-gray-500/20 text-gray-400">Cancelada</Badge>
            );
          case TaskStatus.IN_PROGRESS:
            return (
              <Badge className="bg-yellow-500/20 text-yellow-400">
                Em progresso
              </Badge>
            );
          case TaskStatus.COMPLETED:
            return (
              <Badge className="bg-green-500/20 text-green-400">
                Completada
              </Badge>
            );
          case TaskStatus.PENDING:
            return (
              <Badge className="bg-red-500/20 text-red-400">Pendente</Badge>
            );
          default:
            return (
              <Badge className="bg-gray-500/20 text-gray-400">
                Desconhecido
              </Badge>
            );
        }
      },
    },
    {
      accessorKey: "responsibles",
      header: "Responsáveis",
      type: "checkbox",
      options: data.formatedUsers,
      renderView(row) {
        if (!row.responsibles || row.responsibles.length === 0)
          return <span className="text-xs text-gray-500">Ninguém</span>;

        const responsibles = data.formatedUsers.filter((user) =>
          row.responsibles!.includes(user.value)
        );

        return (
          <div className="flex items-center gap-2">
            {responsibles.map((user) => (
              <h3 key={user.value}>{user.label}</h3>
            ))}
          </div>
        );
      },
    },
  ];

  const handleUpdateSubmit = (formData: TaskFormValues) => {
    updateTask(formData);
  };

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      deleteTask(itemToDelete.id);
    }
  };

  const canDelete = (task: FullTask) => {
    return (
      task.authorId === user?.id ||
      user!.currentRole.area.map((area) => area === AreaRoles.DIRETORIA)
        .length > 0
    );
  };

  if (isLoadingData)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#010d26]">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
        <p>Carregando...</p>
      </div>
    );

  return (
    <>
      <CustomCard
        title="Minhas Pendências"
        value={pendingTasks.length.toString()} // Mostra o número de tarefas pendentes
        type="introduction"
        icon={Clock}
        description="Acompanhe aqui as suas tarefas que precisam de atenção."
      />
      <div className="mt-6 space-y-6">
        <CustomTable
          data={pendingTasks}
          columns={taskColumns}
          filterColumns={["title", "status"]}
          title="Tarefas Pendentes"
          onRowClick={(row) => openModal(row, false)}
          onEdit={(row) => openModal(row, true)}
          onDelete={(row) => setItemToDelete(row)}
          type={"noSelection"}
          isRowDeletable={canDelete}
          itemsPerPage={10}
        />
        <CustomTable
          data={otherTasks}
          columns={taskColumns}
          filterColumns={["title", "status"]}
          title="Outras tarefas"
          type="onlyView"
          itemsPerPage={10}
        />
      </div>

      {selectedItem && (
        <CustomModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={isEditing ? "Editar Tarefa" : "Detalhes da Tarefa"}
          form={taskForm}
          onSubmit={handleUpdateSubmit}
          fields={taskFields}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          isLoading={isUpdatingTask}
        />
      )}

      {itemToDelete && (
        <ModalConfirm
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => handleDeleteConfirm}
          isLoading={isDeletingTask}
        />
      )}
    </>
  );
};

export default PendenciesContent;
