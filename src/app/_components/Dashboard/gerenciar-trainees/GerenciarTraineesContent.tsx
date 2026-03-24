"use client";

import { useState, useMemo, useTransition } from "react";
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
import { Pencil, GraduationCap } from "lucide-react";
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
  AVALIACAO_PROCESSUAL: "Avaliação Processual",
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
        borderRadius: 4,
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
        toast.success("Avaliações salvas com sucesso!");

        // Refresh data
        const [newTrainees, newOverview] = await Promise.all([
          getTrainees(),
          getTraineeOverview(),
        ]);
        setTrainees(newTrainees);
        setOverview(newOverview);
        setIsModalOpen(false);
      } catch {
        toast.error("Erro ao salvar avaliações");
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

  const getOverallAverage = (trainee: TraineeWithEvaluations) => {
    if (trainee.evaluations.length === 0) return "—";
    const avg =
      trainee.evaluations.reduce((s, e) => s + e.grade, 0) /
      trainee.evaluations.length;
    return (Math.round(avg * 10) / 10).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <GraduationCap className="h-8 w-8 text-[#f5b719]" />
        <h1 className="text-2xl font-bold text-white">
          Gerenciar <span className="text-[#f5b719]">Trainees</span>
        </h1>
      </div>

      {/* Overview Chart */}
      {overview.length > 0 && (
        <div className="rounded-xl border border-[#0126fb]/30 bg-[#00205e] p-6">
          <h2 className="text-lg font-bold text-white mb-4">
            VISÃO <span className="text-[#f5b719]">GERAL</span>
          </h2>
          <div className="h-[300px]">
            <Bar data={overviewChartData} options={overviewChartOptions} />
          </div>
        </div>
      )}

      {/* Trainees Table */}
      <div className="rounded-xl border border-[#0126fb]/30 bg-[#00205e] p-6">
        <h2 className="text-lg font-bold text-white mb-4">
          LISTA DE <span className="text-[#f5b719]">TRAINEES</span>
        </h2>

        {trainees.length === 0 ? (
          <p className="text-white/60 text-center py-8">
            Nenhum trainee encontrado. Certifique-se de que existe o cargo
            &quot;Trainee&quot; atribuído a algum usuário.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#0126fb]/20">
                  <th className="text-left text-xs font-bold text-white/60 uppercase tracking-wider py-3 px-4">
                    Trainee
                  </th>
                  {departments.map((dept) => (
                    <th
                      key={dept}
                      className="text-center text-xs font-bold text-white/60 uppercase tracking-wider py-3 px-4"
                    >
                      {DEPARTMENT_LABELS[dept]}
                    </th>
                  ))}
                  <th className="text-center text-xs font-bold text-[#f5b719] uppercase tracking-wider py-3 px-4">
                    Média Geral
                  </th>
                  <th className="text-center text-xs font-bold text-white/60 uppercase tracking-wider py-3 px-4">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {trainees.map((trainee) => (
                  <tr
                    key={trainee.id}
                    className="border-b border-[#0126fb]/10 hover:bg-[#0126fb]/5 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={trainee.imageUrl} />
                          <AvatarFallback className="bg-[#0126fb] text-white text-xs">
                            {trainee.name
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium text-white">
                          {trainee.name}
                        </span>
                      </div>
                    </td>
                    {departments.map((dept) => (
                      <td
                        key={dept}
                        className="text-center text-sm font-semibold text-white py-3 px-4"
                      >
                        {getDeptAverage(trainee, dept)}
                      </td>
                    ))}
                    <td className="text-center text-sm font-bold text-[#f5b719] py-3 px-4">
                      {getOverallAverage(trainee)}
                    </td>
                    <td className="text-center py-3 px-4">
                      <button
                        onClick={() => openEditModal(trainee)}
                        className="p-2 rounded-lg hover:bg-[#0126fb]/20 transition-colors text-white/60 hover:text-white cursor-pointer"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => !open && setIsModalOpen(false)}
      >
        <DialogContent className="max-w-3xl bg-[#010d26] border border-[#0126fb]/30 text-white p-0 gap-0 [&>button]:hidden">
          <div className="p-6">
            <DialogTitle className="text-xl font-bold mb-1">
              Avaliar{" "}
              <span className="text-[#f5b719]">{selectedTrainee?.name}</span>
            </DialogTitle>
            <p className="text-sm text-white/50 mb-4">
              Insira as notas (0-10) e feedbacks para cada categoria.
            </p>

            {/* Department Tabs */}
            <div className="flex bg-[#00205e] rounded-full overflow-hidden border border-[#0126fb]/30 mb-6 w-fit">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setActiveDepartment(dept)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    activeDepartment === dept
                      ? "bg-[#f5b719] text-[#010d26]"
                      : "text-white hover:bg-[#0126fb]/20"
                  }`}
                >
                  {DEPARTMENT_LABELS[dept]}
                </button>
              ))}
            </div>

            {/* Category inputs */}
            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2">
              {categories.map((cat) => {
                const key = `${activeDepartment}_${cat}`;
                const entry = formData[key] || { grade: "", feedback: "" };

                return (
                  <div
                    key={cat}
                    className="rounded-lg border border-[#0126fb]/30 bg-[#00205e] p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold uppercase tracking-wider text-[#f5b719]">
                        {CATEGORY_LABELS[cat]}
                      </span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-white/60">Nota:</label>
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
                          className="w-20 px-3 py-1.5 rounded-lg bg-[#010d26] border border-[#0126fb]/30 text-white text-center text-lg font-bold focus:outline-none focus:border-[#f5b719] transition-colors"
                          placeholder="0.0"
                        />
                      </div>
                    </div>
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
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg bg-[#010d26] border border-[#0126fb]/30 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-[#f5b719] transition-colors resize-none"
                    />
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-[#0126fb]/30 text-white/70 hover:text-white hover:bg-[#0126fb]/10 transition-colors text-sm cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="px-6 py-2 rounded-lg bg-[#f5b719] text-[#010d26] font-bold text-sm hover:bg-[#f5b719]/90 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Salvando..." : "Salvar Avaliações"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
