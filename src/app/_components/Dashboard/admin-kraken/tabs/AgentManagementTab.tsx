"use client";

import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Plus, Pencil, AlertCircle } from "lucide-react";
import { AgentIcon } from "../../kraken-icons/AgentIcons";

interface Agent {
  id: string;
  displayName: string;
  category: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  color: string;
  iconUrl: string;
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
  category: "",
  model: "claude-haiku-4-5-20251001",
  maxTokens: 4096,
  systemPrompt: "",
  color: "#0126fb",
  iconUrl: "",
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
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const iconInputRef = useRef<HTMLInputElement>(null);
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImgRef = useRef<HTMLImageElement | null>(null);

  function handleFileSelect(file: File) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      setCropSrc(e.target?.result as string);
      setCropScale(1);
      setCropPos({ x: 0, y: 0 });
    };
    reader.readAsDataURL(file);
  }

  const drawCropPreview = useCallback(() => {
    const canvas = cropCanvasRef.current;
    const img = cropImgRef.current;
    if (!canvas || !img || !img.naturalWidth) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    // Match the visual: image is displayed at 256px wide, height auto (aspect ratio)
    const aspect = img.naturalHeight / img.naturalWidth;
    const baseW = size;
    const baseH = size * aspect;

    // The visual uses: left:50%, top:50%, margin:-50% => centers the image
    // Then transform: translate(pos) scale(s) with origin center
    // So the image center is at (128 + posX, 128 + posY) relative to the circle
    // And the displayed size is baseW*scale x baseH*scale

    const drawW = baseW * cropScale;
    const drawH = baseH * cropScale;
    const dx = (size - drawW) / 2 + cropPos.x;
    const dy = (size - drawH) / 2 + cropPos.y;
    ctx.drawImage(img, dx, dy, drawW, drawH);
    ctx.restore();
  }, [cropScale, cropPos]);

  async function handleCropConfirm() {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    drawCropPreview();
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "agent-icon.png", { type: "image/png" });
      await handleIconUpload(file);
      setCropSrc(null);
    }, "image/png");
  }

  async function handleIconUpload(file: File) {
    setIsUploadingIcon(true);
    try {
      // Use s3-chat-upload (knowledge-base bucket) for agent icons
      const presignRes = await fetch("/api/s3-chat-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileType: file.type,
          fileSize: file.size,
        }),
      });
      if (!presignRes.ok) throw new Error("Falha ao gerar URL de upload");
      const { url: presignedUrl, key } = await presignRes.json();
      await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      // Save just the S3 key — the API resolves it to a signed URL on read
      setFormData((prev) => ({ ...prev, iconUrl: key }));
    } catch (err) {
      console.error("Erro ao fazer upload do ícone:", err);
      alert("Erro ao fazer upload da imagem. Tente novamente.");
    } finally {
      setIsUploadingIcon(false);
    }
  }

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
      category: agent.category,
      model: agent.model,
      maxTokens: agent.maxTokens,
      systemPrompt: agent.systemPrompt,
      color: agent.color,
      iconUrl: agent.iconUrl || "",
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
      <div className="flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">
        <AlertCircle className="h-5 w-5" />
        <span>Erro ao carregar agentes: {(error as Error).message}</span>
      </div>
    );
  }

  const agentForm = (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="displayName" className="text-white/80">Nome</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(e) =>
              setFormData({ ...formData, displayName: e.target.value })
            }
            className="border-2 border-white/30 bg-transparent text-white placeholder:text-white/40 focus:border-[#0126fb]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="category" className="text-white/80">Categoria (opcional)</Label>
          <Input
            id="category"
            value={formData.category}
            onChange={(e) =>
              setFormData({ ...formData, category: e.target.value })
            }
            className="border-2 border-white/30 bg-transparent text-white placeholder:text-white/40 focus:border-[#0126fb]"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="model" className="text-white/80">Modelo</Label>
          <Select
            value={formData.model}
            onValueChange={(value) =>
              setFormData({ ...formData, model: value })
            }
          >
            <SelectTrigger className="bg-[#00205e] border-2 border-[#0126fb] text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#00205e] border border-[#0126fb]/30 text-white">
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} className="text-white hover:!bg-[#00205e] hover:!text-[#f5b719] focus:!bg-[#0126fb]/20 focus:!text-white">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="maxTokens" className="text-white/80">Tamanho máximo da resposta</Label>
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
            className="border-2 border-white/30 bg-transparent text-white placeholder:text-white/40 focus:border-[#0126fb]"
          />
          <p className="text-xs text-white/40">
            Controla o tamanho máximo da resposta. 1024 ≈ 2 parágrafos, 4096 ≈ 1 página
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="systemPrompt" className="text-white/80">Instruções do agente (System Prompt)</Label>
        <p className="text-xs text-white/40">
          Defina a personalidade e as regras do agente. Use {'{RAG_CONTEXT}'} onde quiser que os documentos sejam inseridos.
        </p>
        <Textarea
          id="systemPrompt"
          rows={4}
          value={formData.systemPrompt}
          onChange={(e) =>
            setFormData({ ...formData, systemPrompt: e.target.value })
          }
          className="border-2 border-white/30 bg-transparent text-white placeholder:text-white/40 focus:border-[#0126fb] scrollbar-thin"
        />
      </div>

      {/* Icon preview + color */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-center gap-2">
          <Label className="text-white/80">Preview</Label>
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 overflow-hidden"
            style={{
              borderColor: formData.color || "#0126fb",
              backgroundColor: `${formData.color || "#0126fb"}15`,
            }}
          >
            {formData.iconUrl ? (
              <img
                src={formData.iconUrl}
                alt="Ícone"
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <AgentIcon
                agentId={editingAgent?.id || "kraken_router"}
                size={40}
                color={formData.color || "#0126fb"}
              />
            )}
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="color" className="text-white/80">Cor do agente</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  className="h-10 w-14 p-1 border-2 border-white/30 bg-transparent"
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
                  className="flex-1 border-2 border-white/30 bg-transparent text-white focus:border-[#0126fb]"
                />
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-white/80">Imagem do agente</Label>
              <input
                ref={iconInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <div className="flex items-center gap-3">
                {formData.iconUrl && (
                  <img
                    src={formData.iconUrl}
                    alt="Ícone atual"
                    className="h-12 w-12 rounded-full object-cover border-2 border-[#0126fb]/40"
                  />
                )}
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => iconInputRef.current?.click()}
                    disabled={isUploadingIcon}
                    className="border-2 border-[#f5b719] hover:bg-[#f5b719]/10 hover:text-[#f5b719] h-7 text-xs"
                  >
                    {isUploadingIcon ? "Enviando..." : formData.iconUrl ? "Trocar" : "Enviar imagem"}
                  </Button>
                  {formData.iconUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, iconUrl: "" })}
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300 h-7 text-xs"
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-white/40">
                Envie PNG/JPG. A imagem será recortada em círculo. Se vazio, usa ícone SVG.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="ragScope" className="text-white/80">Fontes de conhecimento</Label>
          <Input
            id="ragScope"
            value={formData.ragScope}
            onChange={(e) =>
              setFormData({ ...formData, ragScope: e.target.value })
            }
            disabled={!formData.requiresRag}
            placeholder="ex: drive, manual, politicas"
            className="border-2 border-white/30 bg-transparent text-white placeholder:text-white/40 focus:border-[#0126fb] disabled:opacity-30"
          />
          <p className="text-xs text-white/40">
            Separe por vírgula os tipos de documentos que este agente pode consultar (ex: drive, manual, politicas, onboarding)
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Switch
            id="requiresRag"
            checked={formData.requiresRag}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, requiresRag: checked })
            }
          />
          <Label htmlFor="requiresRag" className="text-white/80">Consulta documentos da empresa</Label>
        </div>
        <p className="text-xs text-white/40 ml-11">
          Ative se este agente precisa buscar informações em documentos enviados ao Knowledge Base (ex: políticas, manuais, processos). Quando ativado, preencha as fontes acima.
        </p>
      </div>
    </div>
  );

  const cropModal = cropSrc && (
    <Dialog open onOpenChange={() => setCropSrc(null)}>
      <DialogContent className="flex flex-col items-center bg-[#010d26] border-2 border-[#0126fb]/30 text-white sm:max-w-[420px] p-6 gap-5">
        <DialogHeader>
          <DialogTitle className="text-white text-center">Recortar imagem</DialogTitle>
          <DialogDescription className="text-white/50 text-center">
            Ajuste o zoom e arraste para posicionar
          </DialogDescription>
        </DialogHeader>
        <div
          className="relative h-[256px] w-[256px] overflow-hidden rounded-full border-2 border-[#0126fb] cursor-grab active:cursor-grabbing bg-black/40"
          onMouseDown={(e) => {
            setIsDragging(true);
            setDragStart({ x: e.clientX - cropPos.x, y: e.clientY - cropPos.y });
          }}
          onMouseMove={(e) => {
            if (!isDragging) return;
            setCropPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={(e) => {
            const t = e.touches[0];
            setIsDragging(true);
            setDragStart({ x: t.clientX - cropPos.x, y: t.clientY - cropPos.y });
          }}
          onTouchMove={(e) => {
            if (!isDragging) return;
            const t = e.touches[0];
            setCropPos({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
          }}
          onTouchEnd={() => setIsDragging(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={(el) => { cropImgRef.current = el; }}
            src={cropSrc}
            alt="Crop"
            draggable={false}
            className="pointer-events-none absolute select-none"
            style={{
              transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})`,
              transformOrigin: "center center",
              left: "50%",
              top: "50%",
              marginLeft: "-50%",
              marginTop: "-50%",
              maxWidth: "none",
              width: "256px",
              height: "auto",
            }}
          />
        </div>
        <canvas ref={cropCanvasRef} className="hidden" />
        <div className="flex items-center gap-3 w-full">
          <span className="text-xs text-white/50">−</span>
          <input
            type="range"
            min="0.3"
            max="3"
            step="0.05"
            value={cropScale}
            onChange={(e) => setCropScale(parseFloat(e.target.value))}
            className="flex-1 accent-[#0126fb]"
          />
          <span className="text-xs text-white/50">+</span>
        </div>
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            onClick={() => setCropSrc(null)}
            className="flex-1 border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCropConfirm}
            disabled={isUploadingIcon}
            className="flex-1 bg-[#0126fb] text-white hover:bg-[#0126fb]/80"
          >
            {isUploadingIcon ? "Enviando..." : "Confirmar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="flex flex-col gap-6">
      {cropModal}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Gerenciamento de Agentes</h2>
          <p className="text-sm text-white/50">
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
            <Button onClick={openCreateDialog} className="bg-[#0126fb] text-white hover:bg-[#0126fb]/80">
              <Plus className="mr-2 h-4 w-4" />
              Novo Agente
            </Button>
          </DialogTrigger>
          <DialogContent className="flex max-w-2xl flex-col bg-[#010d26] border-2 border-[#0126fb]/30 text-white sm:max-w-[700px] max-h-[85vh] p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
              <DialogTitle className="text-white text-lg">
                {editingAgent ? "Editar Agente" : "Novo Agente"}
              </DialogTitle>
              <DialogDescription className="text-white/50">
                {editingAgent
                  ? "Atualize as configurações do agente"
                  : "Preencha os dados para criar um novo agente"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(1,38,251,0.4) transparent' }}>
              {agentForm}
            </div>
            <DialogFooter className="px-6 py-4 border-t border-white/10 shrink-0 flex gap-3 sm:gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingAgent(null);
                }}
                className="border-2 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving} className="bg-[#0126fb] text-white hover:bg-[#0126fb]/80 min-w-[100px]">
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
                <TableHead className="w-16 bg-[#00205e] text-[#0126fb] font-semibold">Status</TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">Nome</TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">Categoria (opcional)</TableHead>
                <TableHead className="bg-[#00205e] text-[#0126fb] font-semibold">Modelo</TableHead>
                <TableHead className="w-16 bg-[#00205e] text-[#0126fb] font-semibold">Cor</TableHead>
                <TableHead className="w-24 bg-[#00205e] text-[#0126fb] font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents?.map((agent) => (
                <TableRow key={agent.id} className="border-b border-white/10 hover:bg-white/5">
                  <TableCell>
                    <Switch
                      checked={agent.isActive}
                      onCheckedChange={() =>
                        toggleMutation.mutate(agent.id)
                      }
                      disabled={toggleMutation.isPending}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-white">
                    <div className="flex items-center gap-2">
                      {agent.iconUrl ? (
                        <img src={agent.iconUrl} alt={agent.displayName} className="h-6 w-6 rounded-full object-cover border border-white/20" />
                      ) : (
                        <AgentIcon agentId={agent.id} size={24} color={agent.color || "#0126fb"} />
                      )}
                      {agent.displayName}
                    </div>
                  </TableCell>
                  <TableCell className="text-white/70">{agent.category || "—"}</TableCell>
                  <TableCell>
                    <span className="inline-flex rounded-full border border-[#f5b719]/30 bg-[#f5b719]/10 px-2.5 py-0.5 text-xs font-mono text-[#f5b719]">
                      {agent.model.includes("haiku")
                        ? "Haiku"
                        : "Sonnet"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className="inline-block h-5 w-5 rounded-full border border-white/20"
                      style={{ backgroundColor: agent.color }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(agent)}
                      className="text-[#f5b719] hover:bg-[#f5b719]/10 hover:text-[#f5b719]"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
