"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  Bot,
  BookOpen,
  BarChart3,
  Shield,
  Settings,
} from "lucide-react";
import KrakenOverviewTab from "./tabs/KrakenOverviewTab";
import AgentManagementTab from "./tabs/AgentManagementTab";
import KnowledgeManagementTab from "./tabs/KnowledgeManagementTab";
import MetricsDashboardTab from "./tabs/MetricsDashboardTab";
import RateLimitsTab from "./tabs/RateLimitsTab";
import SettingsTab from "./tabs/SettingsTab";

export default function AdminKrakenContent() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600">
          <Bot className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Kraken IA</h1>
          <p className="text-sm text-muted-foreground">
            Painel de controle do sistema multi-agente
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="agents" className="flex items-center gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">Agentes</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Knowledge</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Métricas</span>
          </TabsTrigger>
          <TabsTrigger value="rate-limits" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Rate Limits</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <KrakenOverviewTab />
        </TabsContent>

        <TabsContent value="agents" className="mt-6">
          <AgentManagementTab />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeManagementTab />
        </TabsContent>

        <TabsContent value="metrics" className="mt-6">
          <MetricsDashboardTab />
        </TabsContent>

        <TabsContent value="rate-limits" className="mt-6">
          <RateLimitsTab />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
