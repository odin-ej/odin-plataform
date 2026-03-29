"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AlertCircle, DollarSign, Users, Bot } from "lucide-react";

interface AgentCost {
  agentName: string;
  requests: number;
  tokens: number;
  cost: number;
}

interface UserMetric {
  userName: string;
  requests: number;
  tokens: number;
}

interface AgentMetric {
  agentName: string;
  requests: number;
  tokens: number;
  cost: number;
}

type Period = "7" | "30" | "90";

async function fetchCosts(days: string): Promise<AgentCost[]> {
  const res = await fetch(`/api/kraken/metrics/costs?days=${days}`);
  if (!res.ok) throw new Error("Falha ao carregar custos");
  const json = await res.json();
  // API returns { dailyCosts: [...] } — aggregate by agent
  const dailyCosts: { date: string; agentId: string | null; cost: number }[] =
    json.dailyCosts ?? json ?? [];
  const map = new Map<string, AgentCost>();
  for (const row of dailyCosts) {
    const key = row.agentId ?? "desconhecido";
    const existing = map.get(key);
    if (existing) {
      existing.cost += Number(row.cost) || 0;
      existing.requests += 1;
    } else {
      map.set(key, { agentName: key, requests: 1, tokens: 0, cost: Number(row.cost) || 0 });
    }
  }
  return Array.from(map.values());
}

async function fetchUsers(days: string): Promise<UserMetric[]> {
  const res = await fetch(`/api/kraken/metrics/users?days=${days}`);
  if (!res.ok) throw new Error("Falha ao carregar métricas de usuários");
  return res.json();
}

async function fetchAgentMetrics(days: string): Promise<AgentMetric[]> {
  const res = await fetch(`/api/kraken/metrics/agents?days=${days}`);
  if (!res.ok) throw new Error("Falha ao carregar métricas de agentes");
  return res.json();
}

const PERIODS: { value: Period; label: string }[] = [
  { value: "7", label: "7 dias" },
  { value: "30", label: "30 dias" },
  { value: "90", label: "90 dias" },
];

export default function MetricsDashboardTab() {
  const [period, setPeriod] = useState<Period>("30");

  const {
    data: costs,
    isLoading: costsLoading,
    error: costsError,
  } = useQuery({
    queryKey: ["kraken-metrics-costs", period],
    queryFn: () => fetchCosts(period),
  });

  const {
    data: users,
    isLoading: usersLoading,
    error: usersError,
  } = useQuery({
    queryKey: ["kraken-metrics-users", period],
    queryFn: () => fetchUsers(period),
  });

  const {
    data: _agentMetrics,
    isLoading: _agentsLoading,
    error: agentsError,
  } = useQuery({
    queryKey: ["kraken-metrics-agents", period],
    queryFn: () => fetchAgentMetrics(period),
  });

  const error = costsError || usersError || agentsError;

  if (error) {
    return (
      <Card className="rounded-2xl border-2 border-red-500/30 bg-[#010d26] shadow-lg">
        <CardContent className="flex items-center gap-2 p-6 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Erro: {(error as Error).message}</span>
        </CardContent>
      </Card>
    );
  }

  const totalCost = costs?.reduce((sum, c) => sum + c.cost, 0) ?? 0;
  const totalRequests = costs?.reduce((sum, c) => sum + c.requests, 0) ?? 0;
  const totalTokens = costs?.reduce((sum, c) => sum + c.tokens, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Dashboard de Métricas
          </h2>
          <p className="text-sm text-white/50">
            Acompanhe custos e uso do Kraken
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              onClick={() => setPeriod(p.value)}
              className={
                period === p.value
                  ? "bg-[#0126fb] text-white hover:bg-[#0126fb]/80"
                  : "border-2 border-white/30 bg-transparent text-white/60 hover:text-white hover:bg-white/10"
              }
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Custo Total
            </CardTitle>
            <DollarSign className="h-4 w-4 text-[#0126fb]" />
          </CardHeader>
          <CardContent>
            {costsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">
                {totalCost.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "USD",
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Total de Requisições
            </CardTitle>
            <Bot className="h-4 w-4 text-[#0126fb]" />
          </CardHeader>
          <CardContent>
            {costsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">
                {totalRequests.toLocaleString("pt-BR")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Total de Tokens
            </CardTitle>
            <Users className="h-4 w-4 text-[#0126fb]" />
          </CardHeader>
          <CardContent>
            {costsLoading ? (
              <Skeleton className="h-8 w-24 bg-white/10" />
            ) : (
              <div className="text-2xl font-bold text-white">
                {totalTokens.toLocaleString("pt-BR")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Agent Costs */}
      <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bot className="h-5 w-5 text-[#0126fb]" />
            Custo por Agente
          </CardTitle>
          <CardDescription className="text-white/50">
            Detalhamento de custos por agente nos últimos {period} dias
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {costsLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/10" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">
                    Agente
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-right">
                    Requisições
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-right">
                    Tokens
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-right">
                    Custo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs && costs.length > 0 ? (
                  costs.map((item) => (
                    <TableRow
                      key={item.agentName}
                      className="border-b border-white/10 text-white hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white">
                        {item.agentName}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {item.requests.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {item.tokens.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {item.cost.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={4}
                      className="text-center text-white/40"
                    >
                      Nenhum dado disponível
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Top Users */}
      <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Users className="h-5 w-5 text-[#0126fb]" />
            Top Usuários
          </CardTitle>
          <CardDescription className="text-white/50">
            Usuários com mais interações nos últimos {period} dias
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full bg-white/10" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">
                    Usuário
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-right">
                    Requisições
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-right">
                    Tokens
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow
                      key={user.userName}
                      className="border-b border-white/10 text-white hover:bg-white/5"
                    >
                      <TableCell className="font-medium text-white">
                        {user.userName}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {user.requests.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right text-white">
                        {user.tokens.toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      colSpan={3}
                      className="text-center text-white/40"
                    >
                      Nenhum dado disponível
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
