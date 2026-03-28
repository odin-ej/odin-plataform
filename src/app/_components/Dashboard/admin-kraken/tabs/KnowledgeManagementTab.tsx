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
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  AlertCircle,
  Trash2,
  Upload,
  FileText,
  BookOpen,
} from "lucide-react";

interface KnowledgeSource {
  id: string;
  sourceName: string;
  sourceType: string;
  chunks: number;
  createdAt: string;
}

interface DocEntry {
  id: string;
  featureName: string;
  category: string;
  lastSynced: string;
}

interface Agent {
  id: string;
  displayName: string;
}

async function fetchSources(): Promise<KnowledgeSource[]> {
  const res = await fetch("/api/kraken/knowledge/ingest");
  if (!res.ok) throw new Error("Falha ao carregar documentos");
  return res.json();
}

async function fetchDocs(): Promise<DocEntry[]> {
  const res = await fetch("/api/kraken/knowledge/docs/generate");
  if (!res.ok) throw new Error("Falha ao carregar documentação");
  return res.json();
}

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch("/api/kraken/agents");
  if (!res.ok) throw new Error("Falha ao carregar agentes");
  return res.json();
}

export default function KnowledgeManagementTab() {
  const queryClient = useQueryClient();
  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] = useState("text");
  const [content, setContent] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const {
    data: sources,
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useQuery({
    queryKey: ["kraken-knowledge-sources"],
    queryFn: fetchSources,
  });

  const {
    data: docs,
    isLoading: docsLoading,
    error: docsError,
  } = useQuery({
    queryKey: ["kraken-knowledge-docs"],
    queryFn: fetchDocs,
  });

  const { data: agents } = useQuery({
    queryKey: ["kraken-agents"],
    queryFn: fetchAgents,
  });

  const deleteMutation = useMutation({
    mutationFn: async (sourceId: string) => {
      const res = await fetch("/api/kraken/knowledge/ingest", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sourceId }),
      });
      if (!res.ok) throw new Error("Falha ao deletar documento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["kraken-knowledge-sources"],
      });
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: {
      sourceName: string;
      sourceType: string;
      content: string;
      agentScope: string[];
    }) => {
      const res = await fetch("/api/kraken/knowledge/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Falha ao enviar documento");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["kraken-knowledge-sources"],
      });
      setSourceName("");
      setContent("");
      setSelectedAgents([]);
    },
  });

  function handleUpload() {
    if (!sourceName.trim() || !content.trim()) return;
    uploadMutation.mutate({
      sourceName,
      sourceType,
      content,
      agentScope: selectedAgents,
    });
  }

  function toggleAgent(agentId: string) {
    setSelectedAgents((prev) =>
      prev.includes(agentId)
        ? prev.filter((id) => id !== agentId)
        : [...prev, agentId]
    );
  }

  const error = sourcesError || docsError;

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
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Adicionar Conteúdo
          </CardTitle>
          <CardDescription>
            Cole o conteúdo de texto para ingerir na base de conhecimento
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sourceName">Nome da Fonte</Label>
              <Input
                id="sourceName"
                placeholder="Ex: Manual do produto"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="sourceType">Tipo da Fonte</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Texto</SelectItem>
                  <SelectItem value="markdown">Markdown</SelectItem>
                  <SelectItem value="html">HTML</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="content">Conteúdo</Label>
            <Textarea
              id="content"
              rows={6}
              placeholder="Cole o conteúdo aqui..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {agents && agents.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Escopo de Agentes</Label>
              <div className="flex flex-wrap gap-3">
                {agents.map((agent) => (
                  <div key={agent.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`agent-${agent.id}`}
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={() => toggleAgent(agent.id)}
                    />
                    <Label
                      htmlFor={`agent-${agent.id}`}
                      className="text-sm font-normal"
                    >
                      {agent.displayName}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={
              uploadMutation.isPending || !sourceName.trim() || !content.trim()
            }
            className="w-fit"
          >
            {uploadMutation.isPending ? "Enviando..." : "Enviar Conteúdo"}
          </Button>
        </CardContent>
      </Card>

      {/* Documents Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documentos
          </CardTitle>
          <CardDescription>
            Fontes de conhecimento ingeridas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sourcesLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Fonte</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Chunks</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="w-20">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sources && sources.length > 0 ? (
                  sources.map((source) => (
                    <TableRow key={source.id}>
                      <TableCell className="font-medium">
                        {source.sourceName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{source.sourceType}</Badge>
                      </TableCell>
                      <TableCell>{source.chunks}</TableCell>
                      <TableCell>
                        {new Date(source.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(source.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground"
                    >
                      Nenhum documento encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Odin Docs Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Documentação do Odin
            </CardTitle>
            <CardDescription>
              Documentação gerada automaticamente das funcionalidades
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() =>
              alert(
                "Execute o comando CLI:\nnpx kraken docs:generate\n\npara gerar a documentação automaticamente."
              )
            }
          >
            Gerar Documentação
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {docsLoading ? (
            <div className="flex flex-col gap-3 p-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionalidade</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Última Sincronização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docs && docs.length > 0 ? (
                  docs.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        {doc.featureName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{doc.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(doc.lastSynced).toLocaleDateString("pt-BR")}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center text-muted-foreground"
                    >
                      Nenhuma documentação gerada ainda
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
