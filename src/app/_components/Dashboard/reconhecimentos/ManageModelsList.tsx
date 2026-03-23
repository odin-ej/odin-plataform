/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState } from "react";
import { Power, PowerOff, ShieldCheck, Award } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useForm } from "react-hook-form";

// Componentes Custom
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import CustomModal, { FieldConfig } from "../../Global/Custom/CustomModal";

// Actions e Tipos
import {
  deleteRecognitionModel as deleteRecognitionModelAction,
  toggleModelStatus,
  updateRecognitionModel,
} from "@/lib/actions/recognitions";
import {
  RecognitionAreas,
  RecognitionModel,
  RecognitionType,
} from "@prisma/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ModalConfirm from "../../Global/ModalConfirm";

const ManageModelsList = ({ models }: { models: RecognitionModel[] }) => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<RecognitionModel | null>(
    null
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 1. Configuração do Formulário para o Modal
  const form = useForm<RecognitionModel>({
    defaultValues: {
      title: "",
      description: "",
      areas: ["GERAL"],
    },
  });

  const { mutate: deleteRecognitionModel, isPending: isDeleting } = useMutation(
    {
      mutationFn: (model: RecognitionModel) => {
        return deleteRecognitionModelAction(model.id);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["allRecognitionModels"] });
        toast.success("Modelo deletado com sucesso!");
        setItemToDelete(null);
      },
      onError: () => {
        toast.error("Erro ao deletar modelo");
      },
    }
  );

  // 2. Handler para Troca de Status (Soft Delete)
  const handleToggleStatus = async (model: RecognitionModel) => {
    try {
      // Chamada da Action
      await toggleModelStatus(model.id, model.isActive);

      // 3. INVALIDAR A QUERY
      // Isso força o TanStack Query a buscar os dados novamente
      // e atualizar a UI instantaneamente.
      queryClient.invalidateQueries({ queryKey: ["allRecognitionModels"] });

      toast.success(model.isActive ? "Modelo desativado" : "Modelo reativado");
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  };

  // 3. Handler para Salvar Edição
  const onSave = async (data: RecognitionModel) => {
    setIsLoading(true);
    try {
      await updateRecognitionModel(data.id, {
        title: data.title,
        type: data.type,
        description: data.description ?? undefined,
        areas: data.areas,
      });
      toast.success("Modelo atualizado com sucesso!");
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar alterações");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Definição das Colunas para o CustomTable
  const columns: ColumnDef<RecognitionModel>[] = [
    {
      accessorKey: "title",
      header: "Reconhecimento",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-white">{row.title}</span>
          <span className="text-[10px] text-gray-500 truncate max-w-[180px]">
            {row.description || "Sem descrição"}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Tipo / Áreas",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <Badge
            variant="outline"
            className="w-fit text-[9px] border-blue-500/30 text-blue-400"
          >
            {row.type}
          </Badge>
          <div className="flex flex-wrap gap-1">
            {row.areas.map((area) => (
              <span
                key={area}
                className="text-[8px] bg-white/5 px-1 rounded border border-white/10 uppercase text-gray-400"
              >
                {area}
              </span>
            ))}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.isActive ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20 gap-1">
              <ShieldCheck size={10} /> Ativo
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-gray-500 border-gray-500/20"
            >
              Inativo
            </Badge>
          )}
          {/* Botão de Toggle rápido dentro da célula de status */}
          <Button
            variant="ghost"
            size="icon"
            className={
              row.isActive
                ? "text-red-400 hover:bg-red-500/10"
                : "text-green-400 hover:bg-green-500/10"
            }
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(row);
            }}
          >
            {row.isActive ? <PowerOff size={14} /> : <Power size={14} />}
          </Button>
        </div>
      ),
    },
  ];

  // 5. Configuração dos campos para o CustomModal
  const fieldConfig: FieldConfig<RecognitionModel>[] = [
    {
      header: "Título do Reconhecimento",
      accessorKey: "title",
      type: "text",
    },
    {
      header: "Tipo de Reconhecimento",
      accessorKey: "type",
      type: "select",
      options: Object.values(RecognitionType).map((t) => ({
        label:
          t === "CULTURAL"
            ? "Cultural"
            : t === "PERFORMANCE"
            ? "Performance"
            : "Resultado",
        value: t,
      })),
    },
    {
      header: "Áreas Afiliadas",
      accessorKey: "areas",
      type: "command",
      isMulti: true,
      options: Object.values(RecognitionAreas).map((area) => ({
        label:
          area === "GERAL"
            ? "Geral"
            : area === "OPERACOES"
            ? "Operações"
            : area === "PESSOAS"
            ? "Gestão de Pessoas"
            : area === "PROJETOS"
            ? "Projetos"
            : area === "MERCADO"
            ? "Mercado"
            : "Presidência",
        value: area,
      })),
    },
    {
      header: "Descrição do Molde",
      accessorKey: "description",
      type: "textarea",
    },
  ];

  return (
    <div className="mt-6">
      <CustomTable
        title="Modelos de Reconhecimento"
        type="noSelection" // Usa o padrão do CustomTable para Ações (Pencil/Trash)
        data={models}
        columns={columns}
        filterColumns={["title", "type"]}
        itemsPerPage={5}
        onEdit={(row) => {
          form.reset(row);
          setIsEditing(true);
          setIsModalOpen(true);
        }}
        onDelete={(row) => setItemToDelete(row)}
      />

      <CustomModal
        title="Editar Modelo"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        form={form}
        fields={fieldConfig}
        onSubmit={onSave}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        isLoading={isLoading}
      />
      {itemToDelete && (
        <ModalConfirm
          open={itemToDelete !== null}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => deleteRecognitionModel(itemToDelete)}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
};

export default ManageModelsList;
