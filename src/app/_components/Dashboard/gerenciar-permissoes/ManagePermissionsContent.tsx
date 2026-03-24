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
        toast.success("Política da rota atualizada");
        queryClient.invalidateQueries({ queryKey: ["permission-routes"] });
      } else {
        toast.error(result.error || "Erro ao atualizar política da rota");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar política da rota");
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
        toast.success("Política da ação atualizada");
        queryClient.invalidateQueries({ queryKey: ["permission-actions"] });
      } else {
        toast.error(result.error || "Erro ao atualizar política da ação");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar política da ação");
    },
  });

  const toggleActionActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      toggleActionActive(id, isActive),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Status da ação atualizado");
        queryClient.invalidateQueries({ queryKey: ["permission-actions"] });
      } else {
        toast.error(result.error || "Erro ao atualizar status da ação");
      }
    },
    onError: () => {
      toast.error("Erro ao atualizar status da ação");
    },
  });

  const deletePolicyMutation = useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Política deletada com sucesso");
        queryClient.invalidateQueries({ queryKey: ["permission-policies"] });
        queryClient.invalidateQueries({ queryKey: ["permission-routes"] });
        queryClient.invalidateQueries({ queryKey: ["permission-actions"] });
      } else {
        toast.error(result.error || "Erro ao deletar política");
      }
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao deletar política");
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Gerenciar Permissões
          </h1>
          <p className="text-gray-400">
            Configure políticas de acesso, rotas protegidas e ações do sistema
          </p>
        </div>
        <Button
          onClick={() => setCreateModalOpen(true)}
          className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Política
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Políticas",
            value: stats.totalPolicies,
            icon: Shield,
            iconColor: "text-[#0126fb]",
          },
          {
            label: "Rotas Protegidas",
            value: stats.protectedRoutes,
            icon: Route,
            iconColor: "text-green-400",
          },
          {
            label: "Ações Configuradas",
            value: stats.configuredActions,
            icon: Zap,
            iconColor: "text-[#f5b719]",
          },
          {
            label: "Políticas Built-in",
            value: stats.builtInPolicies,
            icon: Lock,
            iconColor: "text-orange-400",
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

      {/* Tabs */}
      <Tabs defaultValue="routes" className="space-y-4">
        <TabsList className="bg-[#010d26] border border-[#0126fb]/30 p-1">
          <TabsTrigger
            value="routes"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white gap-2"
          >
            <Route className="h-4 w-4" />
            Rotas ({routes.length})
          </TabsTrigger>
          <TabsTrigger
            value="actions"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white gap-2"
          >
            <Zap className="h-4 w-4" />
            Ações ({actions.length})
          </TabsTrigger>
          <TabsTrigger
            value="policies"
            className="data-[state=active]:bg-[#0126fb] data-[state=active]:text-white gap-2"
          >
            <Shield className="h-4 w-4" />
            Políticas ({policies.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab: Rotas ────────────────────────────────────────────── */}
        <TabsContent value="routes">
          <div className="border border-[#0126fb]/30 rounded-lg overflow-hidden bg-[#010d26]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#010d26] border-b border-[#0126fb]/30 hover:bg-[#010d26]">
                  <TableHead className="text-gray-300">Path</TableHead>
                  <TableHead className="text-gray-300">Label</TableHead>
                  <TableHead className="text-gray-300">Política</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {routes.length === 0 ? (
                  <TableRow className="hover:bg-[#010d26]">
                    <TableCell
                      colSpan={4}
                      className="text-center py-12 text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Route className="h-8 w-8 text-gray-600" />
                        <p>Nenhuma rota configurada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  routes.map((route) => (
                    <TableRow
                      key={route.id}
                      className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/30"
                    >
                      <TableCell className="font-mono text-sm text-white">
                        {route.path}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {route.label || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={route.policyId}
                          onValueChange={(value) =>
                            updateRoutePolicyMutation.mutate({
                              id: route.id,
                              policyId: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-[200px] bg-[#00205e] border-white/20 text-white">
                            <SelectValue placeholder="Selecionar política" />
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={route.isActive}
                            onCheckedChange={(checked) =>
                              toggleRouteActiveMutation.mutate({
                                id: route.id,
                                isActive: checked,
                              })
                            }
                          />
                          <Badge
                            className={cn(
                              "border",
                              route.isActive
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                            )}
                          >
                            {route.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Tab: Ações ────────────────────────────────────────────── */}
        <TabsContent value="actions">
          <div className="border border-[#0126fb]/30 rounded-lg overflow-hidden bg-[#010d26]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#010d26] border-b border-[#0126fb]/30 hover:bg-[#010d26]">
                  <TableHead className="text-gray-300">Ação</TableHead>
                  <TableHead className="text-gray-300">Label</TableHead>
                  <TableHead className="text-gray-300">Descrição</TableHead>
                  <TableHead className="text-gray-300">Política</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {actions.length === 0 ? (
                  <TableRow className="hover:bg-[#010d26]">
                    <TableCell
                      colSpan={5}
                      className="text-center py-12 text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Zap className="h-8 w-8 text-gray-600" />
                        <p>Nenhuma ação configurada</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  actions.map((action) => (
                    <TableRow
                      key={action.id}
                      className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/30"
                    >
                      <TableCell className="font-mono text-sm text-white">
                        {action.actionKey}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {action.label || "—"}
                      </TableCell>
                      <TableCell className="text-gray-400 text-sm max-w-[250px] truncate">
                        {action.description || "—"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={action.policyId}
                          onValueChange={(value) =>
                            updateActionPolicyMutation.mutate({
                              id: action.id,
                              policyId: value,
                            })
                          }
                        >
                          <SelectTrigger className="w-[200px] bg-[#00205e] border-white/20 text-white">
                            <SelectValue placeholder="Selecionar política" />
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
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={action.isActive}
                            onCheckedChange={(checked) =>
                              toggleActionActiveMutation.mutate({
                                id: action.id,
                                isActive: checked,
                              })
                            }
                          />
                          <Badge
                            className={cn(
                              "border",
                              action.isActive
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                            )}
                          >
                            {action.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ─── Tab: Políticas ────────────────────────────────────────── */}
        <TabsContent value="policies">
          <div className="border border-[#0126fb]/30 rounded-lg overflow-hidden bg-[#010d26]">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#010d26] border-b border-[#0126fb]/30 hover:bg-[#010d26]">
                  <TableHead className="text-gray-300">Nome</TableHead>
                  <TableHead className="text-gray-300">Descrição</TableHead>
                  <TableHead className="text-gray-300">Ex-membros?</TableHead>
                  <TableHead className="text-gray-300">Pública?</TableHead>
                  <TableHead className="text-gray-300">Regras</TableHead>
                  <TableHead className="text-gray-300">Uso</TableHead>
                  <TableHead className="text-gray-300 text-right">
                    Ações
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow className="hover:bg-[#010d26]">
                    <TableCell
                      colSpan={7}
                      className="text-center py-12 text-gray-400"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Shield className="h-8 w-8 text-gray-600" />
                        <p>Nenhuma política encontrada</p>
                        <p className="text-xs">
                          Clique em &quot;Nova Política&quot; para criar a
                          primeira
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => {
                    const usageCount =
                      policy._count.routePermissions +
                      policy._count.actionPermissions;

                    return (
                      <TableRow
                        key={policy.id}
                        className="border-b border-[#0126fb]/10 hover:bg-[#00205e]/30"
                      >
                        <TableCell className="font-medium text-white">
                          <div className="flex items-center gap-2">
                            {policy.name}
                            {policy.isBuiltIn && (
                              <Badge className="bg-[#0126fb]/20 text-[#5b8aff] border border-[#0126fb]/30 text-xs">
                                Built-in
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm max-w-[250px] truncate">
                          {policy.description || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border",
                              policy.allowExMembers
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                            )}
                          >
                            {policy.allowExMembers ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "border",
                              policy.isPublic
                                ? "bg-green-500/20 text-green-400 border-green-500/30"
                                : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                            )}
                          >
                            {policy.isPublic ? "Sim" : "Não"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#0126fb]/20 text-[#5b8aff] border border-[#0126fb]/30">
                            {policy.rules.length}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#0126fb]/20 text-[#5b8aff] border border-[#0126fb]/30">
                            {usageCount}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="hover:bg-white/10 text-gray-400 hover:text-white"
                              onClick={() => setEditingPolicy(policy)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {!policy.isBuiltIn && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-red-500/10 text-gray-400 hover:text-red-400"
                                onClick={() => setDeleteId(policy.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
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
        <AlertDialogContent className="bg-[#010d26] text-white border-2 border-red-500/50">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">
              Deletar política?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Esta ação não pode ser desfeita. A política será permanentemente
              removida do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
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
