"use client";

import { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { createIdeaSchema, CreateIdeaValues } from "@/lib/schemas/basement";
import { createIdea } from "@/lib/actions/basement";
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Target,
  Settings2,
  Trophy,
  Zap,
  Check,
} from "lucide-react";

// ---------- constants ----------

const CATEGORIES = [
  { value: "PROCESSO", label: "Processo", icon: "⚙️", desc: "Fluxos e operacoes" },
  { value: "PRODUTO", label: "Produto", icon: "📦", desc: "Ofertas e servicos" },
  { value: "TECNOLOGIA", label: "Tecnologia", icon: "💻", desc: "Sistemas e ferramentas" },
  { value: "CULTURA", label: "Cultura", icon: "🎨", desc: "Pessoas e ambiente" },
  { value: "OUTRO", label: "Outro", icon: "✨", desc: "Ideias diversas" },
] as const;

const RESOURCE_OPTIONS = [
  "Tempo de equipe",
  "Orcamento",
  "Tecnologia",
  "Parceiros externos",
  "Pouco/Nenhum",
];

const SMART_CONFIG = [
  {
    key: "smartSpecific" as const,
    textKey: "smartSpecificText" as const,
    letter: "S",
    title: "Especifica (Specific)",
    description: "A ideia e bem definida e clara?",
    color: "#0126fb",
  },
  {
    key: "smartMeasurable" as const,
    textKey: "smartMeasurableText" as const,
    letter: "M",
    title: "Mensuravel (Measurable)",
    description: "E possivel medir o impacto?",
    color: "#22c55e",
  },
  {
    key: "smartAchievable" as const,
    textKey: "smartAchievableText" as const,
    letter: "A",
    title: "Atingivel (Achievable)",
    description: "E possivel de ser realizada?",
    color: "#f59e0b",
  },
  {
    key: "smartRelevant" as const,
    textKey: "smartRelevantText" as const,
    letter: "R",
    title: "Relevante (Relevant)",
    description: "E importante para a empresa?",
    color: "#ef4444",
  },
  {
    key: "smartTimeBound" as const,
    textKey: "smartTimeBoundText" as const,
    letter: "T",
    title: "Temporal (Time-bound)",
    description: "Tem um prazo definido?",
    color: "#8b5cf6",
  },
];

const STEPS = [
  { label: "A Ideia", icon: Lightbulb },
  { label: "SMART", icon: Target },
  { label: "Tipagem", icon: Settings2 },
  { label: "Resultado", icon: Trophy },
];

function calculateClusterPreview(total: number) {
  if (total <= 10) return { level: 1, name: "EMBRIONARIA", color: "text-red-400", bg: "bg-red-500/20", hex: "#ef4444" };
  if (total <= 15) return { level: 2, name: "EM DESENVOLVIMENTO", color: "text-orange-400", bg: "bg-orange-500/20", hex: "#f97316" };
  if (total <= 20) return { level: 3, name: "MADURA", color: "text-blue-400", bg: "bg-blue-500/20", hex: "#3b82f6" };
  return { level: 4, name: "PRONTA PARA EXECUCAO", color: "text-[#f5b719]", bg: "bg-[#f5b719]/20", hex: "#f5b719" };
}

function getClusterRecommendation(level: number): string {
  switch (level) {
    case 1:
      return "Sua ideia ainda esta em estagio inicial. Recomendamos refinar os criterios SMART para aumentar a clareza e viabilidade.";
    case 2:
      return "Sua ideia esta em desenvolvimento. Considere detalhar melhor a mensurabilidade e definir prazos mais claros.";
    case 3:
      return "Otimo! Sua ideia esta madura. Revise os ultimos pontos e considere submeter para avaliacao.";
    case 4:
      return "Excelente! Sua ideia esta pronta para execucao. Submeta e engaje a equipe para votacao!";
    default:
      return "";
  }
}

// ---------- sub-components ----------

function ScoreDots({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <div
          key={n}
          className="w-2.5 h-2.5 rounded-full transition-all"
          style={{
            backgroundColor: n <= value ? color : "rgba(255,255,255,0.08)",
            boxShadow: n <= value ? `0 0 6px ${color}40` : "none",
          }}
        />
      ))}
    </div>
  );
}

