"use client";

import { useState, useRef } from "react";
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
  HelpCircle,
  BookOpen,
  X,
  CheckCircle2,
  Info,
  FolderSync,
  RefreshCw,
  Unplug,
  HardDrive,
} from "lucide-react";

interface KnowledgeSource {
  id: string;
  sourceName: string;
  sourceType: string;
  chunks: number;
  createdAt: string;
}

interface Agent {
  id: string;
  displayName: string;
}

interface DriveConnection {
  folderId: string;
  folderName: string;
  agentScope: string[];
  connectedAt: string;
  lastSyncAt: string | null;
  fileCount: number;
  chunkCount: number;
}

interface DriveData {
  connections: DriveConnection[];
  serviceAccountEmail: string | null;
}

/* ── Tip box for explaining things to non-experts ── */
function TipBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[#0126fb]/20 bg-[#0126fb]/5 px-4 py-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0126fb]" />
      <p className="text-sm leading-relaxed text-white/60">{children}</p>
    </div>
  );
}

/* ── Friendly source-type map ── */
const SOURCE_CATEGORIES: Record<string, { label: string; description: string }> = {
  politica: { label: "Politica / Regulamento", description: "Estatutos, normas, politica interna" },
  manual: { label: "Manual / Tutorial", description: "Guias de uso, passo a passo, procedimentos" },
  estrategia: { label: "Estrategia", description: "OKRs, metas, planejamento, newsletters" },
  processo: { label: "Processo / Fluxo", description: "Workflows, checklists, etapas de trabalho" },
  reuniao: { label: "Ata / Reuniao", description: "Atas, decisoes, anotacoes de reunioes" },
  outro: { label: "Outro", description: "Qualquer outro tipo de documento" },
};

/* ── Paginated Documents Table ── */
const DOCS_PER_PAGE = 15;

