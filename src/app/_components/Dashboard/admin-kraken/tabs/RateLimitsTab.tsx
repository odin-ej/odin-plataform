"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertCircle, Plus, Save } from "lucide-react";

interface RateLimit {
  id: string;
  role: string;
  displayName: string;
  maxDailyRequests: number;
  maxDailyTokens: number;
  priority: number;
  isActive: boolean;
}

type RateLimitEdits = Record<
  string,
  Partial<Pick<RateLimit, "maxDailyRequests" | "maxDailyTokens" | "priority" | "isActive">>
>;

interface CreateRateLimitData {
  role: string;
  displayName: string;
  maxDailyRequests: number;
  maxDailyTokens: number;
  priority: number;
  isActive: boolean;
}

const defaultCreateData: CreateRateLimitData = {
  role: "",
  displayName: "",
  maxDailyRequests: 100,
  maxDailyTokens: 500000,
  priority: 0,
  isActive: true,
};

async function fetchRateLimits(): Promise<RateLimit[]> {
  const res = await fetch("/api/kraken/rate-limits");
  if (!res.ok) throw new Error("Falha ao carregar rate limits");
  return res.json();
}

export default function RateLimitsTab() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<RateLimitEdits>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] =
    useState<CreateRateLimitData>(defaultCreateData);

  const {
    data: rateLimits,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["kraken-rate-limits"],
    queryFn: fetchRateLimits,
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<RateLimit>;
    }) => {
      const res = await fetch(`/api/kraken/rate-limits/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao atualizar rate limit");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kraken-rate-limits"] });
      setEdits((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateRateLimitData) => {
      const res = await fetch("/api/kraken/rate-limits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao criar rate limit");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kraken-rate-limits"] });
      setIsCreateOpen(false);
      setCreateData(defaultCreateData);
    },
  });

  function updateEdit(
    id: string,
    field: keyof RateLimitEdits[string],
    value: number | boolean
  ) {
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  function getEditedValue<K extends keyof RateLimit>(
    rl: RateLimit,
    field: K
  ): RateLimit[K] {
    const edit = edits[rl.id];
    if (edit && field in edit) {
      return edit[field as keyof typeof edit] as RateLimit[K];
    }
    return rl[field];
  }

  function handleSaveRow(rl: RateLimit) {
    const edit = edits[rl.id];
    if (!edit) return;
    updateMutation.mutate({ id: rl.id, data: edit });
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Erro: {(error as Error).message}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Rate Limits</h2>
          <p className="text-sm text-muted-foreground">
            Configure limites de uso por cargo
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Rate Limit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Rate Limit</DialogTitle>
              <DialogDescription>
                Configure um novo limite de uso por cargo
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-role">Cargo (slug)</Label>
                  <Input
                    id="create-role"
                    value={createData.role}
                    onChange={(e) =>
                      setCreateData({ ...createData, role: e.target.value })
                    }
                    placeholder="ex: admin"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-displayName">Nome de Exibição</Label>
                  <Input
                    id="create-displayName"
                    value={createData.displayName}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        displayName: e.target.value,
                      })
                    }
                    placeholder="ex: Administrador"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-maxRequests">
                    Máx. Requisições/Dia
                  </Label>
                  <Input
                    id="create-maxRequests"
                    type="number"
                    value={createData.maxDailyRequests}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        maxDailyRequests: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-maxTokens">Máx. Tokens/Dia</Label>
                  <Input
                    id="create-maxTokens"
                    type="number"
                    value={createData.maxDailyTokens}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        maxDailyTokens: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-priority">Prioridade</Label>
                  <Input
                    id="create-priority"
                    type="number"
                    value={createData.priority}
                    onChange={(e) =>
                      setCreateData({
                        ...createData,
                        priority: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    id="create-active"
                    checked={createData.isActive}
                    onCheckedChange={(checked) =>
                      setCreateData({ ...createData, isActive: checked })
                    }
                  />
                  <Label htmlFor="create-active">Ativo</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate(createData)}
                disabled={
                  createMutation.isPending ||
                  !createData.role.trim() ||
                  !createData.displayName.trim()
                }
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Nome de Exibição</TableHead>
                  <TableHead>Máx. Requisições/Dia</TableHead>
                  <TableHead>Máx. Tokens/Dia</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rateLimits && rateLimits.length > 0 ? (
                  rateLimits.map((rl) => (
                    <TableRow key={rl.id}>
                      <TableCell className="font-mono text-sm">
                        {rl.role}
                      </TableCell>
                      <TableCell>{rl.displayName}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-28"
                          value={getEditedValue(rl, "maxDailyRequests")}
                          onChange={(e) =>
                            updateEdit(
                              rl.id,
                              "maxDailyRequests",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-32"
                          value={getEditedValue(rl, "maxDailyTokens")}
                          onChange={(e) =>
                            updateEdit(
                              rl.id,
                              "maxDailyTokens",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="h-8 w-20"
                          value={getEditedValue(rl, "priority")}
                          onChange={(e) =>
                            updateEdit(
                              rl.id,
                              "priority",
                              parseInt(e.target.value) || 0
                            )
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={getEditedValue(rl, "isActive")}
                          onCheckedChange={(checked) =>
                            updateEdit(rl.id, "isActive", checked)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSaveRow(rl)}
                          disabled={
                            !edits[rl.id] || updateMutation.isPending
                          }
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground"
                    >
                      Nenhum rate limit configurado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
