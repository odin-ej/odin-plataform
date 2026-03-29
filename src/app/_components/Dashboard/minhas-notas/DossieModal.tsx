"use client";

import { useState } from "react";
import {
  X,
  FileText,
  GraduationCap,
  Swords,
  Sparkles,
  Megaphone,
  Settings,
  DollarSign,
  MessageSquare,
  BookOpen,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface DossieModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluations: TraineeEvaluationItem[];
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

const DEPT_COLORS: Record<TraineeDepartment, string> = {
  MARKETING: "#f5b719",
  ORGANIZACIONAL: "#0126fb",
  FINANCEIRO: "#22c55e",
};

const departments = Object.values(TraineeDepartment);
const categories = Object.values(TraineeGradeCategory);

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

function getGradeBgSoft(grade: number): string {
  if (grade >= 8) return "bg-emerald-400/10";
  if (grade >= 6) return "bg-yellow-400/10";
  if (grade >= 4) return "bg-orange-400/10";
  return "bg-red-400/10";
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
      return <FileText className="h-5 w-5" />;
    case "PROVA":
      return <GraduationCap className="h-5 w-5" />;
    case "DESAFIO":
      return <Swords className="h-5 w-5" />;
    case "EXTRA":
      return <Sparkles className="h-5 w-5" />;
  }
}

export default function DossieModal({
  isOpen,
  onClose,
  evaluations,
}: DossieModalProps) {
  const [activeDepartment, setActiveDepartment] = useState<TraineeDepartment>(
    TraineeDepartment.MARKETING
  );

  const getEvaluation = (
    department: TraineeDepartment,
    category: TraineeGradeCategory
  ) => {
    return evaluations.find(
      (e) => e.department === department && e.category === category
    );
  };

  const getDeptAverage = (dept: TraineeDepartment): number => {
    const deptEvals = evaluations.filter((e) => e.department === dept);
    if (deptEvals.length === 0) return 0;
    return Math.round(
      (deptEvals.reduce((s, e) => s + e.grade, 0) / deptEvals.length) * 10
    ) / 10;
  };

  const overallAverage = evaluations.length > 0
    ? Math.round(
        (evaluations.reduce((s, e) => s + e.grade, 0) / evaluations.length) * 10
      ) / 10
    : 0;

  const activeDeptAvg = getDeptAverage(activeDepartment);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl bg-[#010d26] border border-[#0126fb]/30 text-white p-0 gap-0 [&>button]:hidden overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="p-6 pb-5 border-b border-[#0126fb]/10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#f5b719]/10 border border-[#f5b719]/20">
                <BookOpen className="h-5 w-5 text-[#f5b719]" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold text-white">
                  Dossie de Avaliacoes
                </DialogTitle>
                <p className="text-sm text-gray-400">
                  Detalhamento completo de notas e feedbacks
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Department Tabs & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex bg-white/[0.03] rounded-xl overflow-hidden border border-[#0126fb]/20">
              {departments.map((dept) => {
                const avg = getDeptAverage(dept);
                return (
                  <button
                    key={dept}
                    onClick={() => setActiveDepartment(dept)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
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
                    {avg > 0 && activeDepartment !== dept && (
                      <span className={`text-[10px] font-bold ${getGradeColor(avg)} bg-white/5 px-1.5 py-0.5 rounded`}>
                        {avg.toFixed(1)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick stats */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Departamento</p>
                <p className={`text-xl font-extrabold ${activeDeptAvg > 0 ? getGradeColor(activeDeptAvg) : "text-gray-600"}`}>
                  {activeDeptAvg > 0 ? activeDeptAvg.toFixed(1) : "—"}
                </p>
              </div>
              <div className="w-px h-8 bg-[#0126fb]/15" />
              <div className="text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-wider">Geral</p>
                <p className={`text-xl font-extrabold ${overallAverage > 0 ? getGradeColor(overallAverage) : "text-gray-600"}`}>
                  {overallAverage > 0 ? overallAverage.toFixed(1) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto min-h-0">
          {categories.map((cat) => {
            const eval_ = getEvaluation(activeDepartment, cat);
            const grade = eval_?.grade;
            const feedback = eval_?.feedback;

            return (
              <div
                key={cat}
                className="rounded-xl border border-[#0126fb]/20 bg-[#00205e]/30 overflow-hidden"
              >
                {/* Category card */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center w-10 h-10 rounded-lg"
                        style={{
                          backgroundColor: `${DEPT_COLORS[activeDepartment]}10`,
                          color: DEPT_COLORS[activeDepartment],
                        }}
                      >
                        {getCatIcon(cat)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {CATEGORY_LABELS[cat]}
                        </h3>
                        <p className="text-xs text-gray-500">
                          {DEPARTMENT_LABELS[activeDepartment]}
                        </p>
                      </div>
                    </div>

                    {/* Grade Display */}
                    {grade !== undefined ? (
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${getGradeBgColor(grade)}`}
                            style={{ width: `${(grade / 10) * 100}%` }}
                          />
                        </div>
                        <div className={`flex items-center justify-center w-14 h-10 rounded-lg ${getGradeBgSoft(grade)}`}>
                          <span className={`text-xl font-extrabold ${getGradeColor(grade)}`}>
                            {grade.toFixed(1)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-600 font-medium">
                        Sem nota
                      </span>
                    )}
                  </div>

                  {/* Feedback */}
                  {feedback ? (
                    <div className="mt-3 pt-3 border-t border-[#0126fb]/10">
                      <div className="flex items-start gap-2">
                        <MessageSquare className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                            Feedback do Diretor
                          </p>
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {feedback}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    grade !== undefined && (
                      <div className="mt-3 pt-3 border-t border-[#0126fb]/10">
                        <p className="text-xs text-gray-600 italic flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5" />
                          Nenhum feedback registrado para esta categoria.
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#0126fb]/10 bg-white/[0.01] flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {evaluations.length} avaliacoes registradas no total
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white/5 border border-[#0126fb]/20 text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors text-sm font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
