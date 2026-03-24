"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield,
  Route,
  Zap,
  Lock,
  Plus,
  Trash2,
  Pencil,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Users,
  Globe,
  UserX,
  FileText,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
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
import { cn } from "@/lib/utils";
import type {
  PolicyWithUsage,
  RoutePermissionItem,
  ActionPermissionItem,
  PolicySelectOption,
} from "@/lib/schemas/permissionSchema";
import {
  getPoliciesWithUsage,
  getRoutePermissionsList,
  getActionPermissionsList,
  updateRoutePolicy,
  toggleRouteActive,
  updateActionPolicy,
  toggleActionActive,
  deletePolicy,
} from "@/lib/actions/manage-permissions";
import PolicyFormModal from "./PolicyFormModal";
import { AreaRoles } from "@prisma/client";

interface ManagePermissionsContentProps {
  initialPolicies: PolicyWithUsage[];
  initialRoutes: RoutePermissionItem[];
  initialActions: ActionPermissionItem[];
  policyOptions: PolicySelectOption[];
  roles: Array<{ id: string; name: string; area: AreaRoles[] }>;
}

export default function ManagePermissionsContent({
  initialPolicies,
  initialRoutes,
  initialActions,
  policyOptions,
  roles,
}: ManagePermissionsContentProps) {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<PolicyWithUsage | null>(
    null
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ─── Queries ──────────────────────────────────────────────────────────

  const { data: policies = initialPolicies } = useQuery({
    queryKey: ["permission-policies"],
    queryFn: () => getPoliciesWithUsage(),
    initialData: initialPolicies,
  });

  const { data: routes = initialRoutes } = useQuery({
    queryKey: ["permission-routes"],
    queryFn: () => getRoutePermissionsList(),
    initialData: initialRoutes,
  });

  const { data: actions = initialActions } = useQuery({
    queryKey: ["permission-actions"],
    queryFn: () => getActionPermissionsList(),
    initialData: initialActions,
  });

  // ─── Mutations ────────────────────────────────────────────────────────

  const updateRoutePolicyMutation = useMutation({
    mutationFn: ({ id, policyId }: { id: string; policyId: string }) =>
      updateRoutePolicy(id, policyId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Politica da rota atualizada");
        queryClient.invalidateQueries({ queryKey: ["permission-routes"] });
      } else {
        toast.error(result.error || "Erro ao atualizar politica da rota");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar politica da rota");
    },
  });

  const toggleRouteActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleRouteActive(id, isActive),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Status da rota atualizado");
        queryClient.invalidateQueries({ queryKey: ["permission-routes"] });
      } else {
        toast.error(result.error || "Erro ao atualizar status da rota");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar status da rota");
    },
  });

  const updateActionPolicyMutation = useMutation({
    mutationFn: ({ id, policyId }: { id: string; policyId: string }) =>
      updateActionPolicy(id, policyId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Politica da acao atualizada");
        queryClient.invalidateQueries({ queryKey: ["permission-actions"] });
      } else {
        toast.error(result.error || "Erro ao atualizar politica da acao");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar politica da acao");
    },
  });

  const toggleActionActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleActionActive(id, isActive),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Status da acao atualizado");
        queryClient.invalidateQueries({ queryKey: ["permission-actions"] });
      } else {
        toast.error(result.error || "Erro ao atualizar status da acao");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar status da acao");
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Politica deletada com sucesso");
        queryClient.invalidateQueries({ queryKey: ["permission-policies"] });
        queryClient.invalidateQueries({ queryKey: ["permission-routes"] });
        queryClient.invalidateQueries({ queryKey: ["permission-actions"] });
      } else {
        toast.error(result.error || "Erro ao deletar politica");
      }
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao deletar politica");
      setDeleteId(null);
    },
  });

  // ─── Stats ────────────────────────────────────────────────────────────

  const stats = useMemo(
    () => ({
      totalPolicies: policies.length,
      protectedRoutes: routes.filter((r) => r.isActive).length,
      configuredActions: actions.filter((a) => a.isActive).length,
      builtInPolicies: policies.filter((p) => p.isBuiltIn).length,
    }),
    [policies, routes, actions]
  );

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Gerenciar Permissoes
          </h1>
          <p className="text-gray-400 mt-1 text-base">
            Configure politicas de acesso, rotas protegidas e acoes do sistema
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white h-11 px-6 text-sm font-semibold shadow-lg shadow-[#0126fb]/20 transition-all hover:shadow-[#0126fb]/30"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Politica
        </Button>
      </div>

      {/* Stats Cards - Enhanced */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Politicas",
            value: stats.totalPolicies,
            icon: Shield,
            iconColor: "text-[#0126fb]",
            iconBg: "bg-[#0126fb]/10",
            borderColor: "border-[#0126fb]/30",
            gradient: "from-[#0126fb]/5 to-transparent",
          },
          {
            label: "Rotas Protegidas",
            value: stats.protectedRoutes,
            icon: Route,
            iconColor: "text-green-400",
            iconBg: "bg-green-400/10",
            borderColor: "border-green-400/30",
            gradient: "from-green-400/5 to-transparent",
          },
          {
            label: "Acoes Configuradas",
            value: stats.configuredActions,
            icon: Zap,
            iconColor: "text-[#f5b719]",
            iconBg: "bg-[#f5b719]/10",
            borderColor: "border-[#f5b719]/30",
            gradient: "from-[#f5b719]/5 to-transparent",
          },
          {
            label: "Politicas Built-in",
            value: stats.builtInPolicies,
            icon: Lock,
            iconColor: "text-orange-400",
            iconBg: "bg-orange-400/10",
            borderColor: "border-orange-400/30",
            gradient: "from-orange-400/5 to-transparent",
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

      {/* Tabs - Enhanced with better visual treatment */}
      <Tabs defaultValue="routes" className="space-y-6">
        <TabsList className="bg-[#010d26] border border-[#0126fb]/20 p-1 rounded-xl h-auto flex-wrap">
          <TabsTrigger
            value="routes"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#0126fb]/20 gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
          >
            <Route className="h-4 w-4" />
            Rotas
            <Badge className="bg-white/10 text-current border-0 text-xs ml-1 h-5 px-1.5">
              {routes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="actions"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#0126fb]/20 gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
          >
            <Zap className="h-4 w-4" />
            Acoes
            <Badge className="bg-white/10 text-current border-0 text-xs ml-1 h-5 px-1.5">
              {actions.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="policies"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-[#0126fb]/20 gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
          >
            <Shield className="h-4 w-4" />
            Politicas
            <Badge className="bg-white/10 text-current border-0 text-xs ml-1 h-5 px-1.5">
              {policies.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Rotas ────────────────────────────────────────────── */}
        <TabsContent value="routes">
          {routes.length === 0 ? (
            <div className="border border-[#0126fb]/20 rounded-xl bg-[#010d26] p-16 flex flex-col items-center justify-center gap-4">
              <div className="p-4 rounded-full bg-[#0126fb]/5 border border-[#0126fb]/20">
                <Route className="h-10 w-10 text-gray-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-medium text-gray-300">Nenhuma rota configurada</p>
                <p className="text-sm text-gray-500">
                  As rotas protegidas aparecerao aqui
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card View for Routes */}
              <div className="md:hidden space-y-3">
                {routes.map((route) => (
                  <div
                    key={route.id}
                    className="bg-[#010d26] border border-[#0126fb]/20 rounded-xl p-4 space-y-3 hover:border-[#0126fb]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <code className="text-sm font-mono text-white bg-[#00205e]/40 px-2 py-0.5 rounded">
                          {route.path}
                        </code>
                        {route.label && (
                          <p className="text-sm text-gray-400 mt-1.5">{route.label}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={route.isActive}
                          onCheckedChange={(checked) =>
                            toggleRouteActiveMutation.mutate({
                              id: route.id,
                              isActive: checked,
                            })
                          }
                          className="data-[state=checked]:bg-green-500"
                        />
                        <Badge
                          className={cn(
                            "border text-xs",
                            route.isActive
                              ? "bg-green-500/15 text-green-400 border-green-500/25"
                              : "bg-gray-500/15 text-gray-400 border-gray-500/25"
                          )}
                        >
                          {route.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    <Select
                      value={route.policyId}
                      onValueChange={(value) =>
                        updateRoutePolicyMutation.mutate({
                          id: route.id,
                          policyId: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-full bg-[#00205e]/60 border border-white/10 text-white h-10 rounded-lg">
                        <SelectValue placeholder="Selecionar politica" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                        {policyOptions.map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white"
                          >
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Desktop Table View for Routes */}
              <div className="hidden md:block border border-[#0126fb]/20 rounded-xl overflow-hidden bg-[#010d26]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00205e]/30 border-b border-[#0126fb]/20 hover:bg-[#00205e]/30">
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Path</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Label</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Politica</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routes.map((route) => (
                      <TableRow
                        key={route.id}
                        className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/20 transition-colors"
                      >
                        <TableCell className="py-4">
                          <code className="text-sm font-mono text-white bg-[#00205e]/40 px-2 py-0.5 rounded">
                            {route.path}
                          </code>
                        </TableCell>
                        <TableCell className="text-gray-300 py-4">
                          {route.label || <span className="text-gray-600">--</span>}
                        </TableCell>
                        <TableCell className="py-4">
                          <Select
                            value={route.policyId}
                            onValueChange={(value) =>
                              updateRoutePolicyMutation.mutate({
                                id: route.id,
                                policyId: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-[220px] bg-[#00205e]/60 border border-white/10 text-white h-9 rounded-lg">
                              <SelectValue placeholder="Selecionar politica" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                              {policyOptions.map((opt) => (
                                <SelectItem
                                  key={opt.id}
                                  value={opt.id}
                                  className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white"
                                >
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={route.isActive}
                              onCheckedChange={(checked) =>
                                toggleRouteActiveMutation.mutate({
                                  id: route.id,
                                  isActive: checked,
                                })
                              }
                              className="data-[state=checked]:bg-green-500"
                            />
                            <Badge
                              className={cn(
                                "border",
                                route.isActive
                                  ? "bg-green-500/15 text-green-400 border-green-500/25"
                                  : "bg-gray-500/15 text-gray-400 border-gray-500/25"
                              )}
                            >
                              {route.isActive ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Inativo
                                </span>
                              )}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Tab: Acoes ────────────────────────────────────────────── */}
        <TabsContent value="actions">
          {actions.length === 0 ? (
            <div className="border border-[#0126fb]/20 rounded-xl bg-[#010d26] p-16 flex flex-col items-center justify-center gap-4">
              <div className="p-4 rounded-full bg-[#f5b719]/5 border border-[#f5b719]/20">
                <Zap className="h-10 w-10 text-gray-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-medium text-gray-300">Nenhuma acao configurada</p>
                <p className="text-sm text-gray-500">
                  As acoes do sistema aparecerao aqui
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Mobile Card View for Actions */}
              <div className="md:hidden space-y-3">
                {actions.map((action) => (
                  <div
                    key={action.id}
                    className="bg-[#010d26] border border-[#0126fb]/20 rounded-xl p-4 space-y-3 hover:border-[#0126fb]/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <code className="text-sm font-mono text-white bg-[#00205e]/40 px-2 py-0.5 rounded">
                          {action.actionKey}
                        </code>
                        {action.label && (
                          <p className="text-sm text-gray-300 mt-1.5 font-medium">{action.label}</p>
                        )}
                        {action.description && (
                          <p className="text-xs text-gray-500 mt-0.5">{action.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Switch
                          checked={action.isActive}
                          onCheckedChange={(checked) =>
                            toggleActionActiveMutation.mutate({
                              id: action.id,
                              isActive: checked,
                            })
                          }
                          className="data-[state=checked]:bg-green-500"
                        />
                        <Badge
                          className={cn(
                            "border text-xs",
                            action.isActive
                              ? "bg-green-500/15 text-green-400 border-green-500/25"
                              : "bg-gray-500/15 text-gray-400 border-gray-500/25"
                          )}
                        >
                          {action.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                    <Select
                      value={action.policyId}
                      onValueChange={(value) =>
                        updateActionPolicyMutation.mutate({
                          id: action.id,
                          policyId: value,
                        })
                      }
                    >
                      <SelectTrigger className="w-full bg-[#00205e]/60 border border-white/10 text-white h-10 rounded-lg">
                        <SelectValue placeholder="Selecionar politica" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                        {policyOptions.map((opt) => (
                          <SelectItem
                            key={opt.id}
                            value={opt.id}
                            className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white"
                          >
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {/* Desktop Table View for Actions */}
              <div className="hidden md:block border border-[#0126fb]/20 rounded-xl overflow-hidden bg-[#010d26]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-[#00205e]/30 border-b border-[#0126fb]/20 hover:bg-[#00205e]/30">
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Acao</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Label</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Descricao</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Politica</TableHead>
                      <TableHead className="text-gray-300 font-semibold text-xs uppercase tracking-wider py-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow
                        key={action.id}
                        className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/20 transition-colors"
                      >
                        <TableCell className="py-4">
                          <code className="text-sm font-mono text-white bg-[#00205e]/40 px-2 py-0.5 rounded">
                            {action.actionKey}
                          </code>
                        </TableCell>
                        <TableCell className="text-gray-300 py-4 font-medium">
                          {action.label || <span className="text-gray-600">--</span>}
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm max-w-[250px] py-4">
                          <span className="line-clamp-2">
                            {action.description || <span className="text-gray-600">--</span>}
                          </span>
                        </TableCell>
                        <TableCell className="py-4">
                          <Select
                            value={action.policyId}
                            onValueChange={(value) =>
                              updateActionPolicyMutation.mutate({
                                id: action.id,
                                policyId: value,
                              })
                            }
                          >
                            <SelectTrigger className="w-[220px] bg-[#00205e]/60 border border-white/10 text-white h-9 rounded-lg">
                              <SelectValue placeholder="Selecionar politica" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
                              {policyOptions.map((opt) => (
                                <SelectItem
                                  key={opt.id}
                                  value={opt.id}
                                  className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white"
                                >
                                  {opt.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={action.isActive}
                              onCheckedChange={(checked) =>
                                toggleActionActiveMutation.mutate({
                                  id: action.id,
                                  isActive: checked,
                                })
                              }
                              className="data-[state=checked]:bg-green-500"
                            />
                            <Badge
                              className={cn(
                                "border",
                                action.isActive
                                  ? "bg-green-500/15 text-green-400 border-green-500/25"
                                  : "bg-gray-500/15 text-gray-400 border-gray-500/25"
                              )}
                            >
                              {action.isActive ? (
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Ativo
                                </span>
                              ) : (
                                <span className="flex items-center gap-1">
                                  <XCircle className="h-3 w-3" />
                                  Inativo
                                </span>
                              )}
                            </Badge>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ─── Tab: Politicas (Card View) ───────────────────────────── */}
        <TabsContent value="policies">
          {policies.length === 0 ? (
            <div className="border border-[#0126fb]/20 rounded-xl bg-[#010d26] p-16 flex flex-col items-center justify-center gap-4">
              <div className="p-4 rounded-full bg-[#0126fb]/5 border border-[#0126fb]/20">
                <Shield className="h-10 w-10 text-gray-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-lg font-medium text-gray-300">
                  Nenhuma politica encontrada
                </p>
                <p className="text-sm text-gray-500">
                  Clique em &quot;Nova Politica&quot; para criar a primeira
                </p>
              </div>
              <Button
                onClick={() => setCreateModalOpen(true)}
                variant="ghost"
                className="mt-2 text-[#0126fb] hover:bg-[#0126fb]/10 hover:text-[#0126fb]"
              >
                <Plus className="mr-2 h-4 w-4" />
                Criar Politica
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {policies.map((policy) => {
                const usageCount =
                  policy._count.routePermissions +
                  policy._count.actionPermissions;

                return (
                  <div
                    key={policy.id}
                    className="bg-[#010d26] border border-[#0126fb]/20 rounded-xl p-5 hover:border-[#0126fb]/40 transition-all group relative overflow-hidden"
                  >
                    {/* Subtle gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0126fb]/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    <div className="relative space-y-4">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-[#0126fb]/10 shrink-0">
                            <ShieldCheck className="h-4 w-4 text-[#0126fb]" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-white truncate">
                              {policy.name}
                            </h3>
                          </div>
                        </div>
                        {policy.isBuiltIn && (
                          <Badge className="bg-[#0126fb]/15 text-[#5b8aff] border border-[#0126fb]/25 text-xs shrink-0">
                            Built-in
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      {policy.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 leading-relaxed">
                          {policy.description}
                        </p>
                      )}

                      {/* Stats Row */}
                      <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#00205e]/30 rounded-md px-2.5 py-1.5">
                          <FileText className="h-3 w-3" />
                          <span className="font-medium text-white">{policy.rules.length}</span>
                          {policy.rules.length === 1 ? "regra" : "regras"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#00205e]/30 rounded-md px-2.5 py-1.5">
                          <Route className="h-3 w-3" />
                          <span className="font-medium text-white">{usageCount}</span>
                          {usageCount === 1 ? "uso" : "usos"}
                        </div>
                      </div>

                      {/* Flags */}
                      <div className="flex gap-3">
                        <div className="flex items-center gap-1.5 text-xs">
                          <UserX className={cn("h-3.5 w-3.5", policy.allowExMembers ? "text-green-400" : "text-gray-600")} />
                          <span className={policy.allowExMembers ? "text-green-400" : "text-gray-500"}>
                            Ex-membros
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Globe className={cn("h-3.5 w-3.5", policy.isPublic ? "text-green-400" : "text-gray-600")} />
                          <span className={policy.isPublic ? "text-green-400" : "text-gray-500"}>
                            Publica
                          </span>
                        </div>
                      </div>

                      {/* Card Actions */}
                      <div className="flex justify-end gap-1 pt-2 border-t border-white/5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="hover:bg-white/10 text-gray-400 hover:text-white gap-1.5 h-8 rounded-lg"
                          onClick={() => setEditingPolicy(policy)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        {!policy.isBuiltIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hover:bg-red-500/10 text-gray-400 hover:text-red-400 gap-1.5 h-8 rounded-lg"
                            onClick={() => setDeleteId(policy.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Deletar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Policy Modal */}
      <PolicyFormModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        roles={roles}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ["permission-policies"],
          });
        }}
      />

      {/* Edit Policy Modal */}
      {editingPolicy && (
        <PolicyFormModal
          open={!!editingPolicy}
          onOpenChange={(open) => {
            if (!open) setEditingPolicy(null);
          }}
          editingPolicy={editingPolicy}
          roles={roles}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ["permission-policies"],
            });
            setEditingPolicy(null);
          }}
        />
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
                  Deletar politica?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400 mt-1">
                  Esta acao nao pode ser desfeita. A politica sera permanentemente
                  removida do sistema.
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
              onClick={() => deleteId && deletePolicyMutation.mutate(deleteId)}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
