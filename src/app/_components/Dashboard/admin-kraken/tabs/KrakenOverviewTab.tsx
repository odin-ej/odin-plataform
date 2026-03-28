"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, DollarSign, Database, Bot, AlertCircle } from "lucide-react";
import KrakenVisualization from "../KrakenVisualization";

interface KrakenMetrics {
  requestsToday: number;
  costToday: number;
  cacheHitRate: number;
  activeAgents: number;
}

interface KrakenAgent {
  id: string;
  displayName: string;
  mythology: string;
  model: string;
  color: string;
  isActive: boolean;
}

async function fetchMetrics(): Promise<KrakenMetrics> {
  const res = await fetch("/api/kraken/metrics");
  if (!res.ok) throw new Error("Falha ao carregar métricas");
  return res.json();
}

async function fetchAgents(): Promise<KrakenAgent[]> {
  const res = await fetch("/api/kraken/agents");
  if (!res.ok) throw new Error("Falha ao carregar agentes");
  return res.json();
}

export default function KrakenOverviewTab() {
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: ["kraken-metrics"],
    queryFn: fetchMetrics,
  });

  const {
    data: agents,
    isLoading: agentsLoading,
    error: agentsError,
  } = useQuery({
    queryKey: ["kraken-agents"],
    queryFn: fetchAgents,
  });

  const error = metricsError || agentsError;

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Erro ao carregar dados: {(error as Error).message}</span>
        </CardContent>
      </Card>
    );
  }

  const statCards = [
    {
      title: "Requisições Hoje",
      value: metrics?.requestsToday ?? 0,
      icon: Activity,
      format: (v: number) => v.toLocaleString("pt-BR"),
    },
    {
      title: "Custo Hoje",
      value: metrics?.costToday ?? 0,
      icon: DollarSign,
      format: (v: number) =>
        v.toLocaleString("pt-BR", { style: "currency", currency: "USD" }),
    },
    {
      title: "Taxa de Cache Hit",
      value: metrics?.cacheHitRate ?? 0,
      icon: Database,
      format: (v: number) => `${(v * 100).toFixed(1)}%`,
    },
    {
      title: "Agentes Ativos",
      value: metrics?.activeAgents ?? 0,
      icon: Bot,
      format: (v: number) => v.toString(),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <KrakenVisualization
        agents={agents ?? []}
        activeAgent={null}
        stats={{
          requestsToday: metrics?.totalMessagesToday ?? 0,
          costToday: metrics?.totalCostToday ?? 0,
        }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {metricsLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">
                  {stat.format(stat.value)}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agentes Registrados</CardTitle>
          <CardDescription>
            Visão rápida de todos os agentes do Kraken
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {agents?.map((agent) => (
                <Badge
                  key={agent.id}
                  variant={agent.isActive ? "default" : "secondary"}
                  className="flex items-center gap-2 px-3 py-1.5"
                >
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: agent.color }}
                  />
                  {agent.displayName}
                  {!agent.isActive && (
                    <span className="text-xs opacity-60">(inativo)</span>
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
