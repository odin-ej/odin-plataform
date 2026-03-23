"use client";

import { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TraineeDepartment,
  TraineeGradeCategory,
  TraineeEvaluation,
} from "@prisma/client";

interface DossieModalProps {
  isOpen: boolean;
  onClose: () => void;
  evaluations: TraineeEvaluation[];
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

const departments = Object.values(TraineeDepartment);
const categories = Object.values(TraineeGradeCategory);

export default function DossieModal({
  isOpen,
  onClose,
  evaluations,
}: DossieModalProps) {
  const [activeDepartment, setActiveDepartment] = useState<TraineeDepartment>(
    TraineeDepartment.MARKETING
  );
  const [expandedCategory, setExpandedCategory] =
    useState<TraineeGradeCategory | null>(null);

  const toggleCategory = (category: TraineeGradeCategory) => {
    setExpandedCategory((prev) => (prev === category ? null : category));
  };

  const getEvaluation = (
    department: TraineeDepartment,
    category: TraineeGradeCategory
  ) => {
    return evaluations.find(
      (e) => e.department === department && e.category === category
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl bg-[#010d26] border border-[#0126fb]/30 text-white p-0 gap-0 [&>button]:hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4">
          <DialogTitle className="text-2xl font-bold">
            DOSSIÊ DE{" "}
            <span className="text-[#f5b719] underline underline-offset-4">
              AVALIAÇÕES
            </span>
          </DialogTitle>

          {/* Department Tabs */}
          <div className="flex items-center gap-2">
            <div className="flex bg-[#00205e] rounded-full overflow-hidden border border-[#0126fb]/30">
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => {
                    setActiveDepartment(dept);
                    setExpandedCategory(null);
                  }}
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

            <button
              onClick={onClose}
              className="ml-4 text-white hover:text-white/70 transition-colors cursor-pointer"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {categories.map((cat) => {
            const eval_ = getEvaluation(activeDepartment, cat);
            const isExpanded = expandedCategory === cat;

            return (
              <div
                key={cat}
                className="rounded-lg border border-[#0126fb]/30 bg-[#00205e] overflow-hidden"
              >
                {/* Category header */}
                <button
                  onClick={() => toggleCategory(cat)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#0126fb]/10 transition-colors cursor-pointer"
                >
                  <span className="text-sm font-bold uppercase tracking-wider text-[#f5b719]">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-extrabold text-[#f5b719]">
                      {eval_ ? eval_.grade.toFixed(1) : "—"}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-white/60" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-white/60" />
                    )}
                  </div>
                </button>

                {/* Expanded feedback */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[#0126fb]/20">
                    <h4 className="text-sm font-bold text-[#f5b719] mt-3 mb-2 uppercase">
                      Feedbacks
                    </h4>
                    <p className="text-sm text-white/80 leading-relaxed">
                      {eval_?.feedback || "Nenhum feedback registrado ainda."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
