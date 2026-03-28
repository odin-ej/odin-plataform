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
import { Badge } from "@/components/ui/badge";
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
  return res.json();
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
    data: agentMetrics,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery({
    queryKey: ["kraken-metrics-agents", period],
    queryFn: () => fetchAgentMetrics(period),
  });

  const error = costsError || usersError || agentsError;

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

  const totalCost = costs?.reduce((sum, c) => sum + c.cost, 0) ?? 0;
  const totalRequests = costs?.reduce((sum, c) => sum + c.requests, 0) ?? 0;
  const totalTokens = costs?.reduce((sum, c) => sum + c.tokens, 0) ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Dashboard de Métricas</h2>
          <p className="text-sm text-muted-foreground">
            Acompanhe custos e uso do Kraken
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {costsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalCost.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "USD",
                })}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Requisições
            </CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {costsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalRequests.toLocaleString("pt-BR")}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total de Tokens
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {costsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">
                {totalTokens.toLocaleString("pt-BR")}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Agent Costs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            Custo por Agente
          </CardTitle>
          <CardDescription>
            Detalhamento de custos por agente nos últimos {period} dias
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {costsLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead className="text-right">Requisições</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs && costs.length > 0 ? (
                  costs.map((item) => (
                    <TableRow key={item.agentName}>
                      <TableCell className="font-medium">
                        {item.agentName}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.requests.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.tokens.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.cost.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "USD",
                        })}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center text-muted-foreground"
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Top Usuários
          </CardTitle>
          <CardDescription>
            Usuários com mais interações nos últimos {period} dias
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {usersLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead className="text-right">Requisições</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users && users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.userName}>
                      <TableCell className="font-medium">
                        {user.userName}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.requests.toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        {user.tokens.toLocaleString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
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
