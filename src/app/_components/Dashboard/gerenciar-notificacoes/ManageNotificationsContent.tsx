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
  USER: "Usuários",
  ROLE: "Cargo",
  AREA: "Área",
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
        toast.success("Notificação deletada com sucesso");
        queryClient.invalidateQueries({ queryKey: ["managed-notifications"] });
      } else {
        toast.error(result.error || "Erro ao deletar notificação");
      }
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao deletar notificação");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Gerenciar Notificações
          </h1>
          <p className="text-gray-400">
            Envie notificações personalizadas e alertas para membros
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Notificação
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Enviadas",
            value: stats.total,
            icon: Send,
            iconColor: "text-[#0126fb]",
          },
          {
            label: "Eventos/Alertas",
            value: stats.events,
            icon: AlertTriangle,
            iconColor: "text-[#f5b719]",
          },
          {
            label: "Agendadas",
            value: stats.scheduled,
            icon: CalendarClock,
            iconColor: "text-orange-400",
          },
          {
            label: "Taxa de Leitura",
            value: `${stats.avgReadRate}%`,
            icon: Eye,
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
        <Select value={scopeFilter} onValueChange={setScopeFilter}>
          <SelectTrigger className="w-[180px] bg-[#00205e] border-white/20 text-white">
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
              Usuários
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
              Área
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
          <SelectTrigger className="w-[180px] bg-[#00205e] border-white/20 text-white">
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
      </div>

      {/* Table */}
      <div className="border border-[#0126fb]/30 rounded-lg overflow-hidden bg-[#010d26]">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#010d26] border-b border-[#0126fb]/30 hover:bg-[#010d26]">
              <TableHead className="text-gray-300">Título</TableHead>
              <TableHead className="text-gray-300">Escopo</TableHead>
              <TableHead className="text-gray-300">Prioridade</TableHead>
              <TableHead className="text-gray-300">Destinatários</TableHead>
              <TableHead className="text-gray-300">Leitura</TableHead>
              <TableHead className="text-gray-300">Criada em</TableHead>
              <TableHead className="text-gray-300">Agendada para</TableHead>
              <TableHead className="text-gray-300">Status</TableHead>
              <TableHead className="text-gray-300 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredNotifications.length === 0 ? (
              <TableRow className="hover:bg-[#010d26]">
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-gray-400"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Send className="h-8 w-8 text-gray-600" />
                    <p>Nenhuma notificação encontrada</p>
                    <p className="text-xs">
                      Clique em &quot;Nova Notificação&quot; para criar a
                      primeira
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredNotifications.map((n) => {
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
                    className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/30"
                  >
                    <TableCell className="font-medium text-white max-w-[200px] truncate">
                      {n.title || n.notification.substring(0, 40)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className="border-white/20 text-gray-300"
                      >
                        {SCOPE_LABELS[n.scope || "ALL"]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn("border", priorityInfo.className)}>
                        {priorityInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1 text-gray-300">
                        <Users className="h-3 w-3" />
                        {total}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
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
                            "text-xs",
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
                    <TableCell className="text-sm text-gray-400">
                      {format(new Date(n.createdAt), "dd/MM/yy HH:mm", {
                        locale: ptBR,
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {n.scheduledFor ? (
                        <span className="flex items-center gap-1 text-orange-400">
                          <CalendarClock className="h-3 w-3" />
                          {format(new Date(n.scheduledFor), "dd/MM/yy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      ) : (
                        <span className="text-gray-500">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {n.isSent ? (
                        <Badge className="bg-green-500/20 text-green-400 border border-green-500/30">
                          Enviada
                        </Badge>
                      ) : (
                        <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/30">
                          Agendada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-white/10 text-gray-400 hover:text-white"
                          onClick={() => handleViewDetail(n.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="hover:bg-red-500/10 text-gray-400 hover:text-red-400"
                          onClick={() => setDeleteId(n.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

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

      {/* Detail Dialog */}
      {detailModal && (
        <Dialog
          open={!!detailModal}
          onOpenChange={() => setDetailModal(null)}
        >
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
                  {detailModal.title || "Detalhes da Notificação"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-3">
                <p className="text-sm text-gray-300">
                  {detailModal.notification}
                </p>

                {/* Metadados */}
                <div className="grid grid-cols-2 gap-3 bg-[#00205e]/50 rounded-lg p-3">
                  <div>
                    <p className="text-xs text-gray-500">Criada em</p>
                    <p className="text-sm text-gray-300">
                      {format(new Date(detailModal.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Escopo</p>
                    <Badge variant="outline" className="border-white/20 text-gray-300 mt-0.5">
                      {SCOPE_LABELS[detailModal.scope || "ALL"]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Prioridade</p>
                    <Badge className={cn("border mt-0.5", PRIORITY_CONFIG[detailModal.priority || "NORMAL"].className)}>
                      {PRIORITY_CONFIG[detailModal.priority || "NORMAL"].label}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Agendada para</p>
                    {detailModal.scheduledFor ? (
                      <p className="text-sm text-orange-400 flex items-center gap-1 mt-0.5">
                        <CalendarClock className="h-3 w-3" />
                        {format(new Date(detailModal.scheduledFor), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-0.5">Envio imediato</p>
                    )}
                  </div>
                  {detailModal.createdBy && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Criada por</p>
                      <div className="flex items-center gap-2 mt-1">
                        <img src={detailModal.createdBy.imageUrl} alt="" className="w-5 h-5 rounded-full" />
                        <span className="text-sm text-gray-300">{detailModal.createdBy.name}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-[#0126fb]/30 pt-3">
                  <p className="text-xs font-semibold text-gray-400 mb-3">
                    Destinatários ({detailModal.notificationUsers.length})
                  </p>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {detailModal.notificationUsers.map((nu) => (
                      <div
                        key={nu.id}
                        className="flex items-center justify-between text-sm py-1.5 px-2 rounded-md hover:bg-[#00205e]"
                      >
                        <div className="flex items-center gap-2">
                          <img
                            src={nu.user.imageUrl}
                            alt={nu.user.name}
                            className="w-7 h-7 rounded-full"
                          />
                          <div>
                            <span className="text-white">{nu.user.name}</span>
                            <p className="text-xs text-gray-500">
                              {nu.user.emailEJ}
                            </p>
                          </div>
                        </div>
                        <Badge
                          className={cn(
                            "text-xs border",
                            nu.isRead
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                          )}
                        >
                          {nu.isRead ? "Lida" : "Não lida"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button
                  variant="ghost"
                  onClick={() => setDetailModal(null)}
                  className="text-white hover:bg-white/10"
                >
                  Fechar
                </Button>
              </DialogFooter>
            </DialogContent>
          </DialogPortal>
        </Dialog>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="bg-[#010d26] text-white border-2 border-red-500/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Deletar notificação?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta ação não pode ser desfeita. A notificação será removida para
              todos os destinatários.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
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
