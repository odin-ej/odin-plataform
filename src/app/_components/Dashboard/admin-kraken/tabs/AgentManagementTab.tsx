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
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, AlertCircle } from "lucide-react";

interface Agent {
  id: string;
  displayName: string;
  mythology: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  color: string;
  isActive: boolean;
  requiresRag: boolean;
  ragScope: string;
}

type AgentFormData = Omit<Agent, "id" | "isActive">;

const MODELS = [
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
];

const defaultFormData: AgentFormData = {
  displayName: "",
  mythology: "",
  model: "claude-haiku-4-5-20251001",
  maxTokens: 4096,
  systemPrompt: "",
  color: "#6366f1",
  requiresRag: false,
  ragScope: "",
};

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch("/api/kraken/agents");
  if (!res.ok) throw new Error("Falha ao carregar agentes");
  return res.json();
}

export default function AgentManagementTab() {
  const queryClient = useQueryClient();
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState<AgentFormData>(defaultFormData);

  const {
    data: agents,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["kraken-agents"],
    queryFn: fetchAgents,
  });

  const toggleMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch(`/api/kraken/agents/${agentId}/toggle`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Falha ao alternar agente");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kraken-agents"] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: AgentFormData;
    }) => {
      const res = await fetch(`/api/kraken/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao salvar agente");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kraken-agents"] });
      setEditingAgent(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: AgentFormData) => {
      const res = await fetch("/api/kraken/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao criar agente");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kraken-agents"] });
      setIsCreateOpen(false);
      setFormData(defaultFormData);
    },
  });

  function openEditDialog(agent: Agent) {
    setFormData({
      displayName: agent.displayName,
      mythology: agent.mythology,
      model: agent.model,
      maxTokens: agent.maxTokens,
      systemPrompt: agent.systemPrompt,
      color: agent.color,
      requiresRag: agent.requiresRag,
      ragScope: agent.ragScope,
    });
    setEditingAgent(agent);
  }

  function openCreateDialog() {
    setFormData(defaultFormData);
    setIsCreateOpen(true);
  }

  function handleSave() {
    if (editingAgent) {
      saveMutation.mutate({ id: editingAgent.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  }

  const isDialogOpen = isCreateOpen || editingAgent !== null;
  const isSaving = saveMutation.isPending || createMutation.isPending;

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>Erro ao carregar agentes: {(error as Error).message}</span>
        </CardContent>
      </Card>
    );
  }

  const agentForm = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName">Nome</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) =>
              setFormData({ ...formData, displayName: e.target.value })
            }
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="mythology">Mitologia</Label>
          <Input
            id="mythology"
            value={formData.mythology}
            onChange={(e) =>
              setFormData({ ...formData, mythology: e.target.value })
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="model">Modelo</Label>
          <Select
            value={formData.model}
            onValueChange={(value) =>
              setFormData({ ...formData, model: value })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxTokens">Max Tokens</Label>
          <Input
            id="maxTokens"
            type="number"
            value={formData.maxTokens}
            onChange={(e) =>
              setFormData({
                ...formData,
                maxTokens: parseInt(e.target.value) || 0,
              })
            }
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="systemPrompt">System Prompt</Label>
        <Textarea
          id="systemPrompt"
          rows={4}
          value={formData.systemPrompt}
          onChange={(e) =>
            setFormData({ ...formData, systemPrompt: e.target.value })
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="color">Cor</Label>
          <div className="flex items-center gap-2">
            <Input
              id="color"
              type="color"
              className="h-10 w-14 p-1"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
            />
            <Input
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="flex-1"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="ragScope">RAG Scope</Label>
          <Input
            id="ragScope"
            value={formData.ragScope}
            onChange={(e) =>
              setFormData({ ...formData, ragScope: e.target.value })
            }
            disabled={!formData.requiresRag}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="requiresRag"
          checked={formData.requiresRag}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, requiresRag: checked })
          }
        />
        <Label htmlFor="requiresRag">Requer RAG</Label>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gerenciamento de Agentes</h2>
          <p className="text-sm text-muted-foreground">
            Adicione, edite e gerencie os agentes do Kraken
          </p>
        </div>
        <Dialog
          open={isDialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsCreateOpen(false);
              setEditingAgent(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingAgent ? "Editar Agente" : "Novo Agente"}
              </DialogTitle>
              <DialogDescription>
                {editingAgent
                  ? "Atualize as configurações do agente"
                  : "Preencha os dados para criar um novo agente"}
              </DialogDescription>
            </DialogHeader>
            {agentForm}
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingAgent(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
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
                  <TableHead className="w-16">Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Mitologia</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead className="w-16">Cor</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents?.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <Switch
                        checked={agent.isActive}
                        onCheckedChange={() =>
                          toggleMutation.mutate(agent.id)
                        }
                        disabled={toggleMutation.isPending}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {agent.displayName}
                    </TableCell>
                    <TableCell>{agent.mythology}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-xs">
                        {agent.model.includes("haiku")
                          ? "Haiku"
                          : "Sonnet"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className="inline-block h-5 w-5 rounded-full border"
                        style={{ backgroundColor: agent.color }}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(agent)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
