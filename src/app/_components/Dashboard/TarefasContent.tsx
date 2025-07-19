/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { differenceInDays } from "date-fns";

import CustomCard from "../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../Global/Custom/CustomModal";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, TaskStatus } from ".prisma/client";
import {
  FullTask,
  TaskFormValues, // Este é para o formulário de UPDATE (campos opcionais)
  taskUpdateSchema,
  TaskCreateFormValues, // Este é para o formulário de CREATE (campos obrigatórios)
  taskCreateSchema,
} from "@/lib/schemas/projectsAreaSchema";
import { sortTasks } from "@/lib/tasks-utils";
import { formatDateForInput } from "@/lib/utils";
import ModalConfirm from "../Global/ModalConfirm";

interface TarefasContentProps {
  tasks: FullTask[];
  users: { value: string; label: string }[];
}

// Mapeamento para tradução e estilo dos status
const statusConfig = {
  [TaskStatus.PENDING]: {
    label: "Pendente",
    className: "bg-red-500 hover:bg-red-600",
  },
  [TaskStatus.IN_PROGRESS]: {
    label: "Em Progresso",
    className: "bg-[#0126fb] hover:bg-[#0126fb]/70",
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

const TarefasContent = ({ tasks, users }: TarefasContentProps) => {
  const router = useRouter();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FullTask | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [removeTaskId, setRemoveTaskId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  // Formulário para editar uma tarefa existente (usa o schema de update com campos opcionais)
  const editTaskForm = useForm<TaskFormValues>({
    resolver: zodResolver(taskUpdateSchema),
  });

  // CORREÇÃO: Formulário para criar uma nova tarefa (usa o schema de criação com campos obrigatórios)
  const createTaskForm = useForm<TaskCreateFormValues>({
    resolver: zodResolver(taskCreateSchema),
    defaultValues: {
      title: "",
      description: "",
      status: TaskStatus.PENDING,
      deadline: formatDateForInput(new Date()),
      responsibles: [],
    },
  });

  useEffect(() => {
    if (selectedItem) {
      editTaskForm.reset({
        ...selectedItem,
        deadline: formatDateForInput(selectedItem.deadline),
        responsibles: selectedItem.responsibles.map((r) => r.id),
      });
// Data vem do banco de dados certa! O problema é aqui no front-end talvez no formatDateForInput - Se for melhor crie um componente de calendario para cuidar de campos como esse de datas
    }
  }, [selectedItem, editTaskForm]);

  const openEditModal = (item: FullTask, editMode = false) => {
    setSelectedItem(item);
    setIsEditing(editMode);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    setIsEditModalOpen(false);
    setIsEditing(false);
    setSelectedItem(null);
  };

  const openCreateModal = () => {
    createTaskForm.reset({
      title: "",
      description: "",
      status: TaskStatus.PENDING,
      deadline: formatDateForInput(new Date()), // Formata a data para o input
      responsibles: [],
    }); // Limpa o formulário de criação
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
  };

  const handleUpdateTask = async (data: TaskFormValues) => {
    if (!selectedItem) return toast.error("Nenhum item selecionado.");
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok)
        throw new Error(
          (await res.json()).message || "Falha ao atualizar tarefa."
        );
      toast.success("Tarefa atualizada com sucesso!");
      closeEditModal();
      router.refresh();
    } catch (error: any) {
      toast.error("Erro ao salvar", { description: error.message });
    }
    setIsLoading(false);
  };

  const handleCreateTask = async (data: TaskCreateFormValues) => {
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok)
        throw new Error((await res.json()).message || "Falha ao criar tarefa.");
      toast.success("Tarefa criada com sucesso!");
      closeCreateModal();
      router.refresh();
    } catch (error: any) {
      toast.error("Erro ao criar tarefa", { description: error.message });
    }
    setIsLoading(false);
  };

  const handleDeleteTask = async (id: string) => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok)
        throw new Error(
          (await res.json()).message || "Falha ao deletar tarefa."
        );
      toast.success("Tarefa deletada com sucesso!");
      router.refresh();
    } catch (error: any) {
      toast.error("Erro ao deletar", { description: error.message });
    }
    setIsLoading(false);
  };

  const handleClickDeleteButton = (linkId: string) => {
    setIsConfirmModalOpen(true);
    setRemoveTaskId(linkId);
  };

  const sortedTasks = useMemo(() => sortTasks(tasks), [tasks]);

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
    ],
    []
  );

  const editTaskFields: FieldConfig<TaskFormValues>[] = [
    { accessorKey: "title", header: "Título", type: "text" },
    { accessorKey: "description", header: "Descrição", type: "text" },
    {
      accessorKey: "deadline",
      header: "Prazo",
      mask: "date",
    },
    {
      accessorKey: "status",
      header: "Status",
      type: "select",
      options: Object.values(TaskStatus).map((s) => ({
        value: s,
        label: statusConfig[s].label,
      })),
    },
    {
      accessorKey: "responsibles",
      header: "Responsáveis",
      type: "checkbox",
      options: users,
    },
  ];

  const createTaskFields: FieldConfig<TaskCreateFormValues>[] = [
    { accessorKey: "title", header: "Título", type: "text" },
    { accessorKey: "description", header: "Descrição", type: "text" },
    {
      accessorKey: "deadline",
      header: "Prazo",
      mask: "date",
    },
    {
      accessorKey: "status",
      header: "Status",
      type: "select",
      options: Object.values(TaskStatus)
        .filter((s) => s !== TaskStatus.PENDING)
        .map((s) => ({
          value: s,
          label: statusConfig[s].label,
        })),
    },
    {
      accessorKey: "responsibles",
      header: "Responsáveis",
      type: "checkbox",
      options: users,
    },
  ];

  return (
    <>
      <CustomCard
        type="introduction"
        icon={ClipboardList}
        title="Tarefas e Projetos"
        description="Acompanhe as tarefas e projetos da casinha dos sonhos"
        value={tasks.length}
      />

      <div className="mt-6 space-y-8">
        <CustomTable
          title="Tarefas"
          columns={taskColumns}
          data={sortedTasks}
          handleActionClick={openCreateModal}
          filterColumns={["title", "status"]}
          onEdit={(row) => openEditModal(row, true)}
          onDelete={(row) => handleClickDeleteButton(row.id)}
          onRowClick={(row) => openEditModal(row, false)}
          itemsPerPage={10}
          disabled={false}
          type="noSelection"
        />
      </div>

      {/* Modal para Editar/Visualizar Tarefa */}
      {isEditModalOpen && (
        <CustomModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          title={isEditing ? "Editar Tarefa" : "Detalhes da Tarefa"}
          form={editTaskForm}
          onSubmit={handleUpdateTask}
          fields={editTaskFields}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          isLoading={isLoading}
        />
      )}

      {/* Modal para Criar Tarefa */}
      <CustomModal
        isOpen={isCreateModalOpen}
        onClose={closeCreateModal}
        title="Criar Nova Tarefa"
        form={createTaskForm}
        onSubmit={handleCreateTask}
        fields={createTaskFields}
        isEditing={true}
        setIsEditing={() => closeCreateModal()}
        onlyView={false}
        isLoading={isLoading}
      />
      {typeof removeTaskId === "string" && isConfirmModalOpen && (
        <ModalConfirm
          open={isConfirmModalOpen}
          onCancel={() => setIsConfirmModalOpen(false)}
          onConfirm={() => handleDeleteTask(removeTaskId)}
          isLoading={isLoading}
        />
      )}
    </>
  );
};

export default TarefasContent;
