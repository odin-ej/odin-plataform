/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useMemo, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
// Componentes UI e Tipos
import CustomInput from "../../Global/Custom/CustomInput";
import CustomTextArea from "../../Global/Custom/CustomTextArea";
import CustomSelect from "../../Global/Custom/CustomSelect";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
  DialogOverlay,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { User, ActionType, TagAreas, TagTemplate } from "@prisma/client";
import {
  actionTypeSchema,
  addTagToUsersSchema,
  TagTemplateFormValues,
  tagTemplateSchema,
} from "@/lib/schemas/pointsSchema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios, { AxiosResponse } from "axios";
import { Switch } from "@/components/ui/switch";
import CustomCheckboxGroup from "../../Global/Custom/CustomCheckboxGroup";
import CommandMultiSelect from "../../Global/Custom/CommandMultiSelect";
import FileUploadZone, { UploadableFile } from "../../Global/FileUploadZone";

interface AttachmentPayload {
  url: string;
  fileName: string;
  fileType: string;
}

interface AdminActionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  allUsers: User[];
  allTagTemplates: TagTemplate[];
  allActionTypes: ActionType[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const getLabelForArea = (area: TagAreas) => {
  switch (area) {
    case TagAreas.GERAL:
      return "Geral";
    case TagAreas.MERCADO:
      return "Mercado";
    case TagAreas.OPERACOES:
      return "Operações";
    case TagAreas.PRESIDENCIA:
      return "Presidência";
    case TagAreas.PROJETOS:
      return "Projetos";
    case TagAreas.PESSOAS:
      return "Gestão de Pessoas";
    default:
      return area;
  }
};

const ENTERPRISE_USER_ID = "enterprise_points_id";

const AdminActionsModal = ({
  isOpen,
  onClose,
  allUsers = [],
  allTagTemplates = [],
  allActionTypes = [],
}: AdminActionsModalProps) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("add-points");
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const [isUploadingFiles, setIsUploadingFiles] = useState(false);
  // --- HOOKS DE FORMULÁRIO ATUALIZADOS ---
  const addTagForm = useForm<z.infer<typeof addTagToUsersSchema>>({
    resolver: zodResolver(addTagToUsersSchema),
    // CORRIGIDO: 'templateId' e sem 'areas'
    defaultValues: { userIds: [], templateIds: [], datePerformed: "" },
  });

  const createTemplateForm = useForm<TagTemplateFormValues>({
    resolver: zodResolver(tagTemplateSchema),
    // CORRIGIDO: Valores padrão completos para evitar conflitos de tipo
    defaultValues: {
      name: "",
      description: "",
      baseValue: 0,
      actionTypeId: undefined,
      isScalable: false,
      escalationValue: 0,
      escalationStreakDays: 0,
      escalationCondition: "",
      areas: [],
    },
  });

  const createActionTypeForm = useForm<z.infer<typeof actionTypeSchema>>({
    resolver: zodResolver(actionTypeSchema),
    defaultValues: { name: "", description: "" },
  });

  const isScalable = createTemplateForm.watch("isScalable");

  // --- HOOKS DE MUTATION ATUALIZADOS ---

  const { mutate: addPointsMutation, isPending: isAddingPoints } = useMutation<
    AxiosResponse[],
    Error,
    z.infer<typeof addTagToUsersSchema>
  >({
    mutationFn: (data: z.infer<typeof addTagToUsersSchema>) => {
      // 1. Crie um array para armazenar as promessas de chamadas de API
      const apiCalls: Promise<AxiosResponse>[] = [];

      // 2. Separe os alvos: IDs de usuários reais e a flag da empresa
      const realUserIds = data.userIds.filter(
        (userId) => userId !== ENTERPRISE_USER_ID
      );
      const isEnterpriseTargeted = data.userIds.includes(ENTERPRISE_USER_ID);

      // 3. Se houver usuários reais selecionados, adicione a chamada de API deles à lista
      if (realUserIds.length > 0) {
        const userPayload = {
          ...data,
          userIds: realUserIds, // Envia apenas os IDs dos usuários
        };
        apiCalls.push(
          axios.post(`${API_URL}/api/jr-points/tags/add-to-users`, userPayload)
        );
      }

      // 4. Se a empresa foi selecionada, adicione a chamada de API dela à lista
      if (isEnterpriseTargeted) {
        // A rota da empresa espera um payload diferente (sem userIds)
        const enterprisePayload = {
          templateIds: data.templateIds,
          datePerformed: data.datePerformed,
          description: data.description,
          attachments: data.attachments,
        };
        apiCalls.push(
          axios.post(
            `${API_URL}/api/enterprise-points/add-tags`,
            enterprisePayload
          )
        );
      }

      // 5. Se não houver nenhuma chamada a ser feita, retorne uma promessa resolvida
      if (apiCalls.length === 0) {
        toast.info("Nenhum alvo selecionado para atribuição.");
        return Promise.resolve([]); // Retorna um array vazio para o onSuccess
      }

      // 6. Execute todas as chamadas de API em paralelo
      return Promise.all(apiCalls);
    },
    onSuccess: () => {
      toast.success("Pontos atribuídos com sucesso!");
      addTagForm.reset();
      setUploadableFiles([]);
      onClose();
      queryClient.invalidateQueries({
        queryKey: ["enterprisePointsData", "userPoints", "notifications"],
      });
    },
    onError: (error: any) =>
      toast.error("Erro ao atribuir pontos", {
        description:
          error.response?.data?.message || "Ocorreu um erro inesperado.",
      }),
  });

  const { mutate: createTemplateMutation, isPending: isCreatingTemplate } =
    useMutation({
      mutationFn: (data: z.infer<typeof tagTemplateSchema>) =>
        axios.post(`${API_URL}/api/jr-points/tag-templates`, data),
      onSuccess: () => {
        toast.success("Modelo de tag criado com sucesso!");
        createTemplateForm.reset();
        onClose();
        queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
      },
      onError: (error: any) =>
        toast.error("Erro ao criar modelo", {
          description:
            error.response?.data?.message || "Ocorreu um erro inesperado.",
        }),
    });

  const { mutate: createActionTypeMutation, isPending: isCreatingAction } =
    useMutation({
      mutationFn: (data: z.infer<typeof actionTypeSchema>) =>
        axios.post(`${API_URL}/api/jr-points/action-types`, data),
      onSuccess: () => {
        toast.success("Tipo de Ação criado com sucesso!");
        createActionTypeForm.reset();
        onClose();
        queryClient.invalidateQueries({ queryKey: ["allActionTypes"] });
      },
      onError: (error: any) =>
        toast.error("Erro ao criar tipo de ação", {
          description:
            error.response?.data?.message || "Ocorreu um erro inesperado.",
        }),
    });

  // --- FUNÇÕES DE SUBMISSÃO ---
  const onAddTagSubmit = async (data: z.infer<typeof addTagToUsersSchema>) => {
    const toastId = toast.loading("Enviando arquivos, por favor aguarde...");
    try {
      setIsUploadingFiles(true);
      const newFilesToUpload = uploadableFiles.filter(
        (f) => f.status === "pending"
      );
      let uploadedAttachments: AttachmentPayload[] = [];

      if (newFilesToUpload.length > 0) {
        const uploadPromises = newFilesToUpload.map(
          (fileToUpload) =>
            new Promise<AttachmentPayload>(async (resolve, reject) => {
              try {
                // Obter URL pré-assinada
                const { data: presignedData } = await axios.post(
                  "/api/jr-points/upload",
                  {
                    fileName: fileToUpload.file.name,
                    fileType: fileToUpload.file.type,
                    fileSize: fileToUpload.file.size,
                    subfolder: "solicitations", // Ou outra pasta, se aplicável
                  }
                );

                // Fazer upload para o S3
                await axios.put(presignedData.uploadUrl, fileToUpload.file, {
                  headers: { "Content-Type": fileToUpload.file.type },
                });

                resolve({
                  url: presignedData.s3Key, // Importante: envie a chave do S3, não a URL completa
                  fileName: presignedData.fileName,
                  fileType: presignedData.fileType,
                });
              } catch (uploadError) {
                reject(uploadError);
              }
            })
        );

        uploadedAttachments = await Promise.all(uploadPromises);
      }

      // Combina os dados do formulário com os anexos enviados
      const finalPayload = {
        ...data,
        attachments: uploadedAttachments,
      };

      toast.loading("Atribuindo pontos...", { id: toastId });
      await addPointsMutation(finalPayload);
      toast.success("Operação concluída!", { id: toastId });
    } catch (error) {
      toast.error("Falha no upload de um ou mais arquivos.", { id: toastId });
      console.error("Erro no processo de upload:", error);
    }
    setIsUploadingFiles(false);
  };

  const onCreateTemplateSubmit: SubmitHandler<TagTemplateFormValues> = (
    data: z.infer<typeof tagTemplateSchema>
  ) => createTemplateMutation(data);
  const onCreateActionTypeSubmit = (data: z.infer<typeof actionTypeSchema>) =>
    createActionTypeMutation(data);

  // --- COMPONENTES DE UI REUTILIZÁVEIS E MELHORADOS ---

  const UserMultiSelect = () => {
    const optionsForSelect = useMemo(
      () => [
        { value: ENTERPRISE_USER_ID, label: "Pontuação da Empresa" },
        ...allUsers.map((user) => ({
          value: user.id,
          label: user.name,
        })),
      ],
      []
    );
    return (
      <CommandMultiSelect
        form={addTagForm}
        label="Atribuir a:"
        name="userIds"
        options={optionsForSelect}
      />
    );
  };

  const TemplateSelect = () => {
    const options = useMemo(() => {
      return allTagTemplates.map((template) => ({
        value: template.id,
        label: template.name,
      }));
    }, []);

    return (
      <CommandMultiSelect
        form={addTagForm}
        label="Modelos de Tag"
        name="templateIds"
        options={options}
      />
    );
  };

  const allAreas = Object.values(TagAreas);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <DialogContent className="scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent w-full max-w-[90vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-[#010d26] border-2 border-[#0126fb] text-white rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              Ações Administrativas
            </DialogTitle>
            <DialogDescription>
              Gerencie pontos, modelos de tags e tipos de ações.
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full mt-4"
          >
            <TabsList className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full bg-[#00205e] h-auto mb-6">
              <TabsTrigger value="add-points">Atribuir Pontos</TabsTrigger>
              <TabsTrigger value="create-template">
                Criar Modelo de Tag
              </TabsTrigger>
              <TabsTrigger value="create-action">Criar Ação</TabsTrigger>
            </TabsList>

            {/* Aba 1: Atribuir Pontos */}
            <TabsContent value="add-points" className="space-y-6">
              <Form {...addTagForm}>
                <form
                  onSubmit={addTagForm.handleSubmit(onAddTagSubmit)}
                  className="space-y-6"
                >
                  <CustomTextArea
                    form={addTagForm}
                    label="Descrição"
                    field="description"
                    placeholder="Estou atribuindo essa tag por causa de..."
                  />
                  <CustomInput
                    form={addTagForm}
                    field="datePerformed"
                    label="Data de Realização"
                    placeholder="DD/MM/AAAA"
                    type="date"
                  />
                  <FileUploadZone
                    uploadableFiles={uploadableFiles}
                    onFilesChange={setUploadableFiles}
                  />
                  <TemplateSelect />
                  <UserMultiSelect />
                  <Button
                    className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80"
                    type="submit"
                    disabled={isAddingPoints || isUploadingFiles}
                  >
                    {isUploadingFiles || isAddingPoints
                      ? "Atribuindo..."
                      : "Atribuir Pontos"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Aba 2: Criar Modelo de Tag */}
            <TabsContent value="create-template" className="space-y-6">
              <Form {...createTemplateForm}>
                <form
                  onSubmit={createTemplateForm.handleSubmit(
                    onCreateTemplateSubmit
                  )}
                  className="space-y-6"
                >
                  <CustomInput
                    form={createTemplateForm}
                    field="name"
                    label="Nome do Modelo"
                    placeholder="Ex: Entrega de Sprint no Prazo"
                  />
                  <CustomTextArea
                    form={createTemplateForm}
                    field="description"
                    label="Descrição Padrão"
                    placeholder="Descreva a atividade que gera estes pontos."
                  />
                  <CustomInput
                    form={createTemplateForm}
                    field="baseValue"
                    label="Pontuação Base"
                    type="number"
                    placeholder="10"
                  />
                  <CustomSelect
                    control={createTemplateForm.control}
                    name="actionTypeId"
                    label="Tipo da Ação"
                    placeholder="Selecione uma ação..."
                    options={allActionTypes.map((at) => ({
                      value: at.id,
                      label: at.name,
                    }))}
                  />

                  <CustomCheckboxGroup
                    control={createTemplateForm.control}
                    name="areas"
                    label="Áreas"
                    options={allAreas.map((a) => ({
                      value: a,
                      label: getLabelForArea(a),
                    }))}
                  />

                  <FormField
                    control={createTemplateForm.control}
                    name="isScalable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border border-gray-700 p-4">
                        <div className="space-y-0.5">
                          <FormLabel>É Escalonável?</FormLabel>
                          <DialogDescription className="text-xs text-gray-400">
                            Ative para habilitar bônus por sequência (streak).
                          </DialogDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {isScalable && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 border border-dashed border-gray-600 rounded-md">
                      <CustomInput
                        form={createTemplateForm}
                        field="escalationValue"
                        label="Valor do Bônus/Pena"
                        type="number"
                        placeholder="+5 ou -5"
                      />
                      <CustomInput
                        form={createTemplateForm}
                        field="escalationStreakDays"
                        label="Prazo do Streak (dias)"
                        type="number"
                        placeholder="7"
                      />
                      <div className="sm:col-span-2">
                        <CustomTextArea
                          form={createTemplateForm}
                          field="escalationCondition"
                          label="Descrição da Regra"
                          placeholder="Ex: Aumenta a cada X dias consecutivos."
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80"
                    type="submit"
                    disabled={isCreatingTemplate}
                  >
                    {isCreatingTemplate
                      ? "Criando Modelo..."
                      : "Criar Modelo de Tag"}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Aba 3: Criar Categoria de Ação */}
            <TabsContent value="create-action" className="space-y-6">
              <Form {...createActionTypeForm}>
                <form
                  onSubmit={createActionTypeForm.handleSubmit(
                    onCreateActionTypeSubmit
                  )}
                  className="space-y-6"
                >
                  <CustomInput
                    form={createActionTypeForm}
                    field="name"
                    label="Nome do Tipo de Ação"
                    placeholder="Ex: Atividades de Projeto"
                  />
                  <CustomTextArea
                    form={createActionTypeForm}
                    field="description"
                    label="Descrição do Tipo de Ação"
                    placeholder="Agrupa todos os modelos de tag relacionados a..."
                  />
                  <Button
                    className="w-full bg-[#0126fb] hover:bg-[#0126fb]/80"
                    type="submit"
                    disabled={isCreatingAction}
                  >
                    {isCreatingAction ? "Criando..." : "Criar Ação"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default AdminActionsModal;
