"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Eye,
  Users,
  Send,
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Bell,
  BellOff,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  ManagedNotification,
  ManagedNotificationDetail,
} from "@/lib/schemas/notificationSchema";
import {
  getManagedNotifications,
  getManagedNotificationById,
  deleteManagedNotification,
} from "@/lib/actions/notifications";
import { Role } from "@prisma/client";
import CreateNotificationModal from "./CreateNotificationModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

type SimpleUser = {
  id: string;
  name: string;
  imageUrl: string;
  emailEJ: string;
};

interface ManageNotificationsContentProps {
  initialNotifications: ManagedNotification[];
  roles: Role[];
  users: SimpleUser[];
}

const SCOPE_LABELS: Record<string, string> = {
  USER: "Usuarios",
  ROLE: "Cargo",
  AREA: "Area",
  ALL: "Todos",
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; className: string }
> = {
  NORMAL: {
    label: "Normal",
    className: "bg-gray-500/20 text-gray-300 border-gray-500/30",
  },
  IMPORTANT: {
    label: "Importante",
    className: "bg-[#0126fb]/20 text-[#5b8aff] border-[#0126fb]/30",
  },
  EVENT: {
    label: "Evento",
    className: "bg-[#f5b719]/20 text-[#f5b719] border-[#f5b719]/30",
  },
};

