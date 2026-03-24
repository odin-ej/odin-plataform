"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Loader2,
  Send,
  Inbox,
  Clock,
  CheckCircle2,
  Eye,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { useAuth } from "@/lib/auth/AuthProvider";

import {
  ExtendedReport,
  ReportFormValues,
  reportSchema,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
} from "@/lib/schemas/reportSchema";
import { ReportStatus } from "@prisma/client";
import { ReportsPageData } from "@/app/(dashboard)/reports/page";
import ReportFormModal from "./ReportFormModal";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Extended report with category and isAnonymous fields (pending Prisma client regeneration) */
type ReportWithExtras = ExtendedReport & {
  category: string;
  isAnonymous: boolean;
};

const ReportsContent = ({ initialData }: { initialData: ReportsPageData }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // --- UI State ---
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ExtendedReport | null>(
    null
  );
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isReceivedTab, setIsReceivedTab] = useState(false);
  const [activeTab, setActiveTab] = useState("enviados");

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit fields in detail modal (for received reports)
  const [editStatus, setEditStatus] = useState<ReportStatus>(
    ReportStatus.SUBMITTED
  );
  const [editNotes, setEditNotes] = useState("");

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      title: "",
      content: "",
      recipientUserId: "",
      category: "OUTRO",
      isAnonymous: false,
    },
  });

  // --- Data fetching ---
  const { data, isLoading: isLoadingData } = useQuery({
    queryKey: ["reportsData"],
    queryFn: async (): Promise<ReportsPageData> => {
      const [reportsRes, usersRes, rolesRes] = await Promise.all([
        axios.get(`${API_URL}/api/reports`),
        axios.get(`${API_URL}/api/users`),
        axios.get(`${API_URL}/api/roles`),
      ]);
      return {
        myReports: reportsRes.data.myReports,
        reportsForMe: reportsRes.data.reportsForMe,
        allUsers: usersRes.data.users,
        allRoles: rolesRes.data,
      };
    },
    initialData: initialData,
  });

  // --- Mutations ---
  const { mutate: createReport, isPending: isCreating } = useMutation({
    mutationFn: (reportData: ReportFormValues) =>
      axios.post(`${API_URL}/api/reports`, reportData),
    onSuccess: () => {
      toast.success("Report enviado com sucesso!");
      setIsCreateModalOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["reportsData"] });
    },
    onError: (error: unknown) =>
      toast.error("Erro ao criar report", {
        description: axios.isAxiosError(error)
          ? error.response?.data?.message
          : "Erro desconhecido",
      }),
  });

  const { mutate: updateReport, isPending: isUpdating } = useMutation({
    mutationFn: ({
      status,
      recipientNotes,
    }: {
      status: ReportStatus;
      recipientNotes: string;
    }) =>
      axios.patch(`${API_URL}/api/reports/${selectedReport!.id}`, {
        status,
        recipientNotes,
      }),
    onSuccess: () => {
      toast.success("Report atualizado com sucesso!");
      setIsDetailOpen(false);
      queryClient.invalidateQueries({ queryKey: ["reportsData"] });
    },
    onError: (error: unknown) =>
      toast.error("Erro ao atualizar report", {
        description: axios.isAxiosError(error)
          ? error.response?.data?.message
          : "Erro desconhecido",
      }),
  });

  // --- Computed values ---
  const isDirector = checkUserPermission(user, DIRECTORS_ONLY);

  const stats = useMemo(
    () => ({
      totalSent: data.myReports.length,
      totalReceived: data.reportsForMe.length,
      inAnalysis: [...data.myReports, ...data.reportsForMe].filter(
        (r) => r.status === ReportStatus.SUBMITTED
      ).length,
      completed: [...data.myReports, ...data.reportsForMe].filter(
        (r) => r.status === ReportStatus.APPROVED
      ).length,
    }),
    [data]
  );

  const filterReports = (reports: ExtendedReport[]) => {
    return reports.filter((r) => {
      const reportWithExtras = r as ExtendedReport & { category?: string; isAnonymous?: boolean };
      if (categoryFilter !== "all" && reportWithExtras.category !== categoryFilter)
        return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  };

  const filteredMyReports = useMemo(
    () => filterReports(data.myReports),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.myReports, categoryFilter, statusFilter]
  );

  const filteredReportsForMe = useMemo(
    () => filterReports(data.reportsForMe),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.reportsForMe, categoryFilter, statusFilter]
  );

  // --- Handlers ---
  const handleOpenCreate = () => {
    form.reset({
      title: "",
      content: "",
      recipientUserId: "",
      category: "OUTRO",
      isAnonymous: false,
    });
    setIsCreateModalOpen(true);
  };

  const handleViewReport = (report: ExtendedReport, fromReceived: boolean) => {
    setSelectedReport(report);
    setIsReceivedTab(fromReceived);
    setEditStatus(report.status);
    setEditNotes(report.recipientNotes ?? "");
    setIsDetailOpen(true);
  };

  const handleUpdateSubmit = () => {
    updateReport({ status: editStatus, recipientNotes: editNotes });
  };

  const getSenderDisplay = (report: ExtendedReport) => {
    const r = report as ReportWithExtras;
    if (r.isAnonymous && !isDirector) {
      return {
        name: "Anônimo",
        imageUrl: null,
        isAnonymous: true,
      };
    }
    return {
      name: report.referent?.name ?? "Desconhecido",
      imageUrl: report.referent?.imageUrl ?? null,
      isAnonymous: false,
    };
  };

  const getRecipientDisplay = (report: ExtendedReport) => {
    return (
      report.recipientUser?.name ??
      report.recipientRole?.name ??
      "Não especificado"
    );
  };

  // --- Render ---
  if (isLoadingData)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
      </div>
    );

  const renderTable = (
    reports: ExtendedReport[],
    isReceived: boolean
  ) => (
    <div className="border border-[#0126fb]/30 rounded-lg overflow-hidden bg-[#010d26]">
      <Table>
        <TableHeader>
          <TableRow className="bg-[#010d26] border-b border-[#0126fb]/30 hover:bg-[#010d26]">
            <TableHead className="text-gray-300">Título</TableHead>
            <TableHead className="text-gray-300">Categoria</TableHead>
            <TableHead className="text-gray-300">
              {isReceived ? "Remetente" : "Destinatário"}
            </TableHead>
            <TableHead className="text-gray-300">Status</TableHead>
            <TableHead className="text-gray-300">Data</TableHead>
            <TableHead className="text-gray-300 text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.length === 0 ? (
            <TableRow className="hover:bg-[#010d26]">
              <TableCell
                colSpan={6}
                className="text-center py-12 text-gray-400"
              >
                <div className="flex flex-col items-center gap-2">
                  <Send className="h-8 w-8 text-gray-600" />
                  <p>Nenhum report encontrado</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            reports.map((report) => {
              const r = report as ReportWithExtras;
              const categoryInfo =
                CATEGORY_CONFIG[r.category as keyof typeof CATEGORY_CONFIG] ??
                CATEGORY_CONFIG.OUTRO;
              const statusInfo =
                STATUS_CONFIG[report.status] ?? STATUS_CONFIG.SUBMITTED;

              return (
                <TableRow
                  key={report.id}
                  className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/30"
                >
                  <TableCell className="font-medium text-white max-w-[200px] truncate">
                    {report.title}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border", categoryInfo.className)}>
                      {categoryInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {isReceived ? (
                      (() => {
                        const sender = getSenderDisplay(report);
                        return (
                          <div className="flex items-center gap-2">
                            {sender.isAnonymous ? (
                              <UserX className="h-5 w-5 text-gray-400" />
                            ) : (
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={sender.imageUrl ?? ""} />
                                <AvatarFallback className="text-xs bg-[#0126fb]/30">
                                  {sender.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <span
                              className={cn(
                                "text-sm",
                                sender.isAnonymous
                                  ? "text-gray-400 italic"
                                  : "text-white"
                              )}
                            >
                              {sender.name}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-center gap-2">
                        {report.recipientUser?.imageUrl && (
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={report.recipientUser.imageUrl}
                            />
                            <AvatarFallback className="text-xs bg-[#0126fb]/30">
                              {getRecipientDisplay(report).charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <span className="text-sm text-white">
                          {getRecipientDisplay(report)}
                        </span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border", statusInfo.className)}>
                      {statusInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-400">
                    {format(new Date(report.createdAt), "dd/MM/yy HH:mm", {
                      locale: ptBR,
                    })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:bg-white/10 text-gray-400 hover:text-white"
                      onClick={() => handleViewReport(report, isReceived)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400">
            Registre e acompanhe comunicações com os membros da Casinha
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Enviados",
            value: stats.totalSent,
            icon: Send,
            iconColor: "text-[#0126fb]",
          },
          {
            label: "Recebidos",
            value: stats.totalReceived,
            icon: Inbox,
            iconColor: "text-[#f5b719]",
          },
          {
            label: "Em Análise",
            value: stats.inAnalysis,
            icon: Clock,
            iconColor: "text-orange-400",
          },
          {
            label: "Concluídos",
            value: stats.completed,
            icon: CheckCircle2,
            iconColor: "text-green-400",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-[#010d26] border border-[#0126fb]/30 rounded-lg p-4"
          >
            <p className="text-xs font-medium text-gray-400 mb-1">
              {stat.label}
            </p>
            <div className="text-2xl font-bold text-white flex items-center gap-2">
              <stat.icon className={cn("h-5 w-5", stat.iconColor)} />
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] bg-[#00205e] border-white/20 text-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
            <SelectItem
              value="all"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Todas categorias
            </SelectItem>
            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
              <SelectItem
                key={key}
                value={key}
                className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
              >
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] bg-[#00205e] border-white/20 text-white">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
            <SelectItem
              value="all"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Todos status
            </SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem
                key={key}
                value={key}
                className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
              >
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="bg-[#010d26] border border-[#0126fb]/30">
          <TabsTrigger
            value="enviados"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white text-gray-400"
          >
            Enviados ({filteredMyReports.length})
          </TabsTrigger>
          <TabsTrigger
            value="recebidos"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white text-gray-400"
          >
            Recebidos ({filteredReportsForMe.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviados">
          {renderTable(filteredMyReports, false)}
        </TabsContent>

        <TabsContent value="recebidos">
          {renderTable(filteredReportsForMe, true)}
        </TabsContent>
      </Tabs>

      {/* Create Modal */}
      <ReportFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        form={form}
        isLoading={isCreating}
        onSubmit={(formData: ReportFormValues) => createReport(formData)}
        users={data.allUsers.map((u) => ({ value: u.id, label: u.name }))}
      />

      {/* Detail Dialog */}
      {selectedReport && (
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          <DialogPortal>
            <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
            <DialogContent
              className={cn(
                "w-full max-w-lg",
                "bg-[#010d26] text-white border-2 border-[#0126fb]/80 p-6 rounded-md",
                "max-h-[80vh] overflow-y-auto"
              )}
            >
              <DialogHeader>
                <DialogTitle className="text-xl font-bold">
                  {isReceivedTab ? "Resolver Report" : "Detalhes do Report"}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-3">
                {/* Title */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Título</p>
                  <p className="text-sm text-white font-medium">
                    {selectedReport.title}
                  </p>
                </div>

                {/* Content */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Conteúdo</p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap">
                    {selectedReport.content}
                  </p>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3 bg-[#00205e]/50 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-gray-500">Categoria</p>
                    {(() => {
                      const sr = selectedReport as ReportWithExtras;
                      const catInfo =
                        CATEGORY_CONFIG[sr.category as keyof typeof CATEGORY_CONFIG] ??
                        CATEGORY_CONFIG.OUTRO;
                      return (
                        <Badge className={cn("border mt-1", catInfo.className)}>
                          {catInfo.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <Badge
                      className={cn(
                        "border mt-1",
                        STATUS_CONFIG[selectedReport.status].className
                      )}
                    >
                      {STATUS_CONFIG[selectedReport.status].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Remetente</p>
                    {(() => {
                      const sender = isReceivedTab
                        ? getSenderDisplay(selectedReport)
                        : {
                            name:
                              selectedReport.referent?.name ?? "Desconhecido",
                            imageUrl: selectedReport.referent?.imageUrl ?? null,
                            isAnonymous: false,
                          };
                      return (
                        <div className="flex items-center gap-2 mt-1">
                          {sender.isAnonymous ? (
                            <UserX className="h-4 w-4 text-gray-400" />
                          ) : sender.imageUrl ? (
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={sender.imageUrl} />
                              <AvatarFallback className="text-xs">
                                {sender.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          ) : null}
                          <span
                            className={cn(
                              "text-sm",
                              sender.isAnonymous
                                ? "text-gray-400 italic"
                                : "text-gray-300"
                            )}
                          >
                            {sender.name}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Destinatário</p>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedReport.recipientUser?.imageUrl && (
                        <Avatar className="h-5 w-5">
                          <AvatarImage
                            src={selectedReport.recipientUser.imageUrl}
                          />
                          <AvatarFallback className="text-xs">
                            {getRecipientDisplay(selectedReport).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-sm text-gray-300">
                        {getRecipientDisplay(selectedReport)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Data de criação</p>
                    <p className="text-sm text-gray-300 mt-1">
                      {format(
                        new Date(selectedReport.createdAt),
                        "dd/MM/yyyy 'às' HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                </div>

                {/* Recipient Notes (view) */}
                {selectedReport.recipientNotes && !isReceivedTab && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Notas do Destinatário
                    </p>
                    <p className="text-sm text-gray-300 bg-[#00205e]/50 rounded-lg p-3 whitespace-pre-wrap">
                      {selectedReport.recipientNotes}
                    </p>
                  </div>
                )}

                {/* Editable fields for received reports */}
                {isReceivedTab && (
                  <div className="border-t border-[#0126fb]/30 pt-4 space-y-4">
                    <div>
                      <Label className="text-sm text-gray-400">
                        Atualizar Status
                      </Label>
                      <Select
                        value={editStatus}
                        onValueChange={(val) =>
                          setEditStatus(val as ReportStatus)
                        }
                      >
                        <SelectTrigger className="mt-1 bg-[#00205e] border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                          {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem
                              key={key}
                              value={key}
                              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
                            >
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm text-gray-400">
                        Notas do Destinatário
                      </Label>
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Adicione suas notas sobre este report..."
                        className="mt-1 bg-[#00205e] border-white/20 text-white placeholder:text-gray-500 min-h-[80px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailOpen(false)}
                  className="text-white hover:bg-white/10"
                >
                  Fechar
                </Button>
                {isReceivedTab && (
                  <Button
                    onClick={handleUpdateSubmit}
                    disabled={isUpdating}
                    className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
                  >
                    {isUpdating ? "Salvando..." : "Salvar Alterações"}
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}
    </div>
  );
};

export default ReportsContent;
