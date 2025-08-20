/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { Award, Loader2, Building, Sparkles } from "lucide-react";
import CustomCard from "../../Global/Custom/CustomCard";
import CustomTable, { ColumnDef } from "../../Global/Custom/CustomTable";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MyPointsData } from "@/app/(dashboard)/meus-pontos/page";
import axios, { AxiosError } from "axios";
import {
  ReportFormData,
  SolicitationFormData,
  TagWithAction,
} from "@/lib/schemas/pointsSchema";
import { useState, useMemo } from "react";
import CustomModal, { FieldConfig } from "../../Global/Custom/CustomModal";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import {
  FullJRPointsReport,
  FullJRPointsSolicitation,
} from "./SolicitationsBoard";
import ModalConfirm from "../../Global/ModalConfirm";
import { Attachment, UploadableFile } from "../../Global/FileUploadZone";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import HistoryItemDetailsModal from "./HistoryItemDetailsModal";

interface HistoryData {
  tags: TagWithAction[];
  solicitations: FullJRPointsSolicitation[];
  reports: FullJRPointsReport[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;
type FormDataType = SolicitationFormData | ReportFormData;

// Função para buscar os dados da página
const fetchMyPoints = async (userId: string): Promise<MyPointsData> => {
  const { data } = await axios.get(`${API_URL}/api/my-points/${userId}`);
  return data;
};

const MyPointsContent = ({ initialData }: { initialData: MyPointsData }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();

  // --- ESTADOS GERAIS DO COMPONENTE ---
  const [requestType, setRequestType] = useState<"solicitation" | "report">(
    "solicitation"
  );
  const [requestTarget, setRequestTarget] = useState<"user" | "enterprise">(
    "user"
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<
    FullJRPointsSolicitation | FullJRPointsReport | null
  >(null);
  const [itemToDelete, setItemToDelete] = useState<{
    type: "solicitation" | "report" | "tag";
    id: string;
  } | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [uploadableFiles, setUploadableFiles] = useState<UploadableFile[]>([]);
  const [selectedView, setSelectedView] = useState<string>("current");
  const [activeTab, setActiveTab] = useState<string>("tags");
  const requestForm = useForm<FormDataType>();
  const [viewingItem, setViewingItem] = useState<any>(null);

  // --- BUSCA DE DADOS ---
  const { data, isLoading, isError } = useQuery({
    queryKey: ["myPoints", userId],
    queryFn: () => fetchMyPoints(userId!),
    initialData: initialData,
    enabled: !!userId,
  });

  const { data: historyData, isLoading: isLoadingHistory } =
    useQuery<HistoryData>({
      queryKey: ["pointHistoryDetails", userId, selectedView],
      queryFn: async () => {
        const endpoint =
          selectedView === "current"
            ? `${API_URL}/api/users/${user!.id}/history`
            : `${API_URL}/api/users/${user!.id}/snapshots/${selectedView}`;
        const { data } = await axios.get(endpoint);
        return data;
      },
      enabled: !!userId,
      initialData: { tags: [], solicitations: [], reports: [] },
    });

  // --- MUTATIONS ---
  const { mutateAsync: createRequest, isPending: isCreating } = useMutation({
    mutationFn: (requestData: {
      type: "solicitation" | "report";
      data: FormDataType;
      isForEnterprise: boolean;
    }) => {
      const endpoint =
        requestData.type === "solicitation"
          ? "/api/jr-points/solicitations"
          : "/api/jr-points/reports";
      return axios.post(`${API_URL}${endpoint}`, requestData.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPoints", userId] });
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
  });

  const { mutateAsync: updateRequest, isPending: isUpdating } = useMutation({
    mutationFn: (requestData: {
      type: "solicitation" | "report";
      data: FormDataType;
    }) => {
      if (!editingItem) throw new Error("Nenhum item selecionado para edição.");
      const endpoint =
        requestData.type === "solicitation"
          ? `/api/jr-points/solicitations/${editingItem.id}`
          : `/api/jr-points/reports/${editingItem.id}`;
      return axios.patch(`${API_URL}${endpoint}`, requestData.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myPoints", userId] });
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
  });

  const { mutate: deleteRequest, isPending: isDeleting } = useMutation({
    mutationFn: (item: {
      type: "solicitation" | "report" | "tag";
      id: string;
    }) => {
      const endpoint = `/api/jr-points/${item.type}s/${item.id}`;
      return axios.delete(`${API_URL}${endpoint}`);
    },
    onSuccess: () => {
      toast.success("Deletado com sucesso!");
      setIsDeleteConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ["myPoints", userId] });
      queryClient.invalidateQueries({ queryKey: ["enterprisePointsData"] });
    },
    onError: (error: AxiosError<{ message: string }>) =>
      toast.error("Erro ao deletar", {
        description: error.response?.data?.message,
      }),
  });

  const isPendingRequest = isCreating || isUpdating;

  const isDirector = checkUserPermission(user, DIRECTORS_ONLY);

  const {
    myPoints,
    allTagTemplates,
    allUsers,
    mySemesterScores,
    enterpriseTags,
  } = data!;

  // --- HANDLERS E FUNÇÕES AUXILIARES ---
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setUploadableFiles([]);
    requestForm.reset();
  };

  const handleOpenModal = (
    type: "solicitation" | "report",
    target: "user" | "enterprise"
  ) => {
    setRequestType(type);
    setRequestTarget(target);
    setEditingItem(null);
    setUploadableFiles([]);
    requestForm.reset(
      type === "solicitation"
        ? { description: "", datePerformed: format(new Date(), "yyyy-MM-dd") }
        : { description: "", tagId: "" }
    );
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (
    item: FullJRPointsSolicitation | FullJRPointsReport,
    type: "solicitation" | "report"
  ) => {
    setRequestType(type);
    setRequestTarget(item.isForEnterprise ? "enterprise" : "user");
    setEditingItem(item);

    const existingFiles: UploadableFile[] = (item.attachments || []).map(
      (att) => ({
        id: att.id || uuidv4(),
        file: new File([], att.fileName, { type: att.fileType }),
        status: "success",
        progress: 100,
        source: "existing",
        url: att.url,
      })
    );
    setUploadableFiles(existingFiles);

    if (type === "solicitation") {
      const sol = item as FullJRPointsSolicitation;
      requestForm.reset({
        description: sol.description,
        datePerformed: format(new Date(sol.datePerformed), "yyyy-MM-dd"),
        tags: sol.tags.map((t: any) => t.id),
        membersSelected: sol.membersSelected.map((m: any) => m.id),
      });
    } else {
      const rep = item as FullJRPointsReport;
      requestForm.reset({ description: rep.description, tagId: rep.tagId });
    }
    setIsModalOpen(true);
  };

  const handleOpenDeleteModal = (
    item: { id: string },
    type: "solicitation" | "report" | "tag"
  ) => {
    setItemToDelete({ id: item.id, type });
    setIsDeleteConfirmOpen(true);
  };

  const handleRequestSubmit = async (formData: FormDataType) => {
    const toastId = toast.loading("Preparando para enviar...");
    try {
      const existingAttachments = uploadableFiles
        .filter((f) => f.source === "existing")
        .map((f) => ({
          url: f.url!,
          fileName: f.file.name,
          fileType: f.file.type,
        }));
      const newFilesToUpload = uploadableFiles.filter(
        (f) => f.status === "pending"
      );
      let newUploadedAttachments: Attachment[] = [];

      if (newFilesToUpload.length > 0) {
        toast.loading(
          `Enviando ${newFilesToUpload.length} novo(s) arquivo(s)...`,
          { id: toastId }
        );
        const uploadPromises = newFilesToUpload.map(
          (uploadableFile) =>
            new Promise<Attachment>(async (resolve, reject) => {
              try {
                setUploadableFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadableFile.id
                      ? { ...f, status: "uploading" }
                      : f
                  )
                );
                const { data: presignedData } = await axios.post(
                  "/api/jr-points/upload",
                  {
                    fileName: uploadableFile.file.name,
                    fileType: uploadableFile.file.type,
                    fileSize: uploadableFile.file.size,
                    subfolder: `${requestType}s`,
                  }
                );
                await axios.put(presignedData.uploadUrl, uploadableFile.file, {
                  headers: { "Content-Type": uploadableFile.file.type },
                  onUploadProgress: (progressEvent) => {
                    const progress = Math.round(
                      (progressEvent.loaded * 100) / (progressEvent.total || 1)
                    );
                    setUploadableFiles((prev) =>
                      prev.map((f) =>
                        f.id === uploadableFile.id ? { ...f, progress } : f
                      )
                    );
                  },
                });

                const finalAttachment = {
                  url: presignedData.s3Key,
                  fileName: presignedData.fileName,
                  fileType: presignedData.fileType,
                };
                setUploadableFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadableFile.id
                      ? { ...f, status: "success", url: finalAttachment.url }
                      : f
                  )
                );
                resolve(finalAttachment);
              } catch (error) {
                setUploadableFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadableFile.id ? { ...f, status: "error" } : f
                  )
                );
                reject(error);
              }
            })
        );
        newUploadedAttachments = await Promise.all(uploadPromises);
      }

      toast.loading("Finalizando o envio...", { id: toastId });
      const finalAttachments = [
        ...existingAttachments,
        ...newUploadedAttachments,
      ];

      const finalData = {
        ...formData,
        attachments: finalAttachments,
        isForEnterprise: requestTarget === "enterprise",
      };

      if (editingItem) {
        await updateRequest({ type: requestType, data: finalData });
      } else {
        await createRequest({
          type: requestType,
          data: finalData,
          isForEnterprise: requestTarget === "enterprise",
        });
      }

      toast.success("Operação concluída com sucesso!", { id: toastId });
      handleCloseModal();
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>;
      toast.error("Falha ao enviar solicitação", {
        id: toastId,
        description:
          axiosError.response?.data?.message ||
          "Um dos uploads pode ter falhado.",
      });
    }
  };

  const handleOpenViewModal = (
    item: any,
    type: "tag" | "solicitation" | "report"
  ) => {
    setViewingItem({ data: item, type });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge className="bg-[#f5b719] text-white hover:bg-[#f5b719]/80">
            Em análise
          </Badge>
        );
      case "APPROVED":
        return (
          <Badge className="bg-green-600 hover:bg-green-600/80">Aprovado</Badge>
        );
      case "REJECTED":
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const tagsWithStreakInfo = useMemo(() => {
    if (!historyData?.tags || !allTagTemplates) return [];
    return historyData.tags.map((tag) => {
      const template = allTagTemplates.find((t) => t.id === tag.templateId);
      if (
        !template ||
        !template.isScalable ||
        tag.value === template.baseValue
      ) {
        return { ...tag, bonus: 0 };
      }
      const bonus = tag.value - template.baseValue;
      return { ...tag, bonus };
    });
  }, [historyData?.tags, allTagTemplates]);

  // --- DEFINIÇÕES DE COLUNAS E CAMPOS DO FORMULÁRIO ---
  const targetColumn: ColumnDef<any> = {
    accessorKey: "isForEnterprise",
    header: "Alvo",
    cell: (row) => (
      <Badge
        variant={row.isForEnterprise ? "default" : "secondary"}
        className={
          row.isForEnterprise
            ? "bg-[#00205e] hover:bg-[#00205e/80]"
            : "bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
        }
      >
        {row.isForEnterprise ? "Empresa" : "Pessoal"}
      </Badge>
    ),
  };

  const tagColumns: ColumnDef<TagWithAction>[] = [
      { accessorKey: 'template', header: 'Título', cell: (row) => row.template?.name},
    { accessorKey: "description", header: "Descrição" },
    {
      accessorKey: "actionType",
      header: "Tipo",
      cell: (row) => row.actionType?.name || "N/A",
    },
    {
      accessorKey: "datePerformed",
      header: "Data",
      cell: (row) => format(new Date(row.datePerformed), "dd/MM/yyyy"),
    },
    {
      accessorKey: "jrPointsVersion",
      header: "Versão",
      cell: (row) => row.jrPointsVersion?.versionName,
    },
    {
      accessorKey: "assigner",
      header: "Atribuído por",
      cell: (row) => row?.assigner?.name || "Sistema",
    },
    {
      accessorKey: "isFromAppeal",
      header: "Recurso?",
      cell: (row) => (row.isFromAppeal ? "Sim" : "Nao"),
    },
    {
      accessorKey: "value",
      header: "Pontos",
      className: "text-right font-semibold",
      cell: (row) => (
        <div className="flex flex-col items-end">
          <span className="text-base text-white">{row.value}</span>
          {row.template?.isScalable && row.template?.escalationValue && (
            <div
              className={`flex items-center text-xs ${
                row.template?.escalationValue > 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              <span>
                (
                {row.template?.escalationValue > 0
                  ? `+${row.template?.escalationValue}`
                  : row.template?.escalationValue}{" "}
                streak)
              </span>
            </div>
          )}
        </div>
      ),
    },
  ];

  const solicitationColumns: ColumnDef<FullJRPointsSolicitation>[] = [
    targetColumn,
    {
      accessorKey: "description",
      header: "Descrição",
      cell: (row) => (
        <p className="truncate max-w-[200px]">{row.description}</p>
      ),
    },
    {
      accessorKey: "membersSelected",
      header: "Envolvidos",
      cell: (row) => {
        return (
          <div className="flex gap-2">
            {row.membersSelected.map((member) => (
              <Avatar key={member.id} className="h-8 w-8">
                <AvatarImage
                  src={member.imageUrl}
                  alt={member.name}
                  className="object-cover"
                />
                <AvatarFallback className="bg-[#0126fb] text-xs">
                  {member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
            ))}
            {row.isForEnterprise && (
              <Avatar key={"enterprise-id"} className="h-8 w-8">
                <AvatarImage
                  src={"/logo-amarela.png"}
                  alt={"Logo da empresa"}
                  className="object-cover"
                />
              </Avatar>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => getStatusBadge(row.status),
    },
    {
      accessorKey: "reviewer",
      header: "Auditado por",
      cell: (row) => {
        if (!row.reviewer) return "Diretoria";
        return (
          <div className="flex items-center gap-3">
            <Avatar key={row.reviewer.id} className="h-8 w-8">
              <AvatarImage
                src={row.reviewer.imageUrl}
                alt={row.reviewer.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-[#0126fb] text-xs">
                {row.reviewer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span>{row.reviewer.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: "Data",
      cell: (row) => format(new Date(row.createdAt), "dd/MM/yyyy"),
    },
  ];

  const reportColumns: ColumnDef<FullJRPointsReport>[] = [
    targetColumn,
    {
      accessorKey: "description",
      header: "Descrição",

      cell: (row) => (
        <p className="truncate max-w-[200px]">{row.description}</p>
      ),
    },
    {
      accessorKey: "tag",
      header: "Tag Reclamada",
      cell: (row) => row.tag.description,
    },
    {
      accessorKey: "reviewer",
      header: "Auditador por",
      cell: (row) => {
        if (!row.reviewer) return "Diretoria";
        return (
          <div className="flex items-center gap-3">
            <Avatar key={row.reviewer.id} className="h-8 w-8">
              <AvatarImage
                src={row.reviewer.imageUrl}
                alt={row.reviewer.name}
                className="object-cover"
              />
              <AvatarFallback className="bg-[#0126fb] text-xs">
                {row.reviewer.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <span>{row.reviewer.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (row) => getStatusBadge(row.status),
    },
  ];

  const requestFields = useMemo((): FieldConfig<FormDataType>[] => {
    const attachmentField: FieldConfig<FormDataType> = {
      accessorKey: "attachments" as const,
      header: "Anexos",
      type: "attachments" as const,
      uploadableFiles: uploadableFiles,
      onFilesChange: setUploadableFiles,
    };

    const memberSelect: FieldConfig<FormDataType> = {
      accessorKey: "membersSelected" as any,
      header: "Membros Envolvidos",
      type: "command" as const,
      options: allUsers.map((u) => ({ value: u.id, label: u.name })),
      isMulti: true,
    };

    if (requestType === "solicitation") {
      const options =
        requestTarget === "enterprise"
          ? allTagTemplates.filter((t) => t.areas.includes("GERAL"))
          : allTagTemplates;

      const fields: FieldConfig<FormDataType>[] = [
        {
          accessorKey: "description",
          header: "Descrição da Atividade",
          type: "textarea",
        },
        {
          accessorKey: "datePerformed",
          header: "Data de Realização",
          type: "date",
        },
        attachmentField,
        {
          accessorKey: "tags",
          header: "Tags Relacionadas",
          type: "command",
          options: options.map((t) => ({ value: t.id, label: t.name })),
          isMulti: true,
        },
      ];

      if (requestTarget === "user") {
        fields.push(memberSelect);
      }

      return fields;
    }

    // Lógica para requestType === "report" (sem alterações, mas agora está correta)
    const options =
      requestTarget === "enterprise" ? enterpriseTags : myPoints?.tags;

    const fields = [
      {
        accessorKey: "description" as any,
        header: "Descrição do Recurso",
        type: "textarea" as const,
      },
      {
        accessorKey: "tagId" as const,
        header: "Tag a ser Reavaliada",
        type: "command" as const,
        options: options?.map((t: any) => ({
          value: t.id,
          label: `${t.description} (${t.value} pts)`,
        })),
      },

      attachmentField,
    ];

    return requestTarget === "enterprise" ? fields : [...fields, memberSelect];
  }, [
    requestType,
    requestTarget,
    allTagTemplates,
    allUsers,
    enterpriseTags,
    myPoints?.tags,
    uploadableFiles,
  ]);
  if (isLoading || !data || !historyData)
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-[#f5b719]" />
      </div>
    );
  if (isError)
    return (
      <div className="p-8 text-white text-center">
        Erro ao carregar seus pontos.
      </div>
    );

  const selectedSnapshot = mySemesterScores?.find((s) => s.id === selectedView);
  const displayPoints =
    selectedView === "current"
      ? myPoints?.totalPoints
      : selectedSnapshot?.totalPoints;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 sm:items-end mb-8">
        <CustomCard
          type="link"
          icon={Award}
          title={
            selectedView === "current"
              ? "Meus Pontos Atuais"
              : `Pontos em ${selectedSnapshot?.semester}`
          }
          value={displayPoints || 0}
          className="flex-grow"
        />
      </div>

      <div className="p-6 rounded-lg bg-[#010d26] border border-gray-800">
        <h2 className="text-2xl font-bold mb-2 text-white">
          Ações e Transparência
        </h2>
        <p className="text-gray-400 mb-6">
          Crie novas solicitações de pontos ou conteste pontuações existentes.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#00205e]/30 p-4 rounded-md flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 mb-3 border-2 border-[#0126fb]">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback>{user?.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg text-white">Minhas Ações</h3>
            <p className="text-xs text-gray-500 mb-4">
              Ações para pontuação pessoal
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="text-[#0126fb] border-[#0126fb] bg-[#0126fb]/10 hover:bg-[#0126fb]/20"
                onClick={() => handleOpenModal("solicitation", "user")}
              >
                Solicitar Pontos
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent text-[#f5b719] border-[#f5b719] hover:bg-[#f5b719]/20 hover:text-[#f5b719]"
                onClick={() => handleOpenModal("report", "user")}
              >
                Criar Recurso
              </Button>
            </div>
          </div>
          <div className="bg-[#00205e]/30 p-4 rounded-md flex flex-col items-center text-center">
            <Avatar className="h-16 w-16 mb-3">
              <AvatarImage src="/logo-amarela.png" />
              <AvatarFallback className="bg-purple-600">
                <Building />
              </AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-lg text-white">
              Ações da Empresa
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              Para o placar da empresa
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="text-[#0126fb] border-[#0126fb] bg-[#0126fb]/10 hover:bg-[#0126fb]/20"
                onClick={() => handleOpenModal("solicitation", "enterprise")}
              >
                Solicitar Pontos
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent text-[#f5b719] border-[#f5b719] hover:bg-[#f5b719]/20 hover:text-[#f5b719]"
                onClick={() => handleOpenModal("report", "enterprise")}
              >
                Contestar Tag
              </Button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-full sm:w-auto flex-shrink-0 mt-4">
        <label className="text-md font-semibold mb-2 text-[#f5b719]">
          Ver Histórico de JR Points
        </label>
        <Select value={selectedView} onValueChange={setSelectedView}>
          <SelectTrigger className="w-full sm:w-[240px] bg-[#00205e] border-[#0126fb] text-white">
            <SelectValue placeholder="Selecione um período" />
          </SelectTrigger>
          <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
            <SelectItem className="bg-transparent" value="current">
              JR Points Atual
            </SelectItem>
            {mySemesterScores?.map((score) => (
              <SelectItem key={score.id} value={score.id}>
                Histórico: {score.semester} ({score.totalPoints} pts)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-8">
        <div className="hidden md:block">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-3 bg-transparent text-[#f5b719] border-[#f5b719] border-2">
              <TabsTrigger
                className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                value="tags"
              >
                Extrato de Pontos
              </TabsTrigger>
              <TabsTrigger
                className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                value="solicitations"
              >
                Minhas Solicitações ({historyData.solicitations.length})
              </TabsTrigger>
              <TabsTrigger
                className="text-[#f5b719] data-[state=active]:!bg-[#f5b719]/10"
                value="reports"
              >
                Meus Recursos ({historyData.reports.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="md:hidden">
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full md:w-[240px] bg-[#f5b719]/10 border-[#f5b719] text-[#f5b719]">
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent className="bg-[#00205e]/90 text-white hover:text-white transition-colors border-[#f5b719]">
              <SelectItem
                className=" !bg-[#00205e]/90 !text-white hover:!text-[#f5b719] transition-colors"
                value="tags"
              >
                Extrato de Pontos
              </SelectItem>
              <SelectItem
                className=" !bg-[#00205e]/90 !text-white hover:!text-[#f5b719] transition-colors"
                value="solicitations"
              >
                Minhas Solicitações ({historyData.solicitations.length})
              </SelectItem>
              <SelectItem
                className=" !bg-[#00205e]/90 !text-white hover:!text-[#f5b719] transition-colors"
                value="reports"
              >
                {" "}
                Meus Recursos ({historyData.reports.length})
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {activeTab === "tags" && (
          <>
            {isLoadingHistory ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-[#f5b719]" />
              </div>
            ) : (
              <CustomTable<TagWithAction>
                filterColumns={[
                  "areas",
                  "assigner",
                  "datePerformed",
                  "description",
                  "isFromAppeal",
                  "jrPointsVersion",
                  "value",
                ]}
                columns={tagColumns}
                data={tagsWithStreakInfo || []}
                title={`Extrato (${selectedView === "current" ? "Atual" : selectedSnapshot?.semester})`}
                type={isDirector ? "onlyDelete" : "onlyView"}
                itemsPerPage={10}
                onRowClick={(row) => handleOpenViewModal(row, "tag")}
                onDelete={
                  isDirector
                    ? (row) => handleOpenDeleteModal(row, "tag")
                    : undefined
                }
              />
            )}
          </>
        )}

        {activeTab === "solicitations" && (
          <CustomTable<FullJRPointsSolicitation>
            columns={solicitationColumns}
            data={historyData?.solicitations || []}
            title="Minhas Solicitações"
            filterColumns={["description", "status"]}
            type="noSelection"
            itemsPerPage={5}
            onRowClick={(item) => handleOpenViewModal(item, "solicitation")}
            onEdit={(item) => handleOpenEditModal(item, "solicitation")}
            onDelete={(item) => handleOpenDeleteModal(item, "solicitation")}
            isRowEditable={(row) =>
              isDirector ? true : row.status === "PENDING"
            }
            isRowDeletable={(row) =>
              isDirector ? true : row.status === "PENDING"
            }
          />
        )}

        {activeTab === "reports" && (
          <CustomTable<FullJRPointsReport>
            columns={reportColumns}
            data={historyData?.reports || []}
            title="Meus Recursos"
            filterColumns={["description", "status"]}
            type="noSelection"
            itemsPerPage={5}
            onRowClick={(item) => handleOpenViewModal(item, "report")}
            onEdit={(item) => handleOpenEditModal(item, "report")}
            onDelete={(item) => handleOpenDeleteModal(item, "report")}
            isRowEditable={(row) =>
              isDirector ? true : row.status === "PENDING"
            }
            isRowDeletable={(row) =>
              isDirector ? true : row.status === "PENDING"
            }
          />
        )}
      </div>

      <CustomModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={
          editingItem
            ? `Editar ${requestType === "solicitation" ? "Solicitação" : "Recurso"} ${requestTarget === "enterprise" ? "para Empresa" : "Pessoal"}`
            : `Criar ${requestType === "solicitation" ? "Solicitação" : "Recurso"} ${requestTarget === "user" ? "Pessoal" : "para Empresa"}`
        }
        form={requestForm}
        fields={requestFields}
        onSubmit={handleRequestSubmit}
        isEditing={true}
        isLoading={isPendingRequest}
        setIsEditing={() => {}}
      />

      {itemToDelete && (
        <ModalConfirm
          open={isDeleteConfirmOpen}
          onCancel={() => setIsDeleteConfirmOpen(false)}
          onConfirm={() => deleteRequest(itemToDelete as any)}
          isLoading={isDeleting}
          title={`Confirmar Exclusão`}
          description={`Tem certeza que deseja excluir? Esta ação não pode ser desfeita.`}
        />
      )}

      <HistoryItemDetailsModal
        isOpen={!!viewingItem}
        onClose={() => setViewingItem(null)}
        item={viewingItem}
      />
    </>
  );
};

export default MyPointsContent;
