"use client";

import { useState, useMemo, useTransition, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { toast } from "sonner";
import {
  Pencil,
  GraduationCap,
  Users,
  TrendingUp,
  Trophy,
  BarChart3,
  MessageSquare,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Pagination from "@/app/_components/Global/Custom/Pagination";
import {
  TraineeWithEvaluations,
  upsertTraineeEvaluation,
  getTrainees,
  getTraineeOverview,
} from "@/lib/actions/trainee";

// Locally defined enums (mirrors Prisma schema)
const TraineeDepartment = {
  MARKETING: "MARKETING",
  ORGANIZACIONAL: "ORGANIZACIONAL",
  FINANCEIRO: "FINANCEIRO",
} as const;
type TraineeDepartment = (typeof TraineeDepartment)[keyof typeof TraineeDepartment];

const TraineeGradeCategory = {
  AVALIACAO_PROCESSUAL: "AVALIACAO_PROCESSUAL",
  PROVA: "PROVA",
  DESAFIO: "DESAFIO",
  EXTRA: "EXTRA",
} as const;
type TraineeGradeCategory = (typeof TraineeGradeCategory)[keyof typeof TraineeGradeCategory];
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- Types ---

interface OverviewItem {
  id: string;
  name: string;
  imageUrl: string;
  departmentAverages: Record<string, number>;
  overallAverage: number;
}

interface GerenciarTraineesContentProps {
  initialTrainees: TraineeWithEvaluations[];
  initialOverview: OverviewItem[];
}

// --- Constants ---

const DEPARTMENT_LABELS: Record<TraineeDepartment, string> = {
  MARKETING: "Marketing",
  ORGANIZACIONAL: "Organizacional",
  FINANCEIRO: "Financeiro",
};

const CATEGORY_LABELS: Record<TraineeGradeCategory, string> = {
  AVALIACAO_PROCESSUAL: "Avaliacao Processual",
  PROVA: "Prova",
  DESAFIO: "Desafio",
  EXTRA: "Extra",
};

const departments = Object.values(TraineeDepartment);
const categories = Object.values(TraineeGradeCategory);

const DEPT_COLORS: Record<TraineeDepartment, string> = {
  MARKETING: "#f5b719",
  ORGANIZACIONAL: "#0126fb",
  FINANCEIRO: "#22c55e",
};

const DEPT_ICONS: Record<TraineeDepartment, string> = {
  MARKETING: "MKT",
  ORGANIZACIONAL: "ORG",
  FINANCEIRO: "FIN",
};

// --- Helpers ---

function getGradeColor(grade: number): string {
  if (grade >= 8) return "text-emerald-400";
  if (grade >= 6) return "text-yellow-400";
  if (grade >= 4) return "text-orange-400";
  return "text-red-400";
}

function getGradeBgColor(grade: number): string {
  if (grade >= 8) return "bg-emerald-400";
  if (grade >= 6) return "bg-yellow-400";
  if (grade >= 4) return "bg-orange-400";
  return "bg-red-400";
}

function getGradeBorderColor(grade: number): string {
  if (grade >= 8) return "border-emerald-400/30";
  if (grade >= 6) return "border-yellow-400/30";
  if (grade >= 4) return "border-orange-400/30";
  return "border-red-400/30";
}

function getGradeRingColor(grade: number): string {
  if (grade >= 8) return "ring-emerald-400/20";
  if (grade >= 6) return "ring-yellow-400/20";
  if (grade >= 4) return "ring-orange-400/20";
  return "ring-red-400/20";
}

// --- Component ---

export default function GerenciarTraineesContent({
  initialTrainees,
  initialOverview,
}: GerenciarTraineesContentProps) {
  const [trainees, setTrainees] = useState(initialTrainees);
  const [overview, setOverview] = useState(initialOverview);
  const [selectedTrainee, setSelectedTrainee] =
    useState<TraineeWithEvaluations | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState<TraineeDepartment>(
    TraineeDepartment.MARKETING
  );
  const [isPending, startTransition] = useTransition();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // ─── Search, Filter & Pagination ────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 9;

  // Form state for grades and feedback
  const [formData, setFormData] = useState<
    Record<string, { grade: string; feedback: string }>
  >({});

  // --- Chart data ---

  const overviewChartData = useMemo(() => {
    return {
      labels: overview.map((t) => t.name.split(" ")[0]),
      datasets: departments.map((dept) => ({
        label: DEPARTMENT_LABELS[dept],
        data: overview.map((t) => t.departmentAverages[dept] || 0),
        backgroundColor: DEPT_COLORS[dept],
        borderRadius: 6,
      })),
    };
  }, [overview]);

  const overviewChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 10,
        ticks: { color: "#9ca3af", stepSize: 2, font: { size: 12 } },
        grid: { color: "rgba(255,255,255,0.06)" },
      },
      x: {
        ticks: { color: "#9ca3af", font: { size: 12 } },
        grid: { display: false },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#d1d5db",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 24,
          font: { size: 13 },
        },
      },
    },
  };

  // --- Filtered & Paginated Trainees ---

  const filteredTrainees = useMemo(() => {
    let result = trainees;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q)
      );
    }

    if (gradeFilter === "prova10") {
      result = result.filter((t) =>
        t.evaluations.some((e) => e.category === "PROVA" && e.grade === 10)
      );
    } else if (gradeFilter === "desafio10") {
      result = result.filter((t) =>
        t.evaluations.some((e) => e.category === "DESAFIO" && e.grade === 10)
      );
    } else if (gradeFilter === "media8") {
      result = result.filter((t) => {
        if (t.evaluations.length === 0) return false;
        const avg =
          t.evaluations.reduce((s, e) => s + e.grade, 0) /
          t.evaluations.length;
        return avg >= 8;
      });
    }

    return result;
  }, [trainees, searchQuery, gradeFilter]);

  const totalPages = Math.ceil(filteredTrainees.length / ITEMS_PER_PAGE);
  const paginatedTrainees = filteredTrainees.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, gradeFilter]);

  // --- Stats ---

  const stats = useMemo(() => {
    const totalTrainees = trainees.length;
    const allAverages = overview
      .map((t) => t.overallAverage)
      .filter((a) => a > 0);
    const globalAverage =
      allAverages.length > 0
        ? allAverages.reduce((s, a) => s + a, 0) / allAverages.length
        : 0;
    const topPerformer =
      overview.length > 0
        ? overview.reduce((best, current) =>
            current.overallAverage > best.overallAverage ? current : best
          )
        : null;

    return { totalTrainees, globalAverage, topPerformer };
  }, [trainees, overview]);

  // --- Handlers ---

  const openEditModal = (trainee: TraineeWithEvaluations) => {
    setSelectedTrainee(trainee);

    // Pre-fill form with existing data
    const data: Record<string, { grade: string; feedback: string }> = {};
    for (const dept of departments) {
      for (const cat of categories) {
        const key = `${dept}_${cat}`;
        const eval_ = trainee.evaluations.find(
          (e) => e.department === dept && e.category === cat
        );
        data[key] = {
          grade: eval_ ? String(eval_.grade) : "",
          feedback: eval_?.feedback ?? "",
        };
      }
    }
    setFormData(data);
    setActiveDepartment(TraineeDepartment.MARKETING);
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!selectedTrainee) return;

    startTransition(async () => {
      try {
        const promises: Promise<unknown>[] = [];

        for (const dept of departments) {
          for (const cat of categories) {
            const key = `${dept}_${cat}`;
            const entry = formData[key];
            if (!entry || entry.grade === "") continue;

            const gradeNum = parseFloat(entry.grade);
            if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 10) continue;

            promises.push(
              upsertTraineeEvaluation({
                traineeId: selectedTrainee.id,
                department: dept,
                category: cat,
                grade: gradeNum,
                feedback: entry.feedback || undefined,
              })
            );
          }
        }

        await Promise.all(promises);
        toast.success("Avaliacoes salvas com sucesso!");

        // Refresh data
        const [newTrainees, newOverview] = await Promise.all([
          getTrainees(),
          getTraineeOverview(),
        ]);
        setTrainees(newTrainees);
        setOverview(newOverview);
        setIsModalOpen(false);
      } catch {
        toast.error("Erro ao salvar avaliacoes");
      }
    });
  };

  const updateFormField = (
    dept: TraineeDepartment,
    cat: TraineeGradeCategory,
    field: "grade" | "feedback",
    value: string
  ) => {
    const key = `${dept}_${cat}`;
    setFormData((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  // --- Helpers ---

  const getDeptAverage = (trainee: TraineeWithEvaluations, dept: TraineeDepartment) => {
    const evals = trainee.evaluations.filter((e) => e.department === dept);
    if (evals.length === 0) return "—";
    const avg = evals.reduce((s, e) => s + e.grade, 0) / evals.length;
    return (Math.round(avg * 10) / 10).toFixed(1);
  };

  const getDeptAverageNum = (trainee: TraineeWithEvaluations, dept: TraineeDepartment): number => {
    const evals = trainee.evaluations.filter((e) => e.department === dept);
    if (evals.length === 0) return 0;
    return evals.reduce((s, e) => s + e.grade, 0) / evals.length;
  };

  const getOverallAverage = (trainee: TraineeWithEvaluations) => {
    if (trainee.evaluations.length === 0) return "—";
    const avg =
      trainee.evaluations.reduce((s, e) => s + e.grade, 0) /
      trainee.evaluations.length;
    return (Math.round(avg * 10) / 10).toFixed(1);
  };

  const getOverallAverageNum = (trainee: TraineeWithEvaluations): number => {
    if (trainee.evaluations.length === 0) return 0;
    return (
      trainee.evaluations.reduce((s, e) => s + e.grade, 0) /
      trainee.evaluations.length
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#f5b719]/10 border border-[#f5b719]/20">
            <GraduationCap className="h-6 w-6 text-[#f5b719]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Gerenciar Trainees
            </h1>
            <p className="text-sm text-gray-400">
              Avalie e acompanhe o desempenho dos trainees em cada departamento.
            </p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#0126fb]/10 border border-[#0126fb]/20">
            <Users className="h-6 w-6 text-[#0126fb]" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Total de Trainees
            </p>
            <p className="text-3xl font-bold text-white">{stats.totalTrainees}</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[#f5b719]/10 border border-[#f5b719]/20">
            <TrendingUp className="h-6 w-6 text-[#f5b719]" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Media Geral
            </p>
            <p className={`text-3xl font-bold ${stats.globalAverage > 0 ? getGradeColor(stats.globalAverage) : "text-gray-500"}`}>
              {stats.globalAverage > 0 ? stats.globalAverage.toFixed(1) : "—"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-5 flex items-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Trophy className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              Melhor Desempenho
            </p>
            <p className="text-lg font-bold text-white truncate">
              {stats.topPerformer && stats.topPerformer.overallAverage > 0
                ? stats.topPerformer.name.split(" ")[0]
                : "—"}
            </p>
            {stats.topPerformer && stats.topPerformer.overallAverage > 0 && (
              <p className="text-xs text-emerald-400 font-semibold">
                {stats.topPerformer.overallAverage.toFixed(1)} de media
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Overview Chart */}
      {overview.length > 0 && (
        <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-6">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-5 w-5 text-[#f5b719]" />
            <h2 className="text-lg font-bold text-white">
              Visao Geral por Departamento
            </h2>
          </div>
          <div className="h-[300px]">
            <Bar data={overviewChartData} options={overviewChartOptions} />
          </div>
        </div>
      )}

      {/* Trainee Cards */}
      <div>
        <div className="flex items-center gap-2 mb-5">
          <Users className="h-5 w-5 text-[#f5b719]" />
          <h2 className="text-lg font-bold text-white">
            Trainees
          </h2>
          <span className="ml-2 text-xs font-medium text-gray-400 bg-white/5 px-2.5 py-1 rounded-full">
            {filteredTrainees.length}
          </span>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nome ou email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#00205e]/60 border border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          <Select value={gradeFilter} onValueChange={setGradeFilter}>
            <SelectTrigger className="w-full sm:w-[200px] bg-[#00205e]/60 border border-white/10 text-white">
              <SelectValue placeholder="Filtrar por nota" />
            </SelectTrigger>
            <SelectContent className="bg-[#00205e] text-white border-[#0126fb]">
              <SelectItem value="all" className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white">Todos</SelectItem>
              <SelectItem value="prova10" className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white">Nota 10 na Prova</SelectItem>
              <SelectItem value="desafio10" className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white">Nota 10 no Desafio</SelectItem>
              <SelectItem value="media8" className="hover:!bg-[#0126fb] hover:!text-white focus:!bg-[#0126fb] focus:!text-white">Media {">="} 8</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {filteredTrainees.length === 0 ? (
          <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-12 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#0126fb]/10 border border-[#0126fb]/20 mx-auto mb-4">
              <GraduationCap className="h-8 w-8 text-[#0126fb]/50" />
            </div>
            <p className="text-gray-300 text-base font-medium mb-1">
              Nenhum trainee encontrado
            </p>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              {searchQuery || gradeFilter !== "all"
                ? "Nenhum resultado para os filtros selecionados."
                : "Certifique-se de que existe o cargo \"Trainee\" atribuido a algum usuario para comecar a avaliar."}
            </p>
          </div>
        ) : (
          <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {paginatedTrainees.map((trainee) => {
              const overallNum = getOverallAverageNum(trainee);
              const overallStr = getOverallAverage(trainee);
              const isExpanded = expandedCard === trainee.id;

              return (
                <div
                  key={trainee.id}
                  className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] overflow-hidden transition-all duration-200 hover:border-[#0126fb]/50"
                >
                  {/* Card Header */}
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-[#0126fb]/20">
                          <AvatarImage src={trainee.imageUrl} />
                          <AvatarFallback className="bg-[#0126fb]/20 text-white text-sm font-bold">
                            {trainee.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-base font-bold text-white">
                            {trainee.name}
                          </h3>
                          <p className="text-xs text-gray-400">
                            {trainee.evaluations.length} avaliacoes registradas
                          </p>
                        </div>
                      </div>

                      {/* Overall Average Badge */}
                      <div
                        className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl ring-2 ${
                          overallNum > 0 ? getGradeRingColor(overallNum) : "ring-gray-700"
                        } ${
                          overallNum > 0 ? "bg-white/5" : "bg-white/[0.02]"
                        }`}
                      >
                        <span
                          className={`text-xl font-extrabold ${
                            overallNum > 0 ? getGradeColor(overallNum) : "text-gray-600"
                          }`}
                        >
                          {overallStr}
                        </span>
                        {overallNum > 0 && (
                          <span className="text-[10px] text-gray-500 font-medium -mt-0.5">media</span>
                        )}
                      </div>
                    </div>

                    {/* Department Progress Bars */}
                    <div className="space-y-2.5">
                      {departments.map((dept) => {
                        const avg = getDeptAverageNum(trainee, dept);
                        const avgStr = getDeptAverage(trainee, dept);
                        return (
                          <div key={dept} className="flex items-center gap-3">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider w-8 text-center py-0.5 rounded"
                              style={{ color: DEPT_COLORS[dept] }}
                            >
                              {DEPT_ICONS[dept]}
                            </span>
                            <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${(avg / 10) * 100}%`,
                                  backgroundColor: DEPT_COLORS[dept],
                                  opacity: avg > 0 ? 1 : 0,
                                }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-gray-300 w-8 text-right">
                              {avgStr}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-4 border-t border-[#0126fb]/10 pt-4">
                      <div className="overflow-x-auto -mx-1">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="text-left py-1.5 px-1 text-gray-500 font-medium uppercase tracking-wider">
                                Categoria
                              </th>
                              {departments.map((dept) => (
                                <th
                                  key={dept}
                                  className="text-center py-1.5 px-1 font-medium uppercase tracking-wider"
                                  style={{ color: DEPT_COLORS[dept] }}
                                >
                                  {DEPT_ICONS[dept]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {categories.map((cat) => (
                              <tr key={cat} className="border-t border-white/[0.04]">
                                <td className="py-2 px-1 text-gray-400 font-medium">
                                  {CATEGORY_LABELS[cat]}
                                </td>
                                {departments.map((dept) => {
                                  const eval_ = trainee.evaluations.find(
                                    (e) => e.department === dept && e.category === cat
                                  );
                                  const grade = eval_?.grade;
                                  return (
                                    <td key={dept} className="text-center py-2 px-1">
                                      {grade !== undefined ? (
                                        <span className={`font-bold ${getGradeColor(grade)}`}>
                                          {grade.toFixed(1)}
                                        </span>
                                      ) : (
                                        <span className="text-gray-600">--</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Card Actions */}
                  <div className="flex items-center border-t border-[#0126fb]/10">
                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : trainee.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-gray-400 hover:text-white hover:bg-white/[0.03] transition-colors cursor-pointer"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" /> Recolher
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" /> Detalhes
                        </>
                      )}
                    </button>
                    <div className="w-px h-6 bg-[#0126fb]/10" />
                    <button
                      onClick={() => openEditModal(trainee)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium text-[#f5b719] hover:bg-[#f5b719]/5 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Avaliar
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
          </>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && setIsModalOpen(false)}
      >
        <DialogContent className="max-w-3xl bg-[#010d26] border border-[#0126fb]/30 text-white p-0 gap-0 [&>button]:hidden overflow-hidden">
          {/* Modal Header */}
          <div className="p-6 pb-5 border-b border-[#0126fb]/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedTrainee && (
                  <Avatar className="h-12 w-12 ring-2 ring-[#f5b719]/20">
                    <AvatarImage src={selectedTrainee.imageUrl} />
                    <AvatarFallback className="bg-[#f5b719]/10 text-[#f5b719] text-sm font-bold">
                      {selectedTrainee.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <DialogTitle className="text-xl font-bold text-white">
                    Avaliar{" "}
                    <span className="text-[#f5b719]">{selectedTrainee?.name}</span>
                  </DialogTitle>
                  <p className="text-sm text-gray-400 mt-0.5">
                    Insira notas de 0 a 10 e feedbacks para cada categoria.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Department Tabs */}
            <div className="flex mt-5 bg-white/[0.03] rounded-xl overflow-hidden border border-[#0126fb]/20 w-fit">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setActiveDepartment(dept)}
                  className={`px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                    activeDepartment === dept
                      ? "text-[#010d26] shadow-lg"
                      : "text-gray-300 hover:text-white hover:bg-white/[0.04]"
                  }`}
                  style={
                    activeDepartment === dept
                      ? { backgroundColor: DEPT_COLORS[dept] }
                      : undefined
                  }
                >
                  {DEPARTMENT_LABELS[dept]}
                </button>
              ))}
            </div>
          </div>

          {/* Category inputs */}
          <div className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
            {categories.map((cat) => {
              const key = `${activeDepartment}_${cat}`;
              const entry = formData[key] || { grade: "", feedback: "" };
              const gradeNum = parseFloat(entry.grade);
              const hasGrade = !isNaN(gradeNum);

              return (
                <div
                  key={cat}
                  className={`rounded-xl border bg-[#00205e]/50 p-5 transition-colors ${
                    hasGrade ? getGradeBorderColor(gradeNum) : "border-[#0126fb]/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold uppercase tracking-wider text-white">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <div className="flex items-center gap-3">
                      {hasGrade && (
                        <div
                          className={`h-2 w-2 rounded-full ${getGradeBgColor(gradeNum)}`}
                        />
                      )}
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={entry.grade}
                          onChange={(e) =>
                            updateFormField(
                              activeDepartment,
                              cat,
                              "grade",
                              e.target.value
                            )
                          }
                          className={`w-20 px-3 py-2 rounded-lg bg-[#010d26] border text-center text-lg font-bold focus:outline-none transition-colors ${
                            hasGrade
                              ? `${getGradeBorderColor(gradeNum)} ${getGradeColor(gradeNum)}`
                              : "border-[#0126fb]/30 text-white"
                          } focus:border-[#f5b719]`}
                          placeholder="0.0"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500 mt-2.5 flex-shrink-0" />
                    <textarea
                      value={entry.feedback}
                      onChange={(e) =>
                        updateFormField(
                          activeDepartment,
                          cat,
                          "feedback",
                          e.target.value
                        )
                      }
                      placeholder="Escreva o feedback para esta categoria..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg bg-[#010d26] border border-[#0126fb]/20 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-[#f5b719] transition-colors resize-none leading-relaxed"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#0126fb]/10 bg-white/[0.01]">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#0126fb]/30 text-gray-300 hover:text-white hover:bg-white/[0.04] transition-colors text-sm font-medium cursor-pointer"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#f5b719] text-[#010d26] font-bold text-sm hover:bg-[#f5b719]/90 transition-colors disabled:opacity-50 shadow-lg shadow-[#f5b719]/10 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {isPending ? "Salvando..." : "Salvar Avaliacoes"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
