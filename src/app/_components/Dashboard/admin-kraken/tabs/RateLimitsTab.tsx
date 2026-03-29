"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, HelpCircle, Info, Plus, Save } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface RateLimit {
  id: string;
  role: string;
  displayName: string;
  maxDailyRequests: number;
  maxDailyTokens: number;
  priority: number;
  isActive: boolean;
}

interface RoleOption {
  id: string;
  name: string;
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

/* ------------------------------------------------------------------ */
/*  Fetch helpers                                                     */
/* ------------------------------------------------------------------ */

async function fetchRateLimits(): Promise<RateLimit[]> {
  const res = await fetch("/api/kraken/rate-limits");
  if (!res.ok) throw new Error("Falha ao carregar rate limits");
  return res.json();
}

async function fetchRoles(): Promise<RoleOption[]> {
  const res = await fetch("/api/kraken/rate-limits/roles");
  if (!res.ok) return [];
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Small helper: inline help tooltip                                 */
/* ------------------------------------------------------------------ */

function FieldHelp({ text }: { text: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <HelpCircle className="ml-1 inline h-3.5 w-3.5 shrink-0 cursor-help text-white/40 hover:text-white/70" />
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-xs border border-[#0126fb]/40 bg-[#00205e] text-xs text-white"
        >
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function RateLimitsTab() {
  const queryClient = useQueryClient();
  const [edits, setEdits] = useState<RateLimitEdits>({});
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] =
    useState<CreateRateLimitData>(defaultCreateData);

  /* --- Queries --- */

  const {
    data: rateLimits,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["kraken-rate-limits"],
    queryFn: fetchRateLimits,
  });

  const { data: roles } = useQuery({
    queryKey: ["kraken-roles"],
    queryFn: fetchRoles,
  });

  /* --- Mutations --- */

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

  /* --- Inline-edit helpers --- */

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

  /* --- Role selection in the create dialog --- */

  function handleRoleSelect(roleName: string) {
    setCreateData((prev) => ({
      ...prev,
      role: roleName,
      displayName: roleName,
    }));
  }

  /* --- Error state --- */

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        <AlertCircle className="h-5 w-5" />
        <span>Erro: {(error as Error).message}</span>
      </div>
    );
  }

  /* --- Render --- */

  return (
    <div className="flex flex-col gap-6">
      {/* ---------- Header ---------- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Rate Limits</h2>
          <p className="text-sm text-white/50">
            Configure limites de uso por cargo
          </p>
        </div>

        {/* ---- Create dialog trigger ---- */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0126fb] text-white hover:bg-[#0126fb]/80">
              <Plus className="mr-2 h-4 w-4" />
              Adicionar Rate Limit
            </Button>
          </DialogTrigger>

          {/* ---- Create dialog content ---- */}
          <DialogContent className="bg-[#010d26] border-2 border-[#0126fb]/30 text-white">
            <DialogHeader>
              <DialogTitle className="text-white">Novo Rate Limit</DialogTitle>
              <DialogDescription className="text-white/50">
                Configure um novo limite de uso por cargo
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-4">
              {/* Role selector (single column) */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="create-role" className="text-white/80">
                  Cargo
                  <FieldHelp text="Selecione o cargo que receberá este limite de uso no Kraken." />
                </Label>
                <Select
                  value={createData.role}
                  onValueChange={handleRoleSelect}
                >
                  <SelectTrigger
                    id="create-role"
                    className="bg-[#00205e] border-2 border-[#0126fb] text-white"
                  >
                    <SelectValue placeholder="Selecione um cargo..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#00205e] border border-[#0126fb]/30 text-white">
                    {roles && roles.length > 0 ? (
                      roles.map((r) => (
                        <SelectItem
                          key={r.id}
                          value={r.name}
                          className="text-white hover:!bg-[#00205e] hover:!text-[#f5b719] focus:!bg-[#0126fb]/20 focus:!text-white"
                        >
                          {r.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__empty" disabled className="text-white/40">
                        Nenhum cargo encontrado
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Max requests & tokens */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-maxRequests" className="text-white/80">
                    Máx. Requisições/Dia
                    <FieldHelp text="Quantas perguntas este cargo pode fazer ao Kraken por dia." />
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
                    className="border-2 border-white/30 bg-transparent text-white focus:border-[#0126fb]"
                  />
                  <p className="text-[11px] leading-tight text-white/40">
                    Ex: 100 = até 100 perguntas por dia.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-maxTokens" className="text-white/80">
                    Máx. Tokens/Dia
                    <FieldHelp text="Limite de processamento diário. 50.000 tokens ≈ 25 perguntas médias." />
                  </Label>
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
                    className="border-2 border-white/30 bg-transparent text-white focus:border-[#0126fb]"
                  />
                  <p className="text-[11px] leading-tight text-white/40">
                    50.000 tokens ≈ 25 perguntas médias.
                  </p>
                </div>
              </div>

              {/* Priority & active */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="create-priority" className="text-white/80">
                    Prioridade
                    <FieldHelp text="Quem tem prioridade maior é atendido primeiro em horários de pico. Valores mais altos = maior prioridade." />
                  </Label>
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
                    className="border-2 border-white/30 bg-transparent text-white focus:border-[#0126fb]"
                  />
                  <p className="text-[11px] leading-tight text-white/40">
                    0 = padrão. Quanto maior, mais prioritário.
                  </p>
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch
                    id="create-active"
                    checked={createData.isActive}
                    onCheckedChange={(checked) =>
                      setCreateData({ ...createData, isActive: checked })
                    }
                  />
                  <Label htmlFor="create-active" className="text-white/80">
                    Ativo
                  </Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="border-2 border-white/30 text-white hover:bg-white/10"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => createMutation.mutate(createData)}
                disabled={
                  createMutation.isPending || !createData.role.trim()
                }
                className="bg-[#0126fb] text-white hover:bg-[#0126fb]/80"
              >
                {createMutation.isPending ? "Criando..." : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ---------- Explainer card ---------- */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#0126fb]/20 bg-[#00205e]/30 p-4">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#0126fb]" />
        <div className="text-sm leading-relaxed text-white/70">
          <p className="mb-1 font-medium text-white/90">
            O que são Rate Limits?
          </p>
          <p>
            Rate Limits controlam quantas perguntas cada cargo pode fazer ao
            Kraken por dia e quanta capacidade de processamento (tokens) podem
            consumir. Isso evita sobrecarga do sistema e garante que todos os
            usuários tenham acesso justo ao assistente de IA.
          </p>
        </div>
      </div>

      {/* ---------- Data table ---------- */}
      <div className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] shadow-lg overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-white/10" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-b border-white/10 hover:bg-transparent">
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">
                  Cargo
                </TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">
                  Nome
                </TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">
                  <span className="inline-flex items-center">
                    Máx. Req/Dia
                    <FieldHelp text="Quantas perguntas este cargo pode fazer ao Kraken por dia." />
                  </span>
                </TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">
                  <span className="inline-flex items-center">
                    Máx. Tokens/Dia
                    <FieldHelp text="Limite de processamento diário. 50.000 tokens ≈ 25 perguntas médias." />
                  </span>
                </TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">
                  <span className="inline-flex items-center">
                    Prioridade
                    <FieldHelp text="Quem tem prioridade maior é atendido primeiro em horários de pico." />
                  </span>
                </TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">
                  Ativo
                </TableHead>
                <TableHead className="w-20 bg-[#00205e] text-[#0126fb] font-semibold">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {rateLimits && rateLimits.length > 0 ? (
                rateLimits.map((rl) => (
                  <TableRow
                    key={rl.id}
                    className="border-b border-white/10 hover:bg-white/5"
                  >
                    <TableCell className="font-mono text-sm text-[#f5b719]">
                      {rl.role}
                    </TableCell>
                    <TableCell className="text-white">
                      {rl.displayName}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        className="h-8 w-28 border border-white/20 bg-transparent text-white focus:border-[#0126fb]"
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
                        className="h-8 w-32 border border-white/20 bg-transparent text-white focus:border-[#0126fb]"
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
                        className="h-8 w-20 border border-white/20 bg-transparent text-white focus:border-[#0126fb]"
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
                        className="text-[#0126fb] hover:bg-[#0126fb]/10 hover:text-[#0126fb] disabled:opacity-30"
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
                    className="text-center text-white/40"
                  >
                    Nenhum rate limit configurado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
