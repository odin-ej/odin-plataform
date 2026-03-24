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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Loader2, X, Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { AreaRoles } from "@prisma/client";
import { ROLE_AREA_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  createPolicySchema,
  PolicyFormValues,
  PolicyWithUsage,
} from "@/lib/schemas/permissionSchema";
import { createPolicy, updatePolicy } from "@/lib/actions/manage-permissions";
import { useState, useEffect } from "react";

interface PolicyFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: Array<{ id: string; name: string; area: AreaRoles[] }>;
  editingPolicy?: PolicyWithUsage | null;
  onSuccess: () => void;
}

interface RuleState {
  allowedAreas: AreaRoles[];
  allowedRoleIds: string[];
}

export default function PolicyFormModal({
  open,
  onOpenChange,
  roles,
  editingPolicy,
  onSuccess,
}: PolicyFormModalProps) {
  const [rules, setRules] = useState<RuleState[]>([]);
  const [areaPopoverOpen, setAreaPopoverOpen] = useState<Record<number, boolean>>({});
  const [rolePopoverOpen, setRolePopoverOpen] = useState<Record<number, boolean>>({});

  const isEditing = !!editingPolicy;

  const form = useForm<PolicyFormValues>({
    resolver: zodResolver(createPolicySchema),
    defaultValues: {
      name: "",
      description: "",
      allowExMembers: false,
      isPublic: false,
      rules: [],
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (editingPolicy) {
      form.reset({
        name: editingPolicy.name,
        description: editingPolicy.description ?? "",
        allowExMembers: editingPolicy.allowExMembers,
        isPublic: editingPolicy.isPublic,
        rules: editingPolicy.rules.map((r) => ({
          allowedAreas: r.allowedAreas,
          allowedRoleIds: r.allowedRoleIds,
        })),
      });
      setRules(
        editingPolicy.rules.map((r) => ({
          allowedAreas: r.allowedAreas,
          allowedRoleIds: r.allowedRoleIds,
        }))
      );
    } else {
      form.reset({
        name: "",
        description: "",
        allowExMembers: false,
        isPublic: false,
        rules: [],
      });
      setRules([]);
    }
  }, [editingPolicy, form]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      form.reset();
      setRules([]);
      setAreaPopoverOpen({});
      setRolePopoverOpen({});
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (data: PolicyFormValues) => {
      if (isEditing && editingPolicy) {
        return updatePolicy(editingPolicy.id, data);
      }
      return createPolicy(data);
    },
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          isEditing
            ? "Politica atualizada com sucesso!"
            : "Politica criada com sucesso!"
        );
        form.reset();
        setRules([]);
        onOpenChange(false);
        onSuccess();
      } else {
        toast.error(result.error || "Erro ao salvar politica");
      }
    },
    onError: () => {
      toast.error("Erro ao salvar politica");
    },
  });

  const addRule = () => {
    const newRules = [...rules, { allowedAreas: [], allowedRoleIds: [] }];
    setRules(newRules);
    form.setValue("rules", newRules);
  };

  const removeRule = (index: number) => {
    const newRules = rules.filter((_, i) => i !== index);
    setRules(newRules);
    form.setValue("rules", newRules);
  };

  const toggleArea = (ruleIndex: number, area: AreaRoles) => {
    const newRules = [...rules];
    const current = newRules[ruleIndex].allowedAreas;
    if (current.includes(area)) {
      newRules[ruleIndex] = {
        ...newRules[ruleIndex],
        allowedAreas: current.filter((a) => a !== area),
      };
    } else {
      newRules[ruleIndex] = {
        ...newRules[ruleIndex],
        allowedAreas: [...current, area],
      };
    }
    setRules(newRules);
    form.setValue("rules", newRules);
  };

  const removeArea = (ruleIndex: number, area: AreaRoles) => {
    const newRules = [...rules];
    newRules[ruleIndex] = {
      ...newRules[ruleIndex],
      allowedAreas: newRules[ruleIndex].allowedAreas.filter((a) => a !== area),
    };
    setRules(newRules);
    form.setValue("rules", newRules);
  };

  const toggleRole = (ruleIndex: number, roleId: string) => {
    const newRules = [...rules];
    const current = newRules[ruleIndex].allowedRoleIds;
    if (current.includes(roleId)) {
      newRules[ruleIndex] = {
        ...newRules[ruleIndex],
        allowedRoleIds: current.filter((id) => id !== roleId),
      };
    } else {
      newRules[ruleIndex] = {
        ...newRules[ruleIndex],
        allowedRoleIds: [...current, roleId],
      };
    }
    setRules(newRules);
    form.setValue("rules", newRules);
  };

  const removeRole = (ruleIndex: number, roleId: string) => {
    const newRules = [...rules];
    newRules[ruleIndex] = {
      ...newRules[ruleIndex],
      allowedRoleIds: newRules[ruleIndex].allowedRoleIds.filter(
        (id) => id !== roleId
      ),
    };
    setRules(newRules);
    form.setValue("rules", newRules);
  };

  const onSubmit = (data: PolicyFormValues) => {
    mutation.mutate({ ...data, rules });
  };

  const onError = () => {
    toast.error("Preencha todos os campos obrigatorios");
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
              {isEditing ? "Editar Politica" : "Nova Politica"}
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
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white">Nome *</label>
              <Input
                placeholder="Nome da politica"
                disabled={editingPolicy?.isBuiltIn}
                className="bg-[#00205e] border-2 border-white/20 text-white placeholder:text-gray-400 focus:border-[#0126fb] disabled:opacity-50"
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm text-red-400">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            {/* Descricao */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-white">
                Descricao
              </label>
              <Textarea
                placeholder="Descricao da politica (opcional)"
                rows={3}
                className="bg-[#00205e] border-2 border-white/20 text-white placeholder:text-gray-400 focus:border-[#0126fb] min-h-[80px]"
                {...form.register("description")}
              />
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              {/* Permitir Ex-membros */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">
                  Permitir Ex-membros
                </label>
                <Switch
                  checked={form.watch("allowExMembers")}
                  onCheckedChange={(checked) =>
                    form.setValue("allowExMembers", checked)
                  }
                />
              </div>

              {/* Politica Publica */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-white">
                    Politica Publica
                  </label>
                  <p className="text-xs text-gray-400">
                    Se ativa, qualquer usuario autenticado tera acesso
                  </p>
                </div>
                <Switch
                  checked={form.watch("isPublic")}
                  onCheckedChange={(checked) =>
                    form.setValue("isPublic", checked)
                  }
                />
              </div>
            </div>

            {/* Regras */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white">Regras</label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={addRule}
                  className="text-[#0126fb] hover:bg-[#0126fb]/10 hover:text-[#0126fb] gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Regra
                </Button>
              </div>

              <p className="text-xs text-gray-400">
                O usuario precisa satisfazer pelo menos UMA regra
              </p>

              {rules.map((rule, ruleIndex) => (
                <div
                  key={ruleIndex}
                  className="bg-[#00205e]/50 border border-[#0126fb]/20 rounded-lg p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">
                      Regra {ruleIndex + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeRule(ruleIndex)}
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-400 gap-1 h-7 px-2"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remover
                    </Button>
                  </div>

                  {/* Areas multi-select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300">
                      Areas
                    </label>
                    <Popover
                      open={areaPopoverOpen[ruleIndex] ?? false}
                      onOpenChange={(v) =>
                        setAreaPopoverOpen((prev) => ({
                          ...prev,
                          [ruleIndex]: v,
                        }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between bg-[#00205e] border-2 border-white/20 text-white hover:bg-[#00205e]/80 hover:text-white"
                        >
                          {rule.allowedAreas.length > 0
                            ? `${rule.allowedAreas.length} area(s) selecionada(s)`
                            : "Selecionar areas"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0 bg-[#00205e] border-[#0126fb]"
                        align="start"
                      >
                        <Command className="bg-[#00205e]">
                          <CommandInput
                            placeholder="Buscar area..."
                            className="text-white"
                          />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty className="text-gray-400 py-3 text-center text-sm">
                              Nenhuma area encontrada
                            </CommandEmpty>
                            <CommandGroup>
                              {Object.entries(ROLE_AREA_LABELS).map(
                                ([key, label]) => (
                                  <CommandItem
                                    key={key}
                                    onSelect={() =>
                                      toggleArea(ruleIndex, key as AreaRoles)
                                    }
                                    className="text-white hover:!bg-[#0126fb] aria-selected:!bg-[#0126fb]"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        rule.allowedAreas.includes(
                                          key as AreaRoles
                                        )
                                          ? "opacity-100 text-[#f5b719]"
                                          : "opacity-0"
                                      )}
                                    />
                                    {label}
                                  </CommandItem>
                                )
                              )}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {rule.allowedAreas.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.allowedAreas.map((area) => (
                          <Badge
                            key={area}
                            className="bg-[#0126fb]/20 text-[#f5b719] border border-[#0126fb]/40 gap-1"
                          >
                            {ROLE_AREA_LABELS[area]}
                            <X
                              className="h-3 w-3 cursor-pointer hover:text-red-400"
                              onClick={() => removeArea(ruleIndex, area)}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Roles multi-select */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-300">
                      Cargos especificos
                    </label>
                    <Popover
                      open={rolePopoverOpen[ruleIndex] ?? false}
                      onOpenChange={(v) =>
                        setRolePopoverOpen((prev) => ({
                          ...prev,
                          [ruleIndex]: v,
                        }))
                      }
                    >
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-between bg-[#00205e] border-2 border-white/20 text-white hover:bg-[#00205e]/80 hover:text-white"
                        >
                          {rule.allowedRoleIds.length > 0
                            ? `${rule.allowedRoleIds.length} cargo(s) selecionado(s)`
                            : "Selecionar cargos"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[--radix-popover-trigger-width] p-0 bg-[#00205e] border-[#0126fb]"
                        align="start"
                      >
                        <Command className="bg-[#00205e]">
                          <CommandInput
                            placeholder="Buscar cargo..."
                            className="text-white"
                          />
                          <CommandList className="max-h-[200px]">
                            <CommandEmpty className="text-gray-400 py-3 text-center text-sm">
                              Nenhum cargo encontrado
                            </CommandEmpty>
                            <CommandGroup>
                              {roles.map((role) => (
                                <CommandItem
                                  key={role.id}
                                  onSelect={() =>
                                    toggleRole(ruleIndex, role.id)
                                  }
                                  className="text-white hover:!bg-[#0126fb] aria-selected:!bg-[#0126fb]"
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      rule.allowedRoleIds.includes(role.id)
                                        ? "opacity-100 text-[#f5b719]"
                                        : "opacity-0"
                                    )}
                                  />
                                  {role.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {rule.allowedRoleIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rule.allowedRoleIds.map((roleId) => {
                          const role = roles.find((r) => r.id === roleId);
                          return role ? (
                            <Badge
                              key={roleId}
                              className="bg-[#0126fb]/20 text-[#f5b719] border border-[#0126fb]/40 gap-1"
                            >
                              {role.name}
                              <X
                                className="h-3 w-3 cursor-pointer hover:text-red-400"
                                onClick={() => removeRole(ruleIndex, roleId)}
                              />
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Validation errors */}
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
                {isEditing ? "Salvar Alteracoes" : "Criar Politica"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
