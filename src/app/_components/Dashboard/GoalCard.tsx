import { Goal } from "@prisma/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { getPhrasePercentageByGoal } from "@/lib/utils";
import CircularProgress from "../Global/Custom/CircularProgress";

interface GoalCardProps {
  goal: Goal;
}

export function formatReaisResumo(value: number, total: number): string {
  return `${formatToBRL(value)} de ${formatToBRL(total)}`;
}

export function formatToBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

const GoalCard = ({ goal }: GoalCardProps) => {
  const phrase = getPhrasePercentageByGoal(
    Number(goal.value),
    Number(goal.goal)
  );

  const progress = Number(Number(goal.value) / Number(goal.goal));
  const item = {
    progress: Math.floor(+progress * 100),
    valueText: `${goal.value} de ${goal.goal}`,
    mainText:
      String(goal.goal).split(" ")[0].length > 5
        ? formatReaisResumo(
            Number(String(goal.value).split(" ")[0]),
            Number(
              String(goal.goal).split(" ")[
                String(goal.goal).split(" ").length - 1
              ]
            )
          )
        : `${goal.value} de ${goal.goal}`,
  };

  return (
    <Card className="bg-[#010d26] w-full col-span-1 text-white border-2 border-[#0126fb]">
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:flex-row">
        <div className="w-full flex flex-1 mt-4 items-center justify-around gap-4 px-4">
          <CircularProgress
            progress={item.progress}
            valueText={item.valueText}
          />
          {/* CORREÇÃO: Tamanho do texto aumentado para maior impacto */}
        </div>
        <div className="w-full flex flex-col gap-2 items-center justify-center">
          <CardTitle>{goal.title}</CardTitle>
          <CardDescription>{phrase}</CardDescription>
          <p className="hidden sm:block md:text-2xl text-lg font-bold text-white text-center leading-tight">
            {item.mainText}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoalCard;