export default function ManageNotificationsContent({
  initialNotifications,
  roles,
  users,
}: ManageNotificationsContentProps) {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModal, setDetailModal] =
    useState<ManagedNotificationDetail | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scopeFilter, setScopeFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");

  const { data: notifications = initialNotifications } = useQuery({
    queryKey: ["managed-notifications"],
    queryFn: () => getManagedNotifications(),
    initialData: initialNotifications,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteManagedNotification(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Notificacao deletada com sucesso");
        queryClient.invalidateQueries({ queryKey: ["managed-notifications"] });
      } else {
        toast.error(result.error || "Erro ao deletar notificacao");
      }
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao deletar notificacao");
      setDeleteId(null);
    },
  });

  const handleViewDetail = async (id: string) => {
    const detail = await getManagedNotificationById(id);
    if (detail) setDetailModal(detail);
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (scopeFilter !== "all" && n.scope !== scopeFilter) return false;
      if (priorityFilter !== "all" && n.priority !== priorityFilter)
        return false;
      return true;
    });
  }, [notifications, scopeFilter, priorityFilter]);

  const stats = useMemo(
    () => ({
      total: notifications.length,
      events: notifications.filter((n) => n.priority === "EVENT").length,
      scheduled: notifications.filter((n) => !n.isSent).length,
      avgReadRate:
        notifications.length > 0
          ? Math.round(
              notifications.reduce((acc, n) => {
                const total = n._count.notificationUsers;
                return acc + (total > 0 ? (n.readCount / total) * 100 : 0);
              }, 0) / notifications.length
            )
          : 0,
    }),
    [notifications]
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gerenciar Notificacoes
          </h1>
          <p className="text-gray-400 mt-1 text-base">
            Envie notificacoes personalizadas e alertas para membros
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white h-11 px-6 text-sm font-semibold shadow-lg shadow-[#0126fb]/20 transition-all hover:shadow-[#0126fb]/30"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Notificacao
        </Button>
      </div>

      {/* Stats Cards - Enhanced with gradients and better hierarchy */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Enviadas",
            value: stats.total,
            icon: Send,
            iconColor: "text-[#0126fb]",
            iconBg: "bg-[#0126fb]/10",
            borderColor: "border-[#0126fb]/30",
            gradient: "from-[#0126fb]/5 to-transparent",
          },
          {
            label: "Eventos/Alertas",
            value: stats.events,
            icon: AlertTriangle,
            iconColor: "text-[#f5b719]",
            iconBg: "bg-[#f5b719]/10",
            borderColor: "border-[#f5b719]/30",
            gradient: "from-[#f5b719]/5 to-transparent",
          },
          {
            label: "Agendadas",
            value: stats.scheduled,
            icon: CalendarClock,
            iconColor: "text-orange-400",
            iconBg: "bg-orange-400/10",
            borderColor: "border-orange-400/30",
            gradient: "from-orange-400/5 to-transparent",
          },
          {
            label: "Taxa de Leitura",
            value: `${stats.avgReadRate}%`,
            icon: Eye,
            iconColor: "text-green-400",
            iconBg: "bg-green-400/10",
            borderColor: "border-green-400/30",
            gradient: "from-green-400/5 to-transparent",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "relative overflow-hidden bg-[#010d26] border rounded-xl p-5 transition-all hover:scale-[1.02]",
              stat.borderColor
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br", stat.gradient)} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {stat.label}
                </p>
                <div className={cn("p-2 rounded-lg", stat.iconBg)}>
                  <stat.icon className={cn("h-4 w-4", stat.iconColor)} />
                </div>
              </div>
              <p className="text-3xl font-bold text-white tracking-tight">
                {stat.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters - Pill/chip style */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-400">Filtrar por:</span>
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[180px] bg-[#00205e]/60 border border-white/10 text-white rounded-full h-9 text-sm hover:border-[#0126fb]/50 transition-colors">
            <SelectValue placeholder="Escopo" />
          </SelectTrigger>
          <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
            <SelectItem
              value="all"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Todos os escopos
            </SelectItem>
            <SelectItem
              value="USER"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Usuarios
            </SelectItem>
            <SelectItem
              value="ROLE"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Cargo
            </SelectItem>
            <SelectItem
              value="AREA"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Area
            </SelectItem>
            <SelectItem
              value="ALL"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Todos os membros
            </SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-[180px] bg-[#00205e]/60 border border-white/10 text-white rounded-full h-9 text-sm hover:border-[#0126fb]/50 transition-colors">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
            <SelectItem
              value="all"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Todas prioridades
            </SelectItem>
            <SelectItem
              value="NORMAL"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Normal
            </SelectItem>
            <SelectItem
              value="IMPORTANT"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Importante
            </SelectItem>
            <SelectItem
              value="EVENT"
              className="hover:!bg-[#0126fb] focus:!bg-[#0126fb]"
            >
              Evento
            </SelectItem>
          </SelectContent>
        </Select>
        {(scopeFilter !== "all" || priorityFilter !== "all") && (
          <button
            onClick={() => {
              setScopeFilter("all");
              setPriorityFilter("all");
            }}
            className="text-xs text-gray-400 hover:text-white transition-colors underline underline-offset-2"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Desktop Table + Mobile Cards */}
      {filteredNotifications.length === 0 ? (
        <div className="border border-[#0126fb]/20 rounded-xl bg-[#010d26] p-16 flex flex-col items-center justify-center gap-4">
          <div className="p-4 rounded-full bg-[#0126fb]/5 border border-[#0126fb]/20">
            <BellOff className="h-10 w-10 text-gray-500" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-lg font-medium text-gray-300">
              Nenhuma notificacao encontrada
            </p>
            <p className="text-sm text-gray-500">
              Clique em &quot;Nova Notificacao&quot; para criar a primeira
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            variant="ghost"
            className="mt-2 text-[#0126fb] hover:bg-[#0126fb]/10 hover:text-[#0126fb]"
          >
            <Plus className="mr-2 h-4 w-4" />
            Criar Notificacao
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {filteredNotifications.map((n) => {
              const total = n._count.notificationUsers;
              const readPercent =
                total > 0 ? Math.round((n.readCount / total) * 100) : 0;
              const priorityInfo = PRIORITY_CONFIG[n.priority || "NORMAL"];

              return (
                <div
                  key={n.id}
                  className="bg-[#010d26] border border-[#0126fb]/20 rounded-xl p-4 space-y-3 hover:border-[#0126fb]/40 transition-colors"
                >
                  {/* Card Header: Title + Status */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-semibold text-white truncate">
                        {n.title || n.notification.substring(0, 40)}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {format(new Date(n.createdAt), "dd/MM/yy 'as' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    </div>
                    {n.isSent ? (
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enviada
                      </Badge>
                    ) : (
                      <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30 shrink-0">
                        <Clock className="h-3 w-3 mr-1" />
                        Agendada
                      </Badge>
                    )}
                  </div>

                  {/* Scheduled time - prominent */}
                  {n.scheduledFor && !n.isSent && (
                    <div className="flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-lg px-3 py-2">
                      <CalendarClock className="h-4 w-4 text-orange-400 shrink-0" />
                      <span className="text-sm font-medium text-orange-400">
                        Agendada para{" "}
                        {format(new Date(n.scheduledFor), "dd/MM/yy 'as' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Tags Row */}
                  <div className="flex flex-wrap gap-2">
                    <Badge className={cn("border text-xs", priorityInfo.className)}>
                      {priorityInfo.label}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="border-white/20 text-gray-300 text-xs"
                    >
                      {SCOPE_LABELS[n.scope || "ALL"]}
                    </Badge>
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Users className="h-3 w-3" />
                      {total} destinatarios
                    </span>
                  </div>

                  {/* Read Rate Bar */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          readPercent >= 80
                            ? "bg-green-500"
                            : readPercent >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        )}
                        style={{ width: `${readPercent}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-sm font-semibold min-w-[40px] text-right",
                        readPercent >= 80
                          ? "text-green-400"
                          : readPercent >= 50
                            ? "text-yellow-400"
                            : "text-red-400"
                      )}
                    >
                      {readPercent}%
                    </span>
                  </div>

                  {/* Card Actions */}
                  <div className="flex justify-end gap-2 pt-1 border-t border-white/5">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-white/10 text-gray-400 hover:text-white gap-1.5 h-8"
                      onClick={() => handleViewDetail(n.id)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Detalhes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-red-500/10 text-gray-400 hover:text-red-400 gap-1.5 h-8"
                      onClick={() => setDeleteId(n.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Deletar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block border border-[#0126fb]/20 rounded-xl overflow-hidden bg-[#010d26]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-[#00205e]/30 border-b border-[#0126fb]/20 hover:bg-[#00205e]/30">
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Titulo
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Escopo
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Prioridade
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Destinatarios
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Leitura
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Criada em
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Agendada para
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">
                      Status
                    </TableHead>
                    <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4 text-right">
                      Acoes
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((n) => {
                    const total = n._count.notificationUsers;
                    const readPercent =
                      total > 0
                        ? Math.round((n.readCount / total) * 100)
                        : 0;
                    const priorityInfo =
                      PRIORITY_CONFIG[n.priority || "NORMAL"];

                    return (
                      <TableRow
                        key={n.id}
                        className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/20 transition-colors"
                      >
                        <TableCell className="font-medium text-white max-w-[200px] truncate py-4">
                          {n.title || n.notification.substring(0, 40)}
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge
                            variant="outline"
                            className="border-white/20 text-gray-300"
                          >
                            {SCOPE_LABELS[n.scope || "ALL"]}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge className={cn("border", priorityInfo.className)}>
                            {priorityInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="flex items-center gap-1.5 text-gray-300">
                            <Users className="h-3.5 w-3.5 text-gray-500" />
                            <span className="font-medium">{total}</span>
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-16 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  readPercent >= 80
                                    ? "bg-green-500"
                                    : readPercent >= 50
                                      ? "bg-yellow-500"
                                      : "bg-red-500"
                                )}
                                style={{ width: `${readPercent}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "text-sm font-semibold",
                                readPercent >= 80
                                  ? "text-green-400"
                                  : readPercent >= 50
                                    ? "text-yellow-400"
                                    : "text-red-400"
                              )}
                            >
                              {readPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-400 py-4">
                          {format(new Date(n.createdAt), "dd/MM/yy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell className="text-sm py-4">
                          {n.scheduledFor ? (
                            <div className="flex items-center gap-1.5 text-orange-400 bg-orange-500/10 rounded-md px-2 py-1 w-fit">
                              <CalendarClock className="h-3.5 w-3.5" />
                              <span className="font-medium">
                                {format(new Date(n.scheduledFor), "dd/MM/yy HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-600">--</span>
                          )}
                        </TableCell>
                        <TableCell className="py-4">
                          {n.isSent ? (
                            <Badge className="bg-green-500/15 text-green-400 border border-green-500/25 gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Enviada
                            </Badge>
                          ) : (
                            <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/25 gap-1">
                              <Clock className="h-3 w-3" />
                              Agendada
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-white/10 text-gray-400 hover:text-white h-8 w-8 rounded-lg"
                              onClick={() => handleViewDetail(n.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-red-500/10 text-gray-400 hover:text-red-400 h-8 w-8 rounded-lg"
                              onClick={() => setDeleteId(n.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}

      {/* Create Modal */}
      <CreateNotificationModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        roles={roles}
        users={users}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["managed-notifications"],
          });
        }}
      />

      {/* Detail Dialog - Enhanced */}
      {detailModal && (
        <Dialog
          open={!!detailModal}
          onOpenChange={() => setDetailModal(null)}
        >
          <DialogPortal>
            <DialogOverlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
            <DialogContent
              className={cn(
                "w-full max-w-lg",
                "bg-[#010d26] text-white border border-[#0126fb]/40 p-0 rounded-xl",
                "max-h-[85vh] overflow-hidden flex flex-col"
              )}
            >
              {/* Modal Header */}
              <div className="px-6 pt-6 pb-4 border-b border-[#0126fb]/20">
                <DialogHeader>
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-[#0126fb]/10 shrink-0 mt-0.5">
                      <Bell className="h-5 w-5 text-[#0126fb]" />
                    </div>
                    <div>
                      <DialogTitle className="text-xl font-bold text-white">
                        {detailModal.title || "Detalhes da Notificacao"}
                      </DialogTitle>
                      {detailModal.createdBy && (
                        <div className="flex items-center gap-2 mt-2">
                          <img
                            src={detailModal.createdBy.imageUrl}
                            alt=""
                            className="w-5 h-5 rounded-full ring-1 ring-white/20"
                          />
                          <span className="text-sm text-gray-400">
                            por {detailModal.createdBy.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </DialogHeader>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
                {/* Notification Message */}
                <div className="bg-[#00205e]/30 rounded-lg p-4 border border-[#0126fb]/10">
                  <p className="text-sm text-gray-200 leading-relaxed">
                    {detailModal.notification}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Criada em
                    </p>
                    <p className="text-sm text-gray-200 font-medium">
                      {format(new Date(detailModal.createdAt), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Escopo
                    </p>
                    <Badge variant="outline" className="border-white/20 text-gray-300 mt-0.5">
                      {SCOPE_LABELS[detailModal.scope || "ALL"]}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Prioridade
                    </p>
                    <Badge className={cn("border mt-0.5", PRIORITY_CONFIG[detailModal.priority || "NORMAL"].className)}>
                      {PRIORITY_CONFIG[detailModal.priority || "NORMAL"].label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Agendamento
                    </p>
                    {detailModal.scheduledFor ? (
                      <div className="flex items-center gap-1.5 text-orange-400 mt-0.5">
                        <CalendarClock className="h-3.5 w-3.5" />
                        <span className="text-sm font-medium">
                          {format(new Date(detailModal.scheduledFor), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-0.5">Envio imediato</p>
                    )}
                  </div>
                </div>

                {/* Recipients Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Destinatarios ({detailModal.notificationUsers.length})
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="h-3 w-3" />
                        {detailModal.notificationUsers.filter((nu) => nu.isRead).length} lidas
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1 max-h-[280px] overflow-y-auto rounded-lg border border-[#0126fb]/10">
                    {detailModal.notificationUsers.map((nu) => (
                      <div
                        key={nu.id}
                        className="flex items-center justify-between text-sm py-2.5 px-3 hover:bg-[#00205e]/30 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <img
                              src={nu.user.imageUrl}
                              alt={nu.user.name}
                              className="w-8 h-8 rounded-full ring-1 ring-white/10"
                            />
                            {nu.isRead && (
                              <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-0.5">
                                <CheckCircle2 className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div>
                            <span className="text-white font-medium text-sm">{nu.user.name}</span>
                            <p className="text-xs text-gray-500">
                              {nu.user.emailEJ}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs border",
                            nu.isRead
                              ? "bg-green-500/15 text-green-400 border-green-500/25"
                              : "bg-gray-500/15 text-gray-400 border-gray-500/25"
                          )}
                        >
                          {nu.isRead ? "Lida" : "Nao lida"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-[#0126fb]/20">
                <DialogFooter>
                  <Button
                    variant="ghost"
                    onClick={() => setDetailModal(null)}
                    className="text-white hover:bg-white/10 w-full sm:w-auto"
                  >
                    Fechar
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#010d26] text-white border border-red-500/40 rounded-xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-white text-lg">
                  Deletar notificacao?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 mt-1">
                  Esta acao nao pode ser desfeita. A notificacao sera removida para
                  todos os destinatarios.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white rounded-lg">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