// ---------- component ----------

interface CreateIdeaWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateIdeaWizard({ open, onOpenChange }: CreateIdeaWizardProps) {
  const [step, setStep] = useState(0);
  const queryClient = useQueryClient();

  const form = useForm<CreateIdeaValues>({
    resolver: zodResolver(createIdeaSchema) as Resolver<CreateIdeaValues>,
    defaultValues: {
      title: "",
      description: "",
      category: "PROCESSO",
      ideaType: "INTERNAL",
      tags: "",
      problemDescription: "",
      targetAudience: "",
      partners: "",
      resources: [],
      smartSpecific: 3,
      smartMeasurable: 3,
      smartAchievable: 3,
      smartRelevant: 3,
      smartTimeBound: 3,
      smartSpecificText: "",
      smartMeasurableText: "",
      smartAchievableText: "",
      smartRelevantText: "",
      smartTimeBoundText: "",
    },
  });

  const { control, watch, handleSubmit, formState: { errors }, trigger } = form;

  const mutation = useMutation({
    mutationFn: createIdea,
    onSuccess: () => {
      toast.success("Ideia registrada no JR Basement!");
      queryClient.invalidateQueries({ queryKey: ["basement-ideas"] });
      queryClient.invalidateQueries({ queryKey: ["basement-my-ideas"] });
      onOpenChange(false);
      setStep(0);
      form.reset();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao registrar ideia.");
    },
  });

  const smartTotal =
    watch("smartSpecific") +
    watch("smartMeasurable") +
    watch("smartAchievable") +
    watch("smartRelevant") +
    watch("smartTimeBound");

  const cluster = calculateClusterPreview(smartTotal);
  const priority = Math.round(((smartTotal - 5) / 20) * 100);

  const canGoNext = async () => {
    if (step === 0) {
      return trigger(["title", "description", "category"]);
    }
    return true;
  };