function DocumentsTable({
  sources,
  isLoading,
  onDelete,
  isDeleting,
}: {
  sources: KnowledgeSource[];
  isLoading: boolean;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filter
  const filtered = sources.filter((s) => {
    const matchesSearch = !search || s.sourceName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === "all" || s.sourceType === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / DOCS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * DOCS_PER_PAGE, safePage * DOCS_PER_PAGE);

  // Unique categories for filter
  const categories = Array.from(new Set(sources.map((s) => s.sourceType)));

  return (
    <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-white">
              <FileText className="h-5 w-5 text-[#0126fb]" />
              Documentos na base ({sources.length})
            </CardTitle>
            <CardDescription className="text-white/50">
              Todos os documentos que os agentes podem consultar
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[140px] bg-[#00205e] border border-[#0126fb]/30 text-white text-xs">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-[#00205e] border border-[#0126fb]/30 text-white">
                <SelectItem value="all" className="focus:bg-[#0126fb]/20 focus:text-white">Todas</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat} className="focus:bg-[#0126fb]/20 focus:text-white">
                    {SOURCE_CATEGORIES[cat]?.label ?? cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Search */}
            <div className="relative">
              <Input
                placeholder="Buscar documento..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-[200px] bg-transparent border border-white/20 text-white text-xs placeholder:text-white/30 focus:border-[#0126fb] pl-8"
              />
              <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-white/30" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="flex flex-col gap-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full bg-white/10" />
            ))}
          </div>
        ) : paged.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">Documento</TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">Categoria</TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-center">Pedacos</TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">Adicionado em</TableHead>
                  <TableHead className="w-16 bg-[#00205e] text-[#0126fb] text-xs uppercase text-center">Remover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.map((source) => (
                  <TableRow key={source.id} className="border-b border-white/10 text-white hover:bg-white/5">
                    <TableCell className="font-medium text-white max-w-[300px] truncate" title={source.sourceName}>
                      {source.sourceName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[#f5b719]/30 text-[#f5b719]">
                        {SOURCE_CATEGORIES[source.sourceType]?.label ?? source.sourceType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-white/60">{source.chunks ?? "—"}</TableCell>
                    <TableCell className="text-white/60">{new Date(source.createdAt).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDelete(source.id)}
                        disabled={isDeleting}
                        className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-white/10 px-4 py-3">
                <span className="text-xs text-white/40">
                  {filtered.length} documento{filtered.length !== 1 ? "s" : ""}
                  {search && ` (filtrado de ${sources.length})`}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage(safePage - 1)}
                    className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    ←
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="px-1 text-white/30">...</span>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPage(p)}
                          className={`h-8 w-8 text-xs ${
                            p === safePage
                              ? "bg-[#0126fb] text-white hover:bg-[#0126fb]/80"
                              : "text-white/60 hover:text-white hover:bg-white/10"
                          }`}
                        >
                          {p}
                        </Button>
                      </span>
                    ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage(safePage + 1)}
                    className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/10"
                  >
                    →
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <FileText className="h-10 w-10 text-white/15" />
            <div>
              <p className="text-sm font-medium text-white/40">
                {search ? "Nenhum documento encontrado" : "Nenhum documento na base ainda"}
              </p>
              <p className="text-xs text-white/25">
                {search ? "Tente um termo diferente" : "Use o formulario acima para adicionar"}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function fetchSources(): Promise<KnowledgeSource[]> {
  const res = await fetch("/api/kraken/knowledge/ingest");
  if (!res.ok) throw new Error("Falha ao carregar documentos");
  return res.json();
}

async function fetchAgents(): Promise<Agent[]> {
  const res = await fetch("/api/kraken/agents");
  if (!res.ok) throw new Error("Falha ao carregar agentes");
  return res.json();
}

async function fetchDriveConnections(): Promise<DriveData> {
  const res = await fetch("/api/kraken/knowledge/drive");
  if (!res.ok) throw new Error("Falha ao carregar conexões Drive");
  return res.json();
}

export default function KnowledgeManagementTab() {
  const queryClient = useQueryClient();
  const [sourceName, setSourceName] = useState("");
  const [sourceCategory, setSourceCategory] = useState("manual");
  const [content, setContent] = useState("");
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drive state
  const [driveFolderInput, setDriveFolderInput] = useState("");
  const [driveFolderName, setDriveFolderName] = useState("");
  const [driveAgents, setDriveAgents] = useState<string[]>([]);
  const [syncingFolderId, setSyncingFolderId] = useState<string | null>(null);

  async function handleFileSelect(file: File) {
    setUploadedFile(file);
    setIsReadingFile(true);

    if (!sourceName) {
      setSourceName(file.name.replace(/\.[^.]+$/, ""));
    }

    try {
      const text = await file.text();
      setContent(text);
    } catch {
      setContent(`[Arquivo: ${file.name} — ${(file.size / 1024).toFixed(1)}KB]`);
    }
    setIsReadingFile(false);
  }

  function removeFile() {
    setUploadedFile(null);
    setContent("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const {
    data: sources,
    isLoading: sourcesLoading,
    error: sourcesError,
  } = useQuery({
    queryKey: ["kraken-knowledge-sources"],
    queryFn: fetchSources,
  });

  const { data: agents } = useQuery({
    queryKey: ["kraken-agents"],
    queryFn: fetchAgents,
  });

  const {
    data: driveData,
    isLoading: driveLoading,
  } = useQuery({
    queryKey: ["kraken-drive-connections"],
    queryFn: fetchDriveConnections,
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
      queryClient.invalidateQueries({ queryKey: ["kraken-knowledge-sources"] });
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
      queryClient.invalidateQueries({ queryKey: ["kraken-knowledge-sources"] });
      setSourceName("");
      setContent("");
      setSelectedAgents([]);
      setUploadedFile(null);
    },
  });

  // Drive mutations
  const connectDriveMutation = useMutation({
    mutationFn: async (data: { folderId: string; folderName?: string; agentScope: string[] }) => {
      const res = await fetch("/api/kraken/knowledge/drive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Falha ao conectar pasta");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kraken-drive-connections"] });
      queryClient.invalidateQueries({ queryKey: ["kraken-knowledge-sources"] });
      setDriveFolderInput("");
      setDriveFolderName("");
      setDriveAgents([]);
    },
  });

  const disconnectDriveMutation = useMutation({
    mutationFn: async (folderId: string) => {
      const res = await fetch("/api/kraken/knowledge/drive", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) throw new Error("Falha ao desconectar pasta");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kraken-drive-connections"] });
      queryClient.invalidateQueries({ queryKey: ["kraken-knowledge-sources"] });
    },
  });

  const syncDriveMutation = useMutation({
    mutationFn: async (folderId: string) => {
      setSyncingFolderId(folderId);
      const res = await fetch("/api/kraken/knowledge/drive/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId }),
      });
      if (!res.ok) throw new Error("Falha ao sincronizar");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kraken-drive-connections"] });
      queryClient.invalidateQueries({ queryKey: ["kraken-knowledge-sources"] });
      setSyncingFolderId(null);
    },
    onError: () => {
      setSyncingFolderId(null);
    },
  });

  function handleUpload() {
    if (!sourceName.trim() || !content.trim()) return;
    uploadMutation.mutate({
      sourceName,
      sourceType: sourceCategory,
      content,
      agentScope: selectedAgents.length > 0 ? selectedAgents : (agents?.map(a => a.id) ?? []),
    });
  }

  function toggleAgent(agentId: string) {
    setSelectedAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  }

  function toggleDriveAgent(agentId: string) {
    setDriveAgents((prev) =>
      prev.includes(agentId) ? prev.filter((id) => id !== agentId) : [...prev, agentId]
    );
  }

  function handleConnectDrive() {
    if (!driveFolderInput.trim() || driveAgents.length === 0) return;
    connectDriveMutation.mutate({
      folderId: driveFolderInput.trim(),
      folderName: driveFolderName.trim() || undefined,
      agentScope: driveAgents,
    });
  }

  if (sourcesError) {
    return (
      <Card className="rounded-2xl border-2 border-red-500/30 bg-[#010d26] shadow-lg">
        <CardContent className="flex items-center gap-2 p-6 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span>Erro: {(sourcesError as Error).message}</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Explanation banner ── */}
      <div className="rounded-2xl border-2 border-[#0126fb]/20 bg-[#010d26] p-5">
        <div className="flex items-start gap-3">
          <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-[#0126fb]" />
          <div>
            <h3 className="text-sm font-semibold text-white">O que e a Base de Conhecimento?</h3>
            <p className="mt-1 text-sm leading-relaxed text-white/50">
              Aqui voce alimenta os agentes do Kraken com informacoes da empresa.
              Quando alguem faz uma pergunta no chat, os agentes consultam esses documentos
              para dar respostas precisas.{" "}
              <span className="text-[#f5b719]">Quanto mais documentos relevantes, melhores as respostas.</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Upload Section ── */}
      <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Upload className="h-5 w-5 text-[#0126fb]" />
            Enviar novo documento
          </CardTitle>
          <CardDescription className="text-white/50">
            Envie um arquivo ou cole o texto diretamente. O Kraken vai processar
            e disponibilizar para os agentes consultarem.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">

          {/* Row 1: Name + Category */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="sourceName" className="text-white/80">
                Nome do documento
              </Label>
              <Input
                id="sourceName"
                placeholder="Ex: Manual de Vendas, Estatuto EJ, OKRs 2026..."
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                className="bg-transparent border-2 border-white/30 text-white placeholder:text-white/30 focus:border-[#0126fb]"
              />
              <span className="text-xs text-white/30">
                De um nome que facilite identificar o documento depois
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-white/80">Categoria</Label>
              <Select value={sourceCategory} onValueChange={setSourceCategory}>
                <SelectTrigger className="bg-[#00205e] border-2 border-[#0126fb] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#00205e] border border-[#0126fb]/30 text-white">
                  {Object.entries(SOURCE_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key} className="focus:bg-[#0126fb]/20 focus:text-white">
                      <div className="flex flex-col">
                        <span>{cat.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-xs text-white/30">
                Ajuda a organizar os documentos por tipo
              </span>
            </div>
          </div>

          {/* Row 2: File upload */}
          <div className="flex flex-col gap-2">
            <Label className="text-white/80">Arquivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,.doc,.docx,.xlsx"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
                e.target.value = "";
              }}
              className="hidden"
            />

            {uploadedFile ? (
              <div className="flex items-center justify-between rounded-xl border-2 border-[#0126fb]/30 bg-[#0126fb]/5 px-4 py-3">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400" />
                  <div>
                    <p className="text-sm font-medium text-white">{uploadedFile.name}</p>
                    <p className="text-xs text-white/40">
                      {(uploadedFile.size / 1024).toFixed(1)} KB — conteudo extraido automaticamente
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="text-white/40 hover:text-red-400 hover:bg-red-500/10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelect(file);
                }}
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-white/20 bg-white/5 px-4 py-6 text-center transition-colors hover:border-[#0126fb]/50 hover:bg-[#0126fb]/5"
              >
                <Upload className="h-6 w-6 text-white/30" />
                <div>
                  <p className="text-sm text-white/50">
                    {isReadingFile ? "Lendo arquivo..." : "Arraste ou clique para enviar"}
                  </p>
                  <p className="text-xs text-white/30">PDF, TXT, Markdown, CSV, Word, Excel</p>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Content textarea */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="content" className="text-white/80">
              {uploadedFile ? "Conteudo (extraido do arquivo — pode editar)" : "Ou cole o texto diretamente"}
            </Label>
            <Textarea
              id="content"
              rows={6}
              placeholder="Cole aqui o texto do documento, politica, manual, ata de reuniao..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="bg-transparent border-2 border-white/30 text-white placeholder:text-white/30 focus:border-[#0126fb] text-sm"
            />
            {content && (
              <span className="text-xs text-white/30">
                {content.length.toLocaleString("pt-BR")} caracteres
              </span>
            )}
          </div>

          {/* Row 4: Agent scope */}
          {agents && agents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-white/80">Quais agentes podem usar este documento?</Label>
                <HelpCircle className="h-3.5 w-3.5 text-white/30" />
              </div>
              <TipBox>
                Selecione quais agentes do Kraken terao acesso a este documento ao responder perguntas.
                Se nenhum for selecionado, <strong className="text-white/80">todos os agentes</strong> poderao consulta-lo.
              </TipBox>
              <div className="flex flex-wrap gap-3">
                {agents.filter(a => a.id !== "kraken_router").map((agent) => (
                  <label
                    key={agent.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                      selectedAgents.includes(agent.id)
                        ? "border-[#0126fb] bg-[#0126fb]/10 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                    }`}
                  >
                    <Checkbox
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={() => toggleAgent(agent.id)}
                      className="border-white/30 data-[state=checked]:bg-[#0126fb] data-[state=checked]:border-[#0126fb]"
                    />
                    {agent.displayName}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending || !sourceName.trim() || !content.trim()}
              className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white px-6"
            >
              {uploadMutation.isPending ? "Processando..." : "Enviar documento"}
            </Button>
            {!sourceName.trim() && !content.trim() && (
              <span className="text-xs text-white/30">
                Preencha o nome e o conteudo para enviar
              </span>
            )}
            {uploadMutation.isSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Documento enviado com sucesso!
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Documents Table with Pagination + Search ── */}
      <DocumentsTable
        sources={sources ?? []}
        isLoading={sourcesLoading}
        onDelete={(id) => deleteMutation.mutate(id)}
        isDeleting={deleteMutation.isPending}
      />

      {/* ── Google Drive Section ── */}
      <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <HardDrive className="h-5 w-5 text-[#0126fb]" />
            Conectar Google Drive
          </CardTitle>
          <CardDescription className="text-white/50">
            Conecte pastas do Google Drive para que os agentes acessem automaticamente
            os documentos da empresa. Os documentos sao sincronizados periodicamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">

          {/* Service account info */}
          {driveData?.serviceAccountEmail && (
            <TipBox>
              Para conectar uma pasta, compartilhe-a com a conta de servico:{" "}
              <strong className="text-white/80 select-all font-mono text-xs">
                {driveData.serviceAccountEmail}
              </strong>
              . Basta adicionar esse email como leitor na pasta do Google Drive.
            </TipBox>
          )}

          {!driveData?.serviceAccountEmail && !driveLoading && (
            <div className="flex items-start gap-3 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
              <p className="text-sm leading-relaxed text-white/60">
                As variaveis de ambiente <code className="text-white/80">GOOGLE_DRIVE_CLIENT_EMAIL</code> e{" "}
                <code className="text-white/80">GOOGLE_DRIVE_PRIVATE_KEY</code> nao estao configuradas.
                Configure-as para habilitar a integracao com o Google Drive.
              </p>
            </div>
          )}

          {/* Connect form */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label className="text-white/80">Link ou ID da pasta</Label>
              <Input
                placeholder="https://drive.google.com/drive/folders/... ou ID da pasta"
                value={driveFolderInput}
                onChange={(e) => setDriveFolderInput(e.target.value)}
                className="bg-transparent border-2 border-white/30 text-white placeholder:text-white/30 focus:border-[#0126fb]"
              />
              <span className="text-xs text-white/30">
                Cole o link da pasta ou apenas o ID
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-white/80">Nome da pasta (opcional)</Label>
              <Input
                placeholder="Ex: Documentos RH, Manuais Tecnicos..."
                value={driveFolderName}
                onChange={(e) => setDriveFolderName(e.target.value)}
                className="bg-transparent border-2 border-white/30 text-white placeholder:text-white/30 focus:border-[#0126fb]"
              />
              <span className="text-xs text-white/30">
                Se nao informado, usa o nome da pasta no Drive
              </span>
            </div>
          </div>

          {/* Drive agent scope */}
          {agents && agents.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-white/80">Quais agentes podem acessar esta pasta?</Label>
                <HelpCircle className="h-3.5 w-3.5 text-white/30" />
              </div>
              <div className="flex flex-wrap gap-3">
                {agents.filter(a => a.id !== "kraken_router").map((agent) => (
                  <label
                    key={agent.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm transition-colors ${
                      driveAgents.includes(agent.id)
                        ? "border-[#0126fb] bg-[#0126fb]/10 text-white"
                        : "border-white/10 bg-white/5 text-white/60 hover:border-white/20"
                    }`}
                  >
                    <Checkbox
                      checked={driveAgents.includes(agent.id)}
                      onCheckedChange={() => toggleDriveAgent(agent.id)}
                      className="border-white/30 data-[state=checked]:bg-[#0126fb] data-[state=checked]:border-[#0126fb]"
                    />
                    {agent.displayName}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Connect button */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              onClick={handleConnectDrive}
              disabled={
                connectDriveMutation.isPending ||
                !driveFolderInput.trim() ||
                driveAgents.length === 0
              }
              className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white px-6"
            >
              <FolderSync className="mr-2 h-4 w-4" />
              {connectDriveMutation.isPending ? "Conectando..." : "Conectar pasta"}
            </Button>
            {!driveFolderInput.trim() && driveAgents.length === 0 && (
              <span className="text-xs text-white/30">
                Informe o link/ID da pasta e selecione ao menos um agente
              </span>
            )}
            {connectDriveMutation.isSuccess && (
              <span className="flex items-center gap-1 text-sm text-green-400">
                <CheckCircle2 className="h-4 w-4" /> Pasta conectada! Sincronizacao em andamento.
              </span>
            )}
            {connectDriveMutation.isError && (
              <span className="flex items-center gap-1 text-sm text-red-400">
                <AlertCircle className="h-4 w-4" /> {(connectDriveMutation.error as Error).message}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Connected Drive Folders Table ── */}
      {(driveData?.connections && driveData.connections.length > 0) && (
        <Card className="rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] text-white shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <FolderSync className="h-5 w-5 text-[#0126fb]" />
              Pastas conectadas ({driveData.connections.length})
            </CardTitle>
            <CardDescription className="text-white/50">
              Pastas do Google Drive sincronizadas com a base de conhecimento
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-white/10 hover:bg-transparent">
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">
                    Pasta
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">
                    Agentes
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-center">
                    Arquivos
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-center">
                    Pedacos
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase">
                    Ultima sinc.
                  </TableHead>
                  <TableHead className="bg-[#00205e] text-[#0126fb] text-xs uppercase text-center">
                    Acoes
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {driveData.connections.map((conn) => (
                  <TableRow
                    key={conn.folderId}
                    className="border-b border-white/10 text-white hover:bg-white/5"
                  >
                    <TableCell className="font-medium text-white">
                      <div className="flex flex-col gap-0.5">
                        <span>{conn.folderName}</span>
                        <span className="text-xs font-mono text-white/30">{conn.folderId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {conn.agentScope.map((agentId) => {
                          const agent = agents?.find(a => a.id === agentId);
                          return (
                            <Badge
                              key={agentId}
                              variant="outline"
                              className="border-[#0126fb]/30 text-[#0126fb] text-xs"
                            >
                              {agent?.displayName ?? agentId}
                            </Badge>
                          );
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-white/60">
                      {conn.fileCount}
                    </TableCell>
                    <TableCell className="text-center text-white/60">
                      {conn.chunkCount}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {conn.lastSyncAt
                        ? new Date(conn.lastSyncAt).toLocaleString("pt-BR")
                        : "Nunca"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => syncDriveMutation.mutate(conn.folderId)}
                          disabled={syncingFolderId === conn.folderId}
                          className="text-[#0126fb] hover:bg-[#0126fb]/10 hover:text-[#0126fb]"
                          title="Sincronizar agora"
                        >
                          <RefreshCw
                            className={`h-4 w-4 ${syncingFolderId === conn.folderId ? "animate-spin" : ""}`}
                          />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => disconnectDriveMutation.mutate(conn.folderId)}
                          disabled={disconnectDriveMutation.isPending}
                          className="text-red-400 hover:bg-red-500/10 hover:text-red-400"
                          title="Desconectar"
                        >
                          <Unplug className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
