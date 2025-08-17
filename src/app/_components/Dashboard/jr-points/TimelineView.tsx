"use client";

import { Semester, JRPointsVersion } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Calendar, GitBranch } from "lucide-react";

type VersionWithCount = JRPointsVersion & {
  _count: { tagTemplates: number };
};

interface TimelineViewProps {
  semesters: Semester[];
  versions: VersionWithCount[];
}

const TimelineView = ({ semesters, versions }: TimelineViewProps) => {
  // Encontra qual versão estava ativa durante cada semestre
  const semestersWithVersions = semesters.map((semester) => {
    const activeVersion = versions.find((version) => {
      const versionStart = new Date(version.implementationDate).getTime();
      const semesterStart = new Date(semester.startDate).getTime();
      const semesterEnd = semester.endDate
        ? new Date(semester.endDate).getTime()
        : Infinity;
      return versionStart >= semesterStart && versionStart < semesterEnd;
    });
    return { ...semester, activeVersion };
  });

  return (
    <div className="min-w-full rounded-2xl border-2 border-[#0126fb]/30 bg-[#010d26] p-6 text-white shadow-lg mt-6">
      <h2 className="text-2xl font-bold text-[#0126fb] mb-6">
        Linha do Tempo e Regras
      </h2>
      <div className="relative border-l-2 border-gray-700/50 pl-6 space-y-12">
        {/* Ponto de início da linha do tempo */}
        <div className="absolute left-[-11px] top-0 h-5 w-5 rounded-full bg-[#f5b719] ring-8 ring-[#010d26]"></div>

        {semestersWithVersions.map((semester, index) => (
          <div key={semester.id} className="relative">
            {/* Ponto de cada semestre na linha do tempo */}
            <div className="absolute left-[-35px] top-1 h-5 w-5 rounded-full bg-[#0126fb] ring-8 ring-[#010d26] flex items-center justify-center">
              <Calendar size={12} />
            </div>

            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
              <h3 className="text-xl font-semibold text-white">
                {semester.name}
              </h3>
              {semester.isActive && (
                <Badge className="bg-green-600 w-fit mt-2 sm:mt-0">
                  Período Atual
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {format(new Date(semester.startDate), "dd/MM/yyyy")} -{" "}
              {semester.endDate
                ? format(new Date(semester.endDate), "dd/MM/yyyy")
                : "Presente"}
            </p>

            <div className="mt-4 p-4 bg-[#00205e]/30 border border-gray-700 rounded-lg">
              {semester.activeVersion ? (
                <div className="flex items-center gap-4">
                  <GitBranch className="h-8 w-8 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-300">
                      Versão de Regras Ativa:
                    </p>
                    <p className="text-lg font-bold text-[#f5b719]">
                      {semester.activeVersion.versionName}
                    </p>
                    <p className="text-xs text-gray-400">
                      {semester.activeVersion._count.tagTemplates} modelos de
                      tag
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nenhuma versão de regras foi implementada neste semestre.
                </p>
              )}
            </div>

            {/* Linha conectora, exceto para o último item */}
            {index < semestersWithVersions.length - 1 && (
              <div className="absolute top-0 left-[-26px] h-full w-px bg-gray-700/50 -z-10"></div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TimelineView;
