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
import {
  Loader2,
  X,
  Check,
  ChevronsUpDown,
  Plus,
  Trash2,
  Shield,
  UserX,
  Globe,
  ListChecks,
  AlertTriangle,
  Save,
} from "lucide-react";
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
                  <Shield className="h-5 w-5 text-[#0126fb]" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold">
                    {isEditing ? "Editar Politica" : "Nova Politica"}
                  </DialogTitle>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isEditing
                      ? "Atualize as configuracoes da politica"
                      : "Configure regras de acesso e permissoes"}
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
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Nome
                  <span className="text-red-400">*</span>
                </label>
                <Input
                  placeholder="Ex: Admin completo"
                  disabled={editingPolicy?.isBuiltIn}
                  className="bg-[#00205e]/60 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#0126fb] h-11 rounded-lg transition-colors disabled:opacity-50"
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-400">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">
                  Descricao
                </label>
                <p className="text-xs text-gray-500 -mt-1">
                  Descreva o proposito desta politica
                </p>
                <Textarea
                  placeholder="Ex: Acesso completo para administradores..."
                  rows={3}
                  className="bg-[#00205e]/60 border border-white/10 text-white placeholder:text-gray-500 focus:border-[#0126fb] min-h-[80px] rounded-lg transition-colors resize-none"
                  {...form.register("description")}
                />
              </div>

              {/* Toggle Cards */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-white">Configuracoes</label>

                {/* Allow Ex-members */}
                <div className="flex items-center justify-between bg-[#00205e]/20 border border-[#0126fb]/10 rounded-lg p-4 hover:border-[#0126fb]/25 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-orange-400/10">
                      <UserX className="h-4 w-4 text-orange-400" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white cursor-pointer">
                        Permitir Ex-membros
                      </label>
                      <p className="text-xs text-gray-500">
                        Ex-membros terao acesso com esta politica
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.watch("allowExMembers")}
                    onCheckedChange={(checked) =>
                      form.setValue("allowExMembers", checked)
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>

                {/* Public Policy */}
                <div className="flex items-center justify-between bg-[#00205e]/20 border border-[#0126fb]/10 rounded-lg p-4 hover:border-[#0126fb]/25 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-[#0126fb]/10">
                      <Globe className="h-4 w-4 text-[#0126fb]" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white cursor-pointer">
                        Politica Publica
                      </label>
                      <p className="text-xs text-gray-500">
                        Qualquer usuario autenticado tera acesso
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={form.watch("isPublic")}
                    onCheckedChange={(checked) =>
                      form.setValue("isPublic", checked)
                    }
                    className="data-[state=checked]:bg-green-500"
                  />
                </div>
              </div>

              {/* Rules Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-gray-400" />
                    <label className="text-sm font-semibold text-white">Regras</label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addRule}
                    className="text-[#0126fb] hover:bg-[#0126fb]/10 hover:text-[#0126fb] gap-1.5 rounded-lg h-8"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar Regra
                  </Button>
                </div>

                <p className="text-xs text-gray-500 bg-[#00205e]/20 rounded-lg px-3 py-2 border border-[#0126fb]/10">
                  O usuario precisa satisfazer pelo menos UMA regra para ter acesso
                </p>

                {rules.length === 0 && (
                  <div className="border border-dashed border-[#0126fb]/20 rounded-xl p-8 flex flex-col items-center gap-2">
                    <ListChecks className="h-8 w-8 text-gray-600" />
                    <p className="text-sm text-gray-500">Nenhuma regra adicionada</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={addRule}
                      className="text-[#0126fb] hover:bg-[#0126fb]/10 hover:text-[#0126fb] mt-1"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Adicionar primeira regra
                    </Button>
                  </div>
                )}

                {rules.map((rule, ruleIndex) => (
                  <div
                    key={ruleIndex}
                    className="bg-[#00205e]/20 border border-[#0126fb]/15 rounded-xl p-5 space-y-4 hover:border-[#0126fb]/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-[#0126fb]/15 flex items-center justify-center">
                          <span className="text-xs font-bold text-[#0126fb]">
                            {ruleIndex + 1}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-white">
                          Regra {ruleIndex + 1}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRule(ruleIndex)}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-400 gap-1.5 h-7 px-2 rounded-lg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remover
                      </Button>
                    </div>

                    {/* Areas multi-select */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
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
                            className="w-full justify-between bg-[#00205e]/60 border border-white/10 text-white hover:bg-[#00205e]/80 hover:text-white h-10 rounded-lg"
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
                        <div className="flex flex-wrap gap-1.5 mt-2 p-2.5 bg-[#00205e]/30 rounded-lg border border-[#0126fb]/10">
                          {rule.allowedAreas.map((area) => (
                            <Badge
                              key={area}
                              className="bg-[#0126fb]/15 text-white border border-[#0126fb]/30 gap-1.5 py-1 px-2.5 transition-all hover:bg-[#0126fb]/25"
                            >
                              {ROLE_AREA_LABELS[area]}
                              <X
                                className="h-3 w-3 cursor-pointer text-gray-400 hover:text-red-400 transition-colors"
                                onClick={() => removeArea(ruleIndex, area)}
                              />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Roles multi-select */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
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
                            className="w-full justify-between bg-[#00205e]/60 border border-white/10 text-white hover:bg-[#00205e]/80 hover:text-white h-10 rounded-lg"
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
                        <div className="flex flex-wrap gap-1.5 mt-2 p-2.5 bg-[#00205e]/30 rounded-lg border border-[#0126fb]/10">
                          {rule.allowedRoleIds.map((roleId) => {
                            const role = roles.find((r) => r.id === roleId);
                            return role ? (
                              <Badge
                                key={roleId}
                                className="bg-[#f5b719]/10 text-[#f5b719] border border-[#f5b719]/25 gap-1.5 py-1 px-2.5 transition-all hover:bg-[#f5b719]/20"
                              >
                                {role.name}
                                <X
                                  className="h-3 w-3 cursor-pointer text-[#f5b719]/60 hover:text-red-400 transition-colors"
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
                    <Save className="h-4 w-4" />
                  )}
                  {isEditing ? "Salvar Alteracoes" : "Criar Politica"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
