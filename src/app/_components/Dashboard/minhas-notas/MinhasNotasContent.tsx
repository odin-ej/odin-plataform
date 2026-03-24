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
import { Star, ExternalLink } from "lucide-react";
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
  AVALIACAO_PROCESSUAL: "Avaliação Processual",
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

const departments = Object.values(TraineeDepartment);
const categories = Object.values(TraineeGradeCategory);

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
        borderRadius: 4,
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
        ticks: { color: "#ffffff", stepSize: 2 },
        grid: { color: "rgba(255,255,255,0.1)" },
      },
      x: {
        ticks: { color: "#ffffff" },
        grid: { display: false },
      },
    },
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          color: "#ffffff",
          usePointStyle: true,
          pointStyle: "circle",
          padding: 20,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Cards de média por departamento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {departmentAverages.map(({ department, label, average }) => (
          <div
            key={department}
            className="rounded-xl border border-[#0126fb]/30 bg-[#00205e] p-6 flex items-center gap-4"
          >
            <div className="flex-shrink-0">
              <div className="relative">
                <Star className="h-12 w-12 text-[#f5b719] fill-[#f5b719]" />
                <Star className="h-8 w-8 text-[#f5b719] fill-[#f5b719] absolute -top-2 -right-2" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white uppercase tracking-wider">
                {label}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-white uppercase tracking-wider">
                Parabéns
              </p>
              <p className="text-4xl font-extrabold text-[#f5b719]">
                {average.toFixed(1)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfico de barras */}
      <div className="rounded-xl border border-[#0126fb]/30 bg-[#00205e] p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            SUAS <span className="text-[#f5b719]">NOTAS</span>
          </h2>
          <button
            onClick={() => setIsDossieOpen(true)}
            className="flex items-center gap-2 text-sm text-[#f5b719] hover:text-[#f5b719]/80 underline transition-colors cursor-pointer"
          >
            Expandir <ExternalLink className="h-4 w-4" />
          </button>
        </div>
        <div className="h-[350px]">
          <Bar data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Modal Dossiê */}
      <DossieModal
        isOpen={isDossieOpen}
        onClose={() => setIsDossieOpen(false)}
        evaluations={evaluations}
      />
    </div>
  );
}
