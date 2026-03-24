"use client";

import { useState, useMemo } from "react";
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
import {
  Star,
  ExternalLink,
  BookOpen,
  TrendingUp,
  Award,
  Megaphone,
  Settings,
  DollarSign,
  FileText,
  GraduationCap,
  Swords,
  Sparkles,
} from "lucide-react";
import DossieModal from "./DossieModal";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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

interface TraineeEvaluationItem {
  id: string;
  department: TraineeDepartment;
  category: TraineeGradeCategory;
  grade: number;
  feedback: string | null;
}

interface MinhasNotasContentProps {
  evaluations: TraineeEvaluationItem[];
  userName: string;
}

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

const CATEGORY_COLORS: Record<TraineeGradeCategory, string> = {
  AVALIACAO_PROCESSUAL: "#f5b719",
  PROVA: "#0126fb",
  DESAFIO: "#ffffff",
  EXTRA: "#1a3a6e",
};

const DEPT_COLORS: Record<TraineeDepartment, string> = {
  MARKETING: "#f5b719",
  ORGANIZACIONAL: "#0126fb",
  FINANCEIRO: "#22c55e",
};

const departments = Object.values(TraineeDepartment);
const categories = Object.values(TraineeGradeCategory);

// --- Helpers ---

function getDepartmentAverage(
  evaluations: TraineeEvaluationItem[],
  department: TraineeDepartment
): number {
  const deptEvals = evaluations.filter((e) => e.department === department);
  if (deptEvals.length === 0) return 0;
  const avg = deptEvals.reduce((sum, e) => sum + e.grade, 0) / deptEvals.length;
  return Math.round(avg * 10) / 10;
}

function getGradeForDeptCategory(
  evaluations: TraineeEvaluationItem[],
  department: TraineeDepartment,
  category: TraineeGradeCategory
): number {
  const eval_ = evaluations.find(
    (e) => e.department === department && e.category === category
  );
  return eval_?.grade ?? 0;
}

function getFeedbackForDeptCategory(
  evaluations: TraineeEvaluationItem[],
  department: TraineeDepartment,
  category: TraineeGradeCategory
): string | null {
  const eval_ = evaluations.find(
    (e) => e.department === department && e.category === category
  );
  return eval_?.feedback ?? null;
}

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

function getGradeBgSoft(grade: number): string {
  if (grade >= 8) return "bg-emerald-400/10";
  if (grade >= 6) return "bg-yellow-400/10";
  if (grade >= 4) return "bg-orange-400/10";
  return "bg-red-400/10";
}

function getGradeLabel(grade: number): string {
  if (grade >= 8) return "Excelente";
  if (grade >= 6) return "Bom";
  if (grade >= 4) return "Regular";
  return "Atencao";
}

function getDeptIcon(dept: TraineeDepartment) {
  switch (dept) {
    case "MARKETING":
      return <Megaphone className="h-5 w-5" />;
    case "ORGANIZACIONAL":
      return <Settings className="h-5 w-5" />;
    case "FINANCEIRO":
      return <DollarSign className="h-5 w-5" />;
  }
}

function getCatIcon(cat: TraineeGradeCategory) {
  switch (cat) {
    case "AVALIACAO_PROCESSUAL":
      return <FileText className="h-4 w-4" />;
    case "PROVA":
      return <GraduationCap className="h-4 w-4" />;
    case "DESAFIO":
      return <Swords className="h-4 w-4" />;
    case "EXTRA":
      return <Sparkles className="h-4 w-4" />;
  }
}

