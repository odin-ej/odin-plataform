import { TaskStatus } from "@prisma/client";
import { FullTask } from "./schemas/projectsAreaSchema";
export const sortTasks = (tasks: FullTask[]) => {
  const pending = tasks.filter(
    (t) => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELED
  );
  const completedOrCanceled = tasks.filter(
    (t) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.CANCELED
  );

  // Ordena pendentes pela deadline mais próxima
  pending.sort(
    (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
  );
  // Ordena concluídas/canceladas pela data de atualização mais recente
  completedOrCanceled.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  return [...pending, ...completedOrCanceled];
};
