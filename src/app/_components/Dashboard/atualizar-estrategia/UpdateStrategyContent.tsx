"use client";
import {
  EstrategyObjectiveWithGoals,
  fullStrategy as fullStrategyType,
} from "@/app/(dashboard)/atualizar-estrategia/page";
import CustomCard from "../../Global/Custom/CustomCard";
import { Goal } from "lucide-react";
import { StrategySection } from "./StrategySection";
import { StrategyValuesSection } from "./StrategyValuesSection";
import { StrategyObjectivesSection } from "./StrategyObjectivesSection";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface UpdateStrategyContentProps {
  estrategyObjectives: EstrategyObjectiveWithGoals[];
  fullStrategy: fullStrategyType;
}

enum Item {
  estrategyPlan = "estrategyPlan",
  values = "values",
  objectives = "objectives",
}

const UpdateStrategyContent = ({
  estrategyObjectives,
  fullStrategy,
}: UpdateStrategyContentProps) => {
  const [item, setItem] = useState<Item>(Item.estrategyPlan);

  return (
    <>
      <CustomCard
        title="Atualizar Estratégia"
        icon={Goal}
        type="introduction"
        description="Atualize a estratégia da Casinha para o ano atual."
        value={0}
      />

      <div className="mt-6">
        <h2 className="text-xl sm:text-3xl text-center font-bold text-white">
          O que deseja atualizar?
        </h2>
        <div className="flex flex-col sm:flex-row pb-6 w-full items-center justify-center mt-3 gap-4">
          <Button
            className={cn(
              "bg-transparent hover:text-[#0126fb] hover:!bg-transparent",
              { "text-[#f5b719] bg-[#f5b719]/10": item === Item.estrategyPlan }
            )}
            disabled={item === Item.estrategyPlan}
            onClick={() => setItem(Item.estrategyPlan)}
          >
            Estratégia
          </Button>
          <Button
            className={cn(
              "bg-transparent hover:text-[#0126fb] hover:!bg-transparent",
              { "text-[#f5b719] bg-[#f5b719]/10": item === Item.values }
            )}
            disabled={item === Item.values}
            onClick={() => setItem(Item.values)}
          >
            Valores
          </Button>
          <Button
            className={cn(
              "bg-transparent hover:text-[#0126fb] hover:!bg-transparent",
              { "text-[#f5b719] bg-[#f5b719]/10": item === Item.objectives }
            )}
            disabled={item === Item.objectives}
            onClick={() => setItem(Item.objectives)}
          >
            Objetivos e Indicadores
          </Button>
        </div>
      </div>

      {item === Item.estrategyPlan && (
        <div className="space-y-2">
          <StrategySection
            field="propose"
            label="Propósito"
            value={fullStrategy.propose}
          />
          <StrategySection
            field="mission"
            label="Missão"
            value={fullStrategy.mission}
          />
          <StrategySection
            field="vision"
            label="Visão"
            value={fullStrategy.vision}
          />
        </div>
      )}
      {item === Item.values && (
        <>
          <StrategyValuesSection values={fullStrategy.values} />
        </>
      )}

      {item === Item.objectives && (
        <>
          <StrategyObjectivesSection
            estrategyObjectives={estrategyObjectives}
          />
        </>
      )}
    </>
  );
};

export default UpdateStrategyContent;
