"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  baseNotificationSchema,
  NotificationFormValues,
  CreateManagedNotificationValues,
} from "@/lib/schemas/notificationSchema";
import { createManagedNotification } from "@/lib/actions/notifications";
import { Role, AreaRoles } from "@prisma/client";
import { ROLE_AREA_LABELS } from "@/lib/constants";
import {
  Loader2,
  X,
  Check,
  ChevronsUpDown,
  Send,
  CalendarClock,
  Users,
  Link2,
  Bell,
  AlertTriangle,
  Megaphone,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState } from "react";

type SimpleUser = {
  id: string;
  name: string;
  imageUrl: string;
  emailEJ: string;
};

interface CreateNotificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Role[];
  users: SimpleUser[];
  onSuccess: () => void;
}

export default function CreateNotificationModal({
  open,
  onOpenChange,
  roles,
  users,
  onSuccess,
}: CreateNotificationModalProps) {
  const [userSelectOpen, setUserSelectOpen] = useState(false);

  const form = useForm<NotificationFormValues>({
    resolver: zodResolver(baseNotificationSchema),
    defaultValues: {
      title: "",
      description: "",
      scope: "ALL",
      priority: "NORMAL",
      targetUserIds: [],
      targetRoleId: undefined,
      targetArea: undefined,
      scheduledFor: "",
      link: "",
    },
  });

  const scope = form.watch("scope");
  const selectedUserIds = form.watch("targetUserIds") || [];

  const mutation = useMutation({
    mutationFn: (data: NotificationFormValues) =>
      createManagedNotification(data as CreateManagedNotificationValues),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Notificacao criada com sucesso!");
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Erro ao criar notificacao");
      }
    },
    onError: () => {
      toast.error("Erro ao criar notificacao");
    },
  });

  const toggleUser = (userId: string) => {
    const current = form.getValues("targetUserIds") || [];
    if (current.includes(userId)) {
      form.setValue(
        "targetUserIds",
        current.filter((id: string) => id !== userId)
      );
    } else {
      form.setValue("targetUserIds", [...current, userId]);
    }
  };

  const onSubmit = (data: NotificationFormValues) => {
    mutation.mutate(data);
  };

  const onError = () => {
    toast.error("Preencha todos os campos obrigatorios");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            "w-full max-w-sm sm:max-w-md md:max-w-2xl",
            "bg-[#010d26] text-white border border-[#0126fb]/40 p-0 rounded-xl",
            "max-h-[85vh] overflow-hidden flex flex-col",
            "transition-all duration-200"
          )}
        >
          {/* Modal Header */}
          <div className="px-6 pt-6 pb-4 border-b border-[#0126fb]/20">
            <DialogHeader className="flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#0126fb]/10">
                  <Bell className="h-5 w-5 text-[#0126fb]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    Nova Notificacao
                  </DialogTitle>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Preencha os campos para enviar uma notificacao
                  </p>
                </div>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </DialogHeader>
          </div>

          {/* Modal Body - Scrollable */}
          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="flex flex-col flex-1 overflow-hidden"
          >
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {/* Title Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Titulo
                  <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="Ex: Reuniao geral amanha"
                  className="bg-[#00205e]/60 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#0126fb] h-11 rounded-lg transition-colors"
                  {...form.register("title")}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              {/* Message Field */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Mensagem
                  <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-500 -mt-1">
                  Conteudo que sera exibido na notificacao
                </p>
                <Textarea
                  placeholder="Escreva o conteudo da notificacao..."
                  rows={3}
                  className="bg-[#00205e]/60 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#0126fb] min-h-[100px] rounded-lg transition-colors resize-none"
                  {...form.register("description")}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              {/* Scope + Priority Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Scope */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    Enviar para
                    <span className="text-red-400">*</span>
                  </label>
                  <Select
                    value={scope}
                    onValueChange={(v) =>
                      form.setValue(
                        "scope",
                        v as NotificationFormValues["scope"]
                      )
                    }
                  >
                    <SelectTrigger className="bg-[#00205e]/60 border border-white/10 text-white h-11 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                      <SelectItem
                        value="ALL"
                        className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                      >
                        Todos os membros
                      </SelectItem>
                      <SelectItem
                        value="USER"
                        className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                      >
                        Usuarios especificos
                      </SelectItem>
                      <SelectItem
                        value="ROLE"
                        className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                      >
                        Por cargo
                      </SelectItem>
                      <SelectItem
                        value="AREA"
                        className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                      >
                        Por area
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-gray-400" />
                    Prioridade
                  </label>
                  <Select
                    value={form.watch("priority")}
                    onValueChange={(v) =>
                      form.setValue(
                        "priority",
                        v as NotificationFormValues["priority"]
                      )
                    }
                  >
                    <SelectTrigger className="bg-[#00205e]/60 border border-white/10 text-white h-11 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                      <SelectItem
                        value="NORMAL"
                        className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                      >
                        Normal
                      </SelectItem>
                      <SelectItem
                        value="IMPORTANT"
                        className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                      >
                        Importante
                      </SelectItem>
                      <SelectItem
                        value="EVENT"
                        className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                      >
                        Evento / Alerta Geral
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {form.watch("priority") === "EVENT" && (
                    <div className="flex items-center gap-2 bg-[#f5b719]/10 border border-[#f5b719]/20 rounded-lg px-3 py-2">
                      <Megaphone className="h-3.5 w-3.5 text-[#f5b719] shrink-0" />
                      <p className="text-xs text-[#f5b719]">
                        Eventos aparecem como banner no dashboard dos membros
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Conditional User Selection */}
              {scope === "USER" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    Selecionar Usuarios
                    <span className="text-red-400">*</span>
                  </label>
                  <Popover open={userSelectOpen} onOpenChange={setUserSelectOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between bg-[#00205e]/60 border border-white/10 text-white hover:bg-[#00205e]/80 hover:text-white h-11 rounded-lg"
                      >
                        {selectedUserIds.length > 0
                          ? `${selectedUserIds.length} selecionado(s)`
                          : "Selecionar usuarios"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[--radix-popover-trigger-width] p-0 bg-[#00205e] border-[#0126fb]"
                      align="start"
                    >
                      <Command className="bg-[#00205e]">
                        <CommandInput
                          placeholder="Buscar usuario..."
                          className="text-white"
                        />
                        <CommandList className="max-h-[200px]">
                          <CommandEmpty className="text-gray-400 py-3 text-center text-sm">
                            Nenhum usuario encontrado
                          </CommandEmpty>
                          <CommandGroup>
                            {users.map((user) => (
                              <CommandItem
                                key={user.id}
                                onSelect={() => toggleUser(user.id)}
                                className="text-white hover:!bg-[#0126fb] aria-selected:!bg-[#0126fb]"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedUserIds.includes(user.id)
                                      ? "opacity-100 text-[#f5b719]"
                                      : "opacity-0"
                                  )}
                                />
                                <img
                                  src={user.imageUrl}
                                  alt=""
                                  className="w-6 h-6 rounded-full mr-2 ring-1 ring-white/10"
                                />
                                <div className="flex flex-col">
                                  <span className="text-sm">{user.name}</span>
                                  <span className="text-xs text-gray-400">{user.emailEJ}</span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {selectedUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2 p-3 bg-[#00205e]/20 rounded-lg border border-[#0126fb]/10">
                      {selectedUserIds.map((id: string) => {
                        const user = users.find((u) => u.id === id);
                        return user ? (
                          <Badge
                            key={id}
                            className="bg-[#0126fb]/15 text-white border border-[#0126fb]/30 gap-1.5 py-1 px-2.5 transition-all hover:bg-[#0126fb]/25"
                          >
                            <img
                              src={user.imageUrl}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                            {user.name}
                            <X
                              className="h-3 w-3 cursor-pointer text-gray-400 hover:text-red-400 transition-colors"
                              onClick={() => toggleUser(id)}
                            />
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              )}

              {scope === "ROLE" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Cargo
                    <span className="text-red-400">*</span>
                  </label>
                  <Select
                    value={form.watch("targetRoleId") || ""}
                    onValueChange={(v) => form.setValue("targetRoleId", v)}
                  >
                    <SelectTrigger className="bg-[#00205e]/60 border border-white/10 text-white h-11 rounded-lg">
                      <SelectValue placeholder="Selecionar cargo" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                      {roles.map((role) => (
                        <SelectItem
                          key={role.id}
                          value={role.id}
                          className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                        >
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scope === "AREA" && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    Area
                    <span className="text-red-400">*</span>
                  </label>
                  <Select
                    value={form.watch("targetArea") || ""}
                    onValueChange={(v) =>
                      form.setValue("targetArea", v as AreaRoles)
                    }
                  >
                    <SelectTrigger className="bg-[#00205e]/60 border border-white/10 text-white h-11 rounded-lg">
                      <SelectValue placeholder="Selecionar area" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                      {Object.entries(ROLE_AREA_LABELS).map(([key, label]) => (
                        <SelectItem
                          key={key}
                          value={key}
                          className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb]"
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Link + Scheduling Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <Link2 className="h-3.5 w-3.5 text-gray-400" />
                    Link
                    <span className="text-xs font-normal text-gray-500">(opcional)</span>
                  </label>
                  <Input
                    placeholder="Ex: /comunidade"
                    className="bg-[#00205e]/60 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#0126fb] h-11 rounded-lg transition-colors"
                    {...form.register("link")}
                  />
                  <p className="text-xs text-gray-500">
                    Para onde o usuario sera direcionado ao clicar
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
                    Agendar envio
                    <span className="text-xs font-normal text-gray-500">(opcional)</span>
                  </label>
                  <Input
                    type="datetime-local"
                    className="bg-[#00205e]/60 border border-white/10 text-white focus:border-[#0126fb] h-11 rounded-lg [color-scheme:dark] transition-colors"
                    {...form.register("scheduledFor")}
                  />
                  <p className="text-xs text-gray-500">
                    Deixe em branco para enviar agora
                  </p>
                </div>
              </div>

              {/* Cross-field validation error */}
              {form.formState.errors.root && (
                <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {form.formState.errors.root.message}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#0126fb]/20 bg-[#010d26]">
              <DialogFooter className="gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="text-white hover:bg-white/10 hover:text-white rounded-lg"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white h-10 px-6 rounded-lg font-semibold shadow-lg shadow-[#0126fb]/20 transition-all hover:shadow-[#0126fb]/30 gap-2"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {form.watch("scheduledFor")
                    ? "Agendar Notificacao"
                    : "Enviar Notificacao"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