  const handleNext = async () => {
    const valid = await canGoNext();
    if (valid && step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const onSubmit = (data: CreateIdeaValues) => {
    mutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-none w-[80vw] h-[85vh] flex flex-col overflow-hidden bg-[#010d26] border-[#0126fb]/20 text-white p-0 gap-0">

        {/* ====== HEADER (fixed) ====== */}
        <div className="shrink-0 py-5 px-6 md:px-8 bg-gradient-to-b from-[#0126fb]/8 to-transparent border-b border-white/5">
          {/* Title */}
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#f5b719]/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[#f5b719]" />
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight">Nova Ideia</h2>
          </div>

          {/* Step indicator */}
          <div className="flex items-center">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const isActive = i === step;
              const isComplete = i < step;
              const isFuture = i > step;

              return (
                <div key={i} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all border-2",
                        isActive && "bg-[#f5b719]/20 border-[#f5b719] text-[#f5b719] shadow-[0_0_12px_rgba(245,183,25,0.3)]",
                        isComplete && "bg-[#0126fb] border-[#0126fb] text-white",
                        isFuture && "bg-transparent border-gray-600 text-gray-600",
                      )}
                    >
                      {isComplete ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[10px] font-medium whitespace-nowrap",
                        isActive && "text-[#f5b719]",
                        isComplete && "text-[#0126fb]",
                        isFuture && "text-gray-600",
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {/* connector line */}
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 mx-2 mb-5">
                      <div
                        className={cn(
                          "h-0.5 rounded-full transition-all",
                          i < step ? "bg-[#0126fb]" : "bg-gray-700",
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ====== BODY (scrollable) ====== */}
        <form
          onSubmit={handleSubmit(onSubmit as Parameters<typeof handleSubmit>[0])}
          className="flex flex-col flex-1 min-h-0"
        >
          <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">

            {/* ====== STEP 0: A Ideia ====== */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-bold text-white mb-0.5">A Ideia</p>
                  <p className="text-sm text-gray-400">Descreva sua ideia de forma clara e objetiva.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Titulo da Ideia *</Label>
                  <Controller
                    name="title"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="Ex: Automatizar relatorios semanais"
                        className="h-11 rounded-lg bg-[#00205e]/40 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-[#0126fb]/50"
                      />
                    )}
                  />
                  {errors.title && <p className="text-red-400 text-xs">{errors.title.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Descricao *</Label>
                  <Controller
                    name="description"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Descreva sua ideia em detalhes..."
                        className="min-h-[120px] rounded-lg bg-[#00205e]/40 border-white/10 text-white placeholder:text-gray-500 resize-none focus-visible:ring-[#0126fb]/50"
                      />
                    )}
                  />
                  {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Problema / Oportunidade</Label>
                  <Controller
                    name="problemDescription"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Qual problema essa ideia resolve?"
                        className="min-h-[80px] rounded-lg bg-[#00205e]/40 border-white/10 text-white placeholder:text-gray-500 resize-none focus-visible:ring-[#0126fb]/50"
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Categoria *</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-1">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.value}
                            type="button"
                            onClick={() => field.onChange(cat.value)}
                            className={cn(
                              "flex flex-col items-start gap-1 p-3 rounded-lg border text-left transition-all",
                              field.value === cat.value
                                ? "bg-[#0126fb]/15 border-[#0126fb]/60 ring-1 ring-[#0126fb]/30"
                                : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{cat.icon}</span>
                              <span className={cn(
                                "text-sm font-medium",
                                field.value === cat.value ? "text-[#0126fb]" : "text-white"
                              )}>
                                {cat.label}
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-500">{cat.desc}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Tags (separadas por virgula)</Label>
                  <Controller
                    name="tags"
                    control={control}
                    render={({ field }) => (
                      <Input
                        {...field}
                        placeholder="automacao, relatorio, eficiencia"
                        className="h-11 rounded-lg bg-[#00205e]/40 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-[#0126fb]/50"
                      />
                    )}
                  />
                  <p className="text-[11px] text-gray-500">Use virgulas para separar multiplas tags.</p>
                </div>
              </div>
            )}

            {/* ====== STEP 1: Analise SMART ====== */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-bold text-white mb-0.5">Analise SMART</p>
                  <p className="text-sm text-gray-400">Avalie sua ideia nos 5 criterios. Cada um vai de 1 a 5.</p>
                </div>

                {/* Live score */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-[#f5b719]">{smartTotal}</span>
                    <span className="text-gray-500 text-sm">/25</span>
                  </div>
                  <Badge className={cn("text-xs font-semibold border-0 px-3 py-1", cluster.bg, cluster.color)}>
                    {cluster.name}
                  </Badge>
                </div>

                {/* SMART cards */}
                <div className="space-y-3">
                  {SMART_CONFIG.map((item) => (
                    <div
                      key={item.key}
                      className="rounded-xl bg-white/[0.02] border border-white/10 p-4 relative overflow-hidden"
                    >
                      {/* Colored left border */}
                      <div
                        className="absolute left-0 top-0 bottom-0 w-[3px]"
                        style={{ backgroundColor: item.color }}
                      />

                      <div className="flex items-start gap-3 ml-2">
                        {/* Letter circle */}
                        <div
                          className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ backgroundColor: item.color + "20", color: item.color }}
                        >
                          {item.letter}
                        </div>

                        <div className="flex-1 min-w-0 space-y-3">
                          {/* Title row */}
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-white">{item.title}</p>
                              <p className="text-xs text-gray-500">{item.description}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <ScoreDots value={watch(item.key)} color={item.color} />
                              <span className="text-sm font-bold text-white w-6 text-right">{watch(item.key)}</span>
                            </div>
                          </div>

                          {/* Slider */}
                          <Controller
                            name={item.key}
                            control={control}
                            render={({ field }) => (
                              <div>
                                <input
                                  type="range"
                                  min={1}
                                  max={5}
                                  step={1}
                                  value={field.value}
                                  onChange={(e) => field.onChange(Number(e.target.value))}
                                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/10"
                                  style={{
                                    accentColor: item.color,
                                  }}
                                />
                                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5 px-0.5">
                                  <span>1</span>
                                  <span>2</span>
                                  <span>3</span>
                                  <span>4</span>
                                  <span>5</span>
                                </div>
                              </div>
                            )}
                          />

                          {/* Optional textarea */}
                          <Controller
                            name={item.textKey}
                            control={control}
                            render={({ field }) => (
                              <Textarea
                                {...field}
                                rows={2}
                                placeholder={`Justificativa opcional...`}
                                className="rounded-lg bg-[#00205e]/30 border-white/5 text-white text-xs placeholder:text-gray-600 resize-none min-h-0 focus-visible:ring-[#0126fb]/50"
                              />
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Total progress bar */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Score Total</span>
                    <span className="text-white font-bold">{smartTotal}/25</span>
                  </div>
                  <div className="h-2.5 bg-white/10 rounded-full overflow-hidden flex">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(smartTotal / 25) * 100}%`,
                        background: `linear-gradient(90deg, #ef4444 0%, #f97316 33%, #3b82f6 66%, #f5b719 100%)`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-600">
                    <span>Embrionaria</span>
                    <span>Desenvolvimento</span>
                    <span>Madura</span>
                    <span>Pronta</span>
                  </div>
                </div>
              </div>
            )}

            {/* ====== STEP 2: Tipagem ====== */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-bold text-white mb-0.5">Tipagem</p>
                  <p className="text-sm text-gray-400">Defina o tipo, publico e recursos necessarios.</p>
                </div>

                {/* Type cards */}
                <Controller
                  name="ideaType"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        {
                          value: "INTERNAL",
                          label: "Interna",
                          icon: "🏢",
                          desc: "Melhoria para processos, equipes ou operacoes internas da empresa.",
                        },
                        {
                          value: "EXTERNAL",
                          label: "Externa",
                          icon: "🌍",
                          desc: "Voltada para clientes, mercado ou oportunidades externas.",
                        },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={cn(
                            "flex flex-col items-start gap-2 p-5 rounded-xl border text-left transition-all",
                            field.value === opt.value
                              ? "bg-[#0126fb]/15 border-[#0126fb]/60 ring-1 ring-[#0126fb]/30"
                              : "bg-white/[0.03] border-white/10 hover:border-white/20 hover:bg-white/[0.05]"
                          )}
                        >
                          <span className="text-2xl">{opt.icon}</span>
                          <p className={cn(
                            "font-semibold",
                            field.value === opt.value ? "text-[#0126fb]" : "text-white"
                          )}>
                            {opt.label}
                          </p>
                          <p className="text-xs text-gray-500 leading-relaxed">{opt.desc}</p>
                        </button>
                      ))}
                    </div>
                  )}
                />

                {watch("ideaType") === "EXTERNAL" && (
                  <div className="space-y-1.5">
                    <Label className="text-gray-300 text-sm">Publico-alvo</Label>
                    <Controller
                      name="targetAudience"
                      control={control}
                      render={({ field }) => (
                        <Input
                          {...field}
                          placeholder="Ex: Startups de tecnologia"
                          className="h-11 rounded-lg bg-[#00205e]/40 border-white/10 text-white placeholder:text-gray-500 focus-visible:ring-[#0126fb]/50"
                        />
                      )}
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Parceiros Potenciais</Label>
                  <Controller
                    name="partners"
                    control={control}
                    render={({ field }) => (
                      <Textarea
                        {...field}
                        placeholder="Quem pode ajudar a realizar essa ideia?"
                        className="min-h-[80px] rounded-lg bg-[#00205e]/40 border-white/10 text-white placeholder:text-gray-500 resize-none focus-visible:ring-[#0126fb]/50"
                      />
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-gray-300 text-sm">Recursos Necessarios</Label>
                  <Controller
                    name="resources"
                    control={control}
                    render={({ field }) => (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {RESOURCE_OPTIONS.map((res) => {
                          const selected = field.value?.includes(res);
                          return (
                            <button
                              key={res}
                              type="button"
                              onClick={() => {
                                const current = field.value || [];
                                field.onChange(
                                  selected ? current.filter((r) => r !== res) : [...current, res]
                                );
                              }}
                              className={cn(
                                "px-4 py-2 rounded-lg text-xs font-medium border transition-all",
                                selected
                                  ? "bg-[#0126fb]/20 border-[#0126fb]/60 text-[#0126fb]"
                                  : "bg-white/[0.03] border-white/10 text-gray-400 hover:border-white/20 hover:text-gray-300"
                              )}
                            >
                              {res}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* ====== STEP 3: Resultado ====== */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <p className="text-lg font-bold text-white mb-0.5">Resultado</p>
                  <p className="text-sm text-gray-400">Revise o resumo da sua ideia antes de registrar.</p>
                </div>

                {/* Hero cluster */}
                <div className="text-center py-6 rounded-xl border border-white/10 relative overflow-hidden"
                  style={{ background: `radial-gradient(ellipse at center, ${cluster.hex}10 0%, transparent 70%)` }}
                >
                  <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-semibold mb-2">Classificacao</p>
                  <p className={cn("text-2xl font-black tracking-tight", cluster.color)}>{cluster.name}</p>
                  <p className="text-gray-500 text-sm mt-1">Cluster Nivel {cluster.level}</p>
                </div>

                {/* SMART scores row */}
                <div className="grid grid-cols-5 gap-2">
                  {SMART_CONFIG.map((item) => (
                    <div
                      key={item.key}
                      className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white/[0.03] border border-white/10"
                    >
                      <span className="text-base font-bold" style={{ color: item.color }}>
                        {item.letter}
                      </span>
                      <span className="text-white font-bold text-xl">{watch(item.key)}</span>
                      <span className="text-gray-600 text-[10px]">/5</span>
                    </div>
                  ))}
                </div>

                {/* Priority gauge */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400 mb-1.5">Prioridade Calculada</p>
                    <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${priority}%`,
                          background: priority > 75 ? "linear-gradient(90deg, #f5b719, #f59e0b)" : priority > 50 ? "linear-gradient(90deg, #3b82f6, #0126fb)" : priority > 25 ? "linear-gradient(90deg, #f97316, #f59e0b)" : "linear-gradient(90deg, #ef4444, #f87171)",
                        }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[#f5b719] font-bold text-2xl">{priority}%</p>
                  </div>
                </div>

                {/* Summary card */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
                  <h4 className="text-white font-semibold">{watch("title")}</h4>
                  <p className="text-gray-400 text-sm line-clamp-3 leading-relaxed">{watch("description")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs border-[#0126fb]/50 text-[#0126fb]">
                      {CATEGORIES.find((c) => c.value === watch("category"))?.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                      {watch("ideaType") === "INTERNAL" ? "Interna" : "Externa"}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs border-white/20", cluster.color)}>
                      Score: {smartTotal}/25
                    </Badge>
                  </div>
                </div>

                {/* Recommendation */}
                <div
                  className="rounded-xl p-4 border-l-[3px] bg-white/[0.02]"
                  style={{ borderLeftColor: cluster.hex }}
                >
                  <p className="text-xs font-semibold mb-1" style={{ color: cluster.hex }}>Recomendacao</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{getClusterRecommendation(cluster.level)}</p>
                </div>

                {/* Submit button (prominent) */}
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-[#f5b719] to-[#f59e0b] hover:from-[#f5b719]/90 hover:to-[#f59e0b]/90 text-[#010d26] shadow-lg shadow-[#f5b719]/20 transition-all"
                >
                  <Zap className="w-5 h-5 mr-2" />
                  {mutation.isPending ? "Registrando..." : "Registrar no JR Basement"}
                </Button>
              </div>
            )}
          </div>

          {/* ====== FOOTER (fixed) ====== */}
          <div className="shrink-0 px-6 md:px-8 py-4 border-t border-white/5 bg-[#010d26] flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0}
              className="text-gray-400 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Voltar
            </Button>

            <span className="text-xs text-gray-500">
              Passo {step + 1} de {STEPS.length}
            </span>

            {step < 3 ? (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-[#0126fb] hover:bg-[#0126fb]/80 text-white rounded-lg"
              >
                Proximo
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-[#f5b719] hover:bg-[#f5b719]/80 text-[#010d26] font-bold rounded-lg"
              >
                <Zap className="w-4 h-4 mr-1" />
                {mutation.isPending ? "Registrando..." : "Registrar"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
