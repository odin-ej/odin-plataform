"use client";
import { EstrategyObjective, Goal } from ".prisma/client";
import CustomCard from "../Global/Custom/CustomCard";
import { Goal as GoalIcon } from "lucide-react";
import EstrategyObjectiveCard from "./EstrategyObjectiveCard";

interface MetasContentProps {
  estrategyObjectives: (EstrategyObjective & { goals: Goal[] })[];
}

const MetasContent = ({ estrategyObjectives }: MetasContentProps) => {
  return (
    <>
      <CustomCard
        type="introduction"
        title={`Metas da Casinha - ${new Date().getFullYear()}`}
        icon={GoalIcon}
        description="Acompanhe as metas da Casinha para o ano atual."
        value={0}
      />

      <div className="flex flex-col gap-4">
        {estrategyObjectives.map((estrategyObjective, index) => (
          <EstrategyObjectiveCard
            key={estrategyObjective.id}
            estrategyObjective={estrategyObjective}
            index={index + 1}
          />
        ))}
      </div>

      <div className="mt-10 space-y-6">
        <h2 className="text-xl sm:text-4xl text-center  font-bold text-white">
          Entenda Sobre
        </h2>

        {estrategyObjectives.map((estrategyObjective, index) => (
          <section
            key={estrategyObjective.id}
            aria-labelledby={`objective-title-${index}`}
            className="rounded-xl border border-[#0126fb] bg-[#010d26] p-4 sm:p-6 shadow-md"
          >
            <h3
              id={`objective-title-${index}`}
              className="text-lg sm:text-xl font-semibold text-[#f5b719]"
            >
              {index + 1}º Objetivo Estratégico: {estrategyObjective.objective}
            </h3>

            <p className="mt-2 text-sm sm:text-base text-gray-300">
              {estrategyObjective.description}
            </p>

            <div className="mt-4 space-y-3">
              <h4 className="text-base font-medium text-white">Metas:</h4>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base text-gray-400">
                {estrategyObjective.goals.map((goal) => (
                  <li key={goal.id}>
                    <span className="text-white font-semibold">
                      {goal.title}:
                    </span>{" "}
                    {goal.description}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ))}
      </div>
    </>
  );
};

export default MetasContent;
