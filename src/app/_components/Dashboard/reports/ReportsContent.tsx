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
  FileText,
  X,
  CalendarDays,
  User,
  Tag,
  AlertCircle,
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
  baseReportSchema,
  CATEGORY_CONFIG,
  STATUS_CONFIG,
} from "@/lib/schemas/reportSchema";
import { ReportStatus } from "@prisma/client";
import { ReportsPageData } from "@/app/(dashboard)/reports/page";
import ReportFormModal from "./ReportFormModal";
import Pagination from "@/app/_components/Global/Custom/Pagination";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

/** Extended report with category and isAnonymous fields (pending Prisma client regeneration) */
type ReportWithExtras = ExtendedReport & {
  category: string;
  isAnonymous: boolean;
};

const REPORTS_PER_PAGE = 10;

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

  // Pagination
  const [sentPage, setSentPage] = useState(1);
  const [receivedPage, setReceivedPage] = useState(1);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Edit fields in detail modal (for received reports)
  const [editStatus, setEditStatus] = useState<ReportStatus>(
    ReportStatus.SUBMITTED
  );
  const [editNotes, setEditNotes] = useState("");

  const form = useForm<ReportFormValues>({
    resolver: zodResolver(baseReportSchema),
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

  const hasActiveFilters = categoryFilter !== "all" || statusFilter !== "all";

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

  // Paginated data
  const paginatedSent = filteredMyReports.slice(
    (sentPage - 1) * REPORTS_PER_PAGE,
    sentPage * REPORTS_PER_PAGE
  );
  const totalSentPages = Math.max(1, Math.ceil(filteredMyReports.length / REPORTS_PER_PAGE));

  const paginatedReceived = filteredReportsForMe.slice(
    (receivedPage - 1) * REPORTS_PER_PAGE,
    receivedPage * REPORTS_PER_PAGE
  );
  const totalReceivedPages = Math.max(1, Math.ceil(filteredReportsForMe.length / REPORTS_PER_PAGE));

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

  const handleClearFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSentPage(1);
    setReceivedPage(1);
  };

  const getSenderDisplay = (report: ExtendedReport) => {
    const r = report as ReportWithExtras;
    if (r.isAnonymous && !isDirector) {
      return {
        name: "Anonimo",
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
      "Nao especificado"
    );
  };

  // --- Render ---
  if (isLoadingData)
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="animate-spin text-[#f5b719] h-12 w-12" />
      </div>
    );

  const renderEmptyState = (isReceived: boolean) => (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="rounded-full bg-[#0126fb]/10 p-4 mb-4">
        {isReceived ? (
          <Inbox className="h-10 w-10 text-[#0126fb]/60" />
        ) : (
          <Send className="h-10 w-10 text-[#0126fb]/60" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">
        Nenhum report encontrado
      </h3>
      <p className="text-sm text-gray-400 text-center max-w-sm">
        {isReceived
          ? "Voce ainda nao recebeu nenhum report. Quando alguem enviar um report para voce, ele aparecera aqui."
          : "Voce ainda nao enviou nenhum report. Clique em \"Novo Report\" para comecar."}
      </p>
    </div>
  );

  const renderMobileCard = (report: ExtendedReport, isReceived: boolean) => {
    const r = report as ReportWithExtras;
    const categoryInfo =
      CATEGORY_CONFIG[r.category as keyof typeof CATEGORY_CONFIG] ??
      CATEGORY_CONFIG.OUTRO;
    const statusInfo =
      STATUS_CONFIG[report.status] ?? STATUS_CONFIG.SUBMITTED;

    return (
      <div
        key={report.id}
        className="bg-[#010d26] border border-[#0126fb]/20 rounded-xl p-4 space-y-3 cursor-pointer hover:border-[#0126fb]/50 transition-colors"
        onClick={() => handleViewReport(report, isReceived)}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold text-white truncate flex-1">
            {report.title}
          </h3>
          <Badge className={cn("border text-xs shrink-0", statusInfo.className)}>
            {statusInfo.label}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Badge className={cn("border text-xs", categoryInfo.className)}>
            {categoryInfo.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {isReceived ? (
              <span className={cn(
                getSenderDisplay(report).isAnonymous && "italic text-gray-500"
              )}>
                {getSenderDisplay(report).name}
              </span>
            ) : (
              <span>{getRecipientDisplay(report)}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>
              {format(new Date(report.createdAt), "dd/MM/yy", { locale: ptBR })}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderTable = (
    reports: ExtendedReport[],
    allFiltered: ExtendedReport[],
    isReceived: boolean,
    currentPage: number,
    totalPages: number,
    onPageChange: (page: number) => void
  ) => (
    <div className="space-y-0">
      {allFiltered.length === 0 ? (
        renderEmptyState(isReceived)
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block border border-[#0126fb]/20 rounded-xl overflow-hidden bg-[#010d26]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#00205e]/40 border-b border-[#0126fb]/20 hover:bg-[#00205e]/40">
                  <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-4 px-5">
                    Titulo
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-4 px-5">
                    Categoria
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-4 px-5">
                    {isReceived ? "Remetente" : "Destinatario"}
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-4 px-5">
                    Status
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-4 px-5">
                    Data
                  </TableHead>
                  <TableHead className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider py-4 px-5 text-right">
                    Acoes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => {
                  const r = report as ReportWithExtras;
                  const categoryInfo =
                    CATEGORY_CONFIG[r.category as keyof typeof CATEGORY_CONFIG] ??
                    CATEGORY_CONFIG.OUTRO;
                  const statusInfo =
                    STATUS_CONFIG[report.status] ?? STATUS_CONFIG.SUBMITTED;

                  return (
                    <TableRow
                      key={report.id}
                      className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/20 transition-colors"
                    >
                      <TableCell className="font-medium text-white max-w-[200px] truncate px-5">
                        {report.title}
                      </TableCell>
                      <TableCell className="px-5">
                        <Badge className={cn("border", categoryInfo.className)}>
                          {categoryInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="px-5">
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
                      <TableCell className="px-5">
                        <Badge className={cn("border", statusInfo.className)}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-gray-400 px-5">
                        {format(new Date(report.createdAt), "dd/MM/yy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="text-right px-5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-[#0126fb]/20 text-gray-400 hover:text-white transition-colors"
                          onClick={() => handleViewReport(report, isReceived)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {reports.map((report) => renderMobileCard(report, isReceived))}
          </div>

          {/* Pagination */}
          {allFiltered.length > REPORTS_PER_PAGE && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-gray-400 mt-1">
            Registre e acompanhe comunicacoes com os membros da Casinha
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Enviados",
            value: stats.totalSent,
            icon: Send,
            iconColor: "text-[#0126fb]",
            bgTint: "bg-[#0126fb]/10",
            borderColor: "border-[#0126fb]/30",
          },
          {
            label: "Recebidos",
            value: stats.totalReceived,
            icon: Inbox,
            iconColor: "text-[#f5b719]",
            bgTint: "bg-[#f5b719]/10",
            borderColor: "border-[#f5b719]/30",
          },
          {
            label: "Em Analise",
            value: stats.inAnalysis,
            icon: Clock,
            iconColor: "text-orange-400",
            bgTint: "bg-orange-400/10",
            borderColor: "border-orange-400/30",
          },
          {
            label: "Concluidos",
            value: stats.completed,
            icon: CheckCircle2,
            iconColor: "text-green-400",
            bgTint: "bg-green-400/10",
            borderColor: "border-green-400/30",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "bg-[#010d26] border rounded-xl py-5 px-6 transition-colors hover:bg-[#00205e]/20",
              stat.borderColor
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                {stat.label}
              </p>
              <div className={cn("rounded-lg p-2", stat.bgTint)}>
                <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={categoryFilter}
          onValueChange={(val) => {
            setCategoryFilter(val);
            setSentPage(1);
            setReceivedPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] bg-[#00205e]/60 border-white/10 text-white rounded-full h-9 text-sm">
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

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setSentPage(1);
            setReceivedPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] bg-[#00205e]/60 border-white/10 text-white rounded-full h-9 text-sm">
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

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            className="text-gray-400 hover:text-white hover:bg-white/5 rounded-full h-9 gap-1.5 text-sm"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="bg-[#010d26] border border-[#0126fb]/20 rounded-lg p-1 h-auto">
          <TabsTrigger
            value="enviados"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white data-[state=active]:shadow-md text-gray-400 rounded-md px-4 py-2 text-sm transition-all gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            Enviados
            <span className="ml-1 bg-white/10 data-[state=active]:bg-white/20 text-xs rounded-full px-2 py-0.5 min-w-[24px] text-center">
              {filteredMyReports.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="recebidos"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white data-[state=active]:shadow-md text-gray-400 rounded-md px-4 py-2 text-sm transition-all gap-2"
          >
            <Inbox className="h-3.5 w-3.5" />
            Recebidos
            <span className="ml-1 bg-white/10 data-[state=active]:bg-white/20 text-xs rounded-full px-2 py-0.5 min-w-[24px] text-center">
              {filteredReportsForMe.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviados" className="mt-4">
          {renderTable(paginatedSent, filteredMyReports, false, sentPage, totalSentPages, setSentPage)}
        </TabsContent>

        <TabsContent value="recebidos" className="mt-4">
          {renderTable(paginatedReceived, filteredReportsForMe, true, receivedPage, totalReceivedPages, setReceivedPage)}
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
                "bg-[#010d26] text-white border border-[#0126fb]/30 rounded-xl",
                "p-0 max-h-[85vh] flex flex-col overflow-hidden"
              )}
            >
              {/* Sticky Header */}
              <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#0126fb]/20 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-[#0126fb]/10 p-2.5">
                    <FileText className="h-5 w-5 text-[#0126fb]" />
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold text-white">
                      {isReceivedTab ? "Resolver Report" : "Detalhes do Report"}
                    </DialogTitle>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {format(
                        new Date(selectedReport.createdAt),
                        "dd/MM/yyyy 'as' HH:mm",
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                </div>
              </DialogHeader>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                {/* Title */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Titulo
                  </p>
                  <p className="text-sm text-white font-medium">
                    {selectedReport.title}
                  </p>
                </div>

                {/* Content */}
                <div>
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Conteudo
                  </p>
                  <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selectedReport.content}
                  </p>
                </div>

                {/* Metadata grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#00205e]/40 rounded-xl p-3.5 border border-[#0126fb]/10">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Categoria
                    </p>
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
                  <div className="bg-[#00205e]/40 rounded-xl p-3.5 border border-[#0126fb]/10">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Status
                    </p>
                    <Badge
                      className={cn(
                        "border mt-1",
                        STATUS_CONFIG[selectedReport.status].className
                      )}
                    >
                      {STATUS_CONFIG[selectedReport.status].label}
                    </Badge>
                  </div>
                </div>

                {/* Sender / Recipient Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#00205e]/40 rounded-xl p-3.5 border border-[#0126fb]/10">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Remetente
                    </p>
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
                        <div className="flex items-center gap-2.5">
                          {sender.isAnonymous ? (
                            <div className="rounded-full bg-gray-600/30 p-1.5">
                              <UserX className="h-4 w-4 text-gray-400" />
                            </div>
                          ) : (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={sender.imageUrl ?? ""} />
                              <AvatarFallback className="text-xs bg-[#0126fb]/30 text-white">
                                {sender.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          <span
                            className={cn(
                              "text-sm font-medium",
                              sender.isAnonymous
                                ? "text-gray-400 italic"
                                : "text-white"
                            )}
                          >
                            {sender.name}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className="bg-[#00205e]/40 rounded-xl p-3.5 border border-[#0126fb]/10">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Destinatario
                    </p>
                    <div className="flex items-center gap-2.5">
                      {selectedReport.recipientUser?.imageUrl ? (
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={selectedReport.recipientUser.imageUrl}
                          />
                          <AvatarFallback className="text-xs bg-[#0126fb]/30 text-white">
                            {getRecipientDisplay(selectedReport).charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="rounded-full bg-[#0126fb]/20 p-1.5">
                          <User className="h-4 w-4 text-[#0126fb]" />
                        </div>
                      )}
                      <span className="text-sm font-medium text-white">
                        {getRecipientDisplay(selectedReport)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recipient Notes (view) */}
                {selectedReport.recipientNotes && !isReceivedTab && (
                  <div>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                      Notas do Destinatario
                    </p>
                    <p className="text-sm text-gray-300 bg-[#00205e]/40 rounded-xl p-4 whitespace-pre-wrap border border-[#0126fb]/10 leading-relaxed">
                      {selectedReport.recipientNotes}
                    </p>
                  </div>
                )}

                {/* Editable fields for received reports */}
                {isReceivedTab && (
                  <div className="border-t border-[#0126fb]/20 pt-5 space-y-4">
                    <div>
                      <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Atualizar Status
                      </Label>
                      <Select
                        value={editStatus}
                        onValueChange={(val) =>
                          setEditStatus(val as ReportStatus)
                        }
                      >
                        <SelectTrigger className="mt-2 bg-[#00205e]/60 border-white/10 text-white rounded-lg">
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
                      <Label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                        Notas do Destinatario
                      </Label>
                      <Textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Adicione suas notas sobre este report..."
                        className="mt-2 bg-[#00205e]/60 border-white/10 text-white placeholder:text-gray-500 min-h-[80px] rounded-lg"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky Footer */}
              <DialogFooter className="px-6 py-4 border-t border-[#0126fb]/20 shrink-0 bg-[#010d26]">
                <Button
                  variant="ghost"
                  onClick={() => setIsDetailOpen(false)}
                  className="text-gray-400 hover:text-white hover:bg-white/5"
                >
                  Fechar
                </Button>
                {isReceivedTab && (
                  <Button
                    onClick={handleUpdateSubmit}
                    disabled={isUpdating}
                    className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
                  >
                    {isUpdating ? "Salvando..." : "Salvar Alteracoes"}
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
