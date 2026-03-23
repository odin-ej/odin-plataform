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
import { Loader2, X, Check, ChevronsUpDown } from "lucide-react";
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
        toast.success("Notificação criada com sucesso!");
        form.reset();
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Erro ao criar notificação");
      }
    },
    onError: () => {
      toast.error("Erro ao criar notificação");
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
    toast.error("Preencha todos os campos obrigatórios");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" />
        <DialogContent
          className={cn(
            "w-full max-w-sm sm:max-w-md md:max-w-2xl",
            "bg-[#010d26] text-white border-2 border-[#0126fb]/80 p-6 rounded-md",
            "max-h-[80vh] overflow-y-auto",
            "scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
          )}
        >
          <DialogHeader className="flex-row items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Nova Notificação
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </DialogHeader>

          <form
            onSubmit={form.handleSubmit(onSubmit, onError)}
            className="space-y-5 mt-4"
          >
            {/* Título */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white">Título *</label>
              <Input
                placeholder="Título da notificação"
                className="bg-[#00205e] border-2 border-white/20 text-white placeholder:text-gray-400 focus:border-[#0126fb]"
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-red-400">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Mensagem */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white">
                Mensagem *
              </label>
              <Textarea
                placeholder="Conteúdo da notificação..."
                rows={3}
                className="bg-[#00205e] border-2 border-white/20 text-white placeholder:text-gray-400 focus:border-[#0126fb] min-h-[100px]"
                {...form.register("description")}
              />
              {form.formState.errors.description && (
                <p className="text-sm text-red-400">
                  {form.formState.errors.description.message}
                </p>
              )}
            </div>

            {/* Escopo + Prioridade em grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Escopo */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Enviar para *
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
                  <SelectTrigger className="bg-[#00205e] border-2 border-white/20 text-white">
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
                      Usuários específicos
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
                      Por área
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prioridade */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
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
                  <SelectTrigger className="bg-[#00205e] border-2 border-white/20 text-white">
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
                  <p className="text-xs text-[#f5b719]">
                    Eventos aparecem como banner no dashboard dos membros
                  </p>
                )}
              </div>
            </div>

            {/* Seleção condicional de destinatários */}
            {scope === "USER" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Selecionar Usuários *
                </label>
                <Popover open={userSelectOpen} onOpenChange={setUserSelectOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between bg-[#00205e] border-2 border-white/20 text-white hover:bg-[#00205e]/80 hover:text-white"
                    >
                      {selectedUserIds.length > 0
                        ? `${selectedUserIds.length} selecionado(s)`
                        : "Selecionar usuários"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 bg-[#00205e] border-[#0126fb]"
                    align="start"
                  >
                    <Command className="bg-[#00205e]">
                      <CommandInput
                        placeholder="Buscar usuário..."
                        className="text-white"
                      />
                      <CommandList className="max-h-[200px]">
                        <CommandEmpty className="text-gray-400 py-3 text-center text-sm">
                          Nenhum usuário encontrado
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
                                className="w-5 h-5 rounded-full mr-2"
                              />
                              {user.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {selectedUserIds.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedUserIds.map((id: string) => {
                      const user = users.find((u) => u.id === id);
                      return user ? (
                        <Badge
                          key={id}
                          className="bg-[#0126fb]/20 text-[#f5b719] border border-[#0126fb]/40 gap-1"
                        >
                          {user.name}
                          <X
                            className="h-3 w-3 cursor-pointer hover:text-red-400"
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Cargo *
                </label>
                <Select
                  value={form.watch("targetRoleId") || ""}
                  onValueChange={(v) => form.setValue("targetRoleId", v)}
                >
                  <SelectTrigger className="bg-[#00205e] border-2 border-white/20 text-white">
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
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Área *
                </label>
                <Select
                  value={form.watch("targetArea") || ""}
                  onValueChange={(v) =>
                    form.setValue("targetArea", v as AreaRoles)
                  }
                >
                  <SelectTrigger className="bg-[#00205e] border-2 border-white/20 text-white">
                    <SelectValue placeholder="Selecionar área" />
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

            {/* Link + Agendamento em grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Link (opcional)
                </label>
                <Input
                  placeholder="Ex: /comunidade"
                  className="bg-[#00205e] border-2 border-white/20 text-white placeholder:text-gray-400 focus:border-[#0126fb]"
                  {...form.register("link")}
                />
                <p className="text-xs text-gray-400">
                  Para onde o usuário será direcionado ao clicar
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-white">
                  Agendar envio (opcional)
                </label>
                <Input
                  type="datetime-local"
                  className="bg-[#00205e] border-2 border-white/20 text-white focus:border-[#0126fb] [color-scheme:dark]"
                  {...form.register("scheduledFor")}
                />
                <p className="text-xs text-gray-400">
                  Deixe em branco para enviar agora
                </p>
              </div>
            </div>

            {/* Erro de validação cross-field (refine) */}
            {form.formState.errors.root && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">
                {form.formState.errors.root.message}
              </p>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-white hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
              >
                {mutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {form.watch("scheduledFor")
                  ? "Agendar Notificação"
                  : "Enviar Notificação"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