export default function MinhasNotasContent({
  evaluations,
  userName,
}: MinhasNotasContentProps) {
  const [isDossieOpen, setIsDossieOpen] = useState(false);

  const departmentAverages = useMemo(() => {
    return departments.map((dept) => ({
      department: dept,
      label: DEPARTMENT_LABELS[dept],
      average: getDepartmentAverage(evaluations, dept),
    }));
  }, [evaluations]);

  const overallAverage = useMemo(() => {
    if (evaluations.length === 0) return 0;
    const avg =
      evaluations.reduce((sum, e) => sum + e.grade, 0) / evaluations.length;
    return Math.round(avg * 10) / 10;
  }, [evaluations]);

  const bestDepartment = useMemo(() => {
    if (departmentAverages.every((d) => d.average === 0)) return null;
    return departmentAverages.reduce((best, curr) =>
      curr.average > best.average ? curr : best
    );
  }, [departmentAverages]);

  const chartData = useMemo(() => {
    return {
      labels: departments.map((d) => DEPARTMENT_LABELS[d]),
      datasets: categories.map((cat) => ({
        label: CATEGORY_LABELS[cat],
        data: departments.map((dept) =>
          getGradeForDeptCategory(evaluations, dept, cat)
        ),
        backgroundColor: CATEGORY_COLORS[cat],
        borderColor: cat === "DESAFIO" ? "#cccccc" : CATEGORY_COLORS[cat],
        borderWidth: cat === "DESAFIO" ? 1 : 0,
        borderRadius: 6,
      })),
    };
  }, [evaluations]);

  const chartOptions = {
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

  // Empty state
  if (evaluations.length === 0) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#f5b719]/10 border border-[#f5b719]/20">
            <Star className="h-6 w-6 text-[#f5b719]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Minhas Notas</h1>
            <p className="text-sm text-gray-400">
              Ola, {userName.split(" ")[0]}! Aqui voce acompanha suas avaliacoes.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-12 text-center">
          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-[#f5b719]/10 border border-[#f5b719]/20 mx-auto mb-5">
            <BookOpen className="h-10 w-10 text-[#f5b719]/50" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">
            Nenhuma avaliacao ainda
          </h2>
          <p className="text-gray-400 text-sm max-w-md mx-auto leading-relaxed">
            Suas avaliacoes aparecerão aqui assim que os diretores registrarem
            notas para voce. Continue se dedicando!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Personal Info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[#f5b719]/10 border border-[#f5b719]/20">
            <Star className="h-6 w-6 text-[#f5b719]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Minhas Notas</h1>
            <p className="text-sm text-gray-400">
              Ola, {userName.split(" ")[0]}! Acompanhe seu desempenho abaixo.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsDossieOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f5b719]/10 border border-[#f5b719]/20 text-[#f5b719] hover:bg-[#f5b719]/20 transition-colors text-sm font-semibold cursor-pointer"
        >
          <ExternalLink className="h-4 w-4" />
          Ver Dossie Completo
        </button>
      </div>

      {/* Overall Average Hero Card */}
      <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-[#0126fb]/10">
          {/* Overall Average */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Media Geral
            </p>
            <div className={`relative flex items-center justify-center w-24 h-24 rounded-2xl ${getGradeBgSoft(overallAverage)} mb-2`}>
              <span className={`text-4xl font-extrabold ${getGradeColor(overallAverage)}`}>
                {overallAverage.toFixed(1)}
              </span>
            </div>
            <span className={`text-xs font-semibold ${getGradeColor(overallAverage)} ${getGradeBgSoft(overallAverage)} px-3 py-1 rounded-full`}>
              {getGradeLabel(overallAverage)}
            </span>
          </div>

          {/* Best Department */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Melhor Departamento
            </p>
            <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-emerald-400/10 mb-2">
              <Award className="h-10 w-10 text-emerald-400" />
            </div>
            <p className="text-base font-bold text-white">
              {bestDepartment?.label ?? "—"}
            </p>
            {bestDepartment && bestDepartment.average > 0 && (
              <p className="text-xs text-emerald-400 font-semibold">
                {bestDepartment.average.toFixed(1)} de media
              </p>
            )}
          </div>

          {/* Evaluations Count */}
          <div className="p-6 flex flex-col items-center justify-center text-center">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Avaliacoes
            </p>
            <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-[#0126fb]/10 mb-2">
              <TrendingUp className="h-10 w-10 text-[#0126fb]" />
            </div>
            <p className="text-3xl font-bold text-white">{evaluations.length}</p>
            <p className="text-xs text-gray-400">notas registradas</p>
          </div>
        </div>
      </div>

      {/* Department Cards */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-[#f5b719]" />
          Desempenho por Departamento
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {departmentAverages.map(({ department, label, average }) => (
            <div
              key={department}
              className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] overflow-hidden"
            >
              {/* Department Header */}
              <div className="p-5 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-xl"
                      style={{
                        backgroundColor: `${DEPT_COLORS[department]}15`,
                        color: DEPT_COLORS[department],
                      }}
                    >
                      {getDeptIcon(department)}
                    </div>
                    <h3 className="text-base font-bold text-white">{label}</h3>
                  </div>
                  <div className="text-right">
                    <span className={`text-2xl font-extrabold ${average > 0 ? getGradeColor(average) : "text-gray-600"}`}>
                      {average > 0 ? average.toFixed(1) : "—"}
                    </span>
                  </div>
                </div>

                {/* Average bar */}
                <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${(average / 10) * 100}%`,
                      backgroundColor: DEPT_COLORS[department],
                      opacity: average > 0 ? 1 : 0,
                    }}
                  />
                </div>

                {/* Category Breakdown */}
                <div className="space-y-2">
                  {categories.map((cat) => {
                    const grade = getGradeForDeptCategory(evaluations, department, cat);
                    const feedback = getFeedbackForDeptCategory(evaluations, department, cat);
                    return (
                      <div key={cat} className="flex items-center gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-gray-500 flex-shrink-0">
                            {getCatIcon(cat)}
                          </span>
                          <span className="text-xs text-gray-400 truncate">
                            {CATEGORY_LABELS[cat]}
                          </span>
                          {feedback && (
                            <div className="group relative flex-shrink-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-[#0126fb]/50" />
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 rounded-lg bg-[#00205e] border border-[#0126fb]/30 text-xs text-gray-300 leading-relaxed hidden group-hover:block z-50 shadow-xl">
                                {feedback}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${grade > 0 ? getGradeBgColor(grade) : ""}`}
                              style={{ width: `${(grade / 10) * 100}%` }}
                            />
                          </div>
                          <span className={`text-xs font-bold w-7 text-right ${grade > 0 ? getGradeColor(grade) : "text-gray-600"}`}>
                            {grade > 0 ? grade.toFixed(1) : "—"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-[#f5b719]" />
            Suas Notas
          </h2>
        </div>
        <div className="h-[350px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Feedback Section */}
      {evaluations.some((e) => e.feedback) && (
        <div className="rounded-2xl border border-[#0126fb]/30 bg-[#010d26] p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[#f5b719]" />
            Feedbacks dos Diretores
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {evaluations
              .filter((e) => e.feedback)
              .map((e) => (
                <div
                  key={e.id}
                  className="rounded-xl border border-[#0126fb]/15 bg-[#00205e]/30 p-4"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: DEPT_COLORS[e.department] }}
                    />
                    <span className="text-xs font-semibold text-gray-300">
                      {DEPARTMENT_LABELS[e.department]}
                    </span>
                    <span className="text-gray-600 text-xs">|</span>
                    <span className="text-xs text-gray-400">
                      {CATEGORY_LABELS[e.category]}
                    </span>
                    <span className={`ml-auto text-xs font-bold ${getGradeColor(e.grade)}`}>
                      {e.grade.toFixed(1)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {e.feedback}
                  </p>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Modal Dossie */}
      <DossieModal
        isOpen={isDossieOpen}
        onClose={() => setIsDossieOpen(false)}
        evaluations={evaluations}
      />
    </div>
  );
}
