import { EstrategyObjective, Goal } from ".prisma/client";
import GoalCard from "./GoalCard";
interface EstrategyObjectiveCardProps {
  estrategyObjective: EstrategyObjective & { goals: Goal[] };
  index: number;
}

const EstrategyObjectiveCard = ({
  estrategyObjective,
  index,
}: EstrategyObjectiveCardProps) => {
  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className='text-white text-center'>
        <h4 className='font-semibold text-lg sm:text-xl'>{index}º Objetivo Estratégico</h4>
        <h3 className='font-bold text-2xl sm:text-4xl py-2 max-w-[550px] mx-auto text-[#f5b719]'>{estrategyObjective.objective}</h3>
        <p className="text-zinc-500 text-md">{estrategyObjective.description}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {estrategyObjective.goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
};

export default EstrategyObjectiveCard;
