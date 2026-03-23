"use server";

import { prisma } from "@/db";
import { getAuthenticatedUser } from "@/lib/server-utils";
import {
  TraineeDepartment,
  TraineeGradeCategory,
  AreaRoles,
} from "@prisma/client";

// --- Types ---

export interface TraineeEvaluationData {
  traineeId: string;
  department: TraineeDepartment;
  category: TraineeGradeCategory;
  grade: number;
  feedback?: string;
}

export interface TraineeWithEvaluations {
  id: string;
  name: string;
  imageUrl: string;
  email: string;
  evaluations: {
    id: string;
    department: TraineeDepartment;
    category: TraineeGradeCategory;
    grade: number;
    feedback: string | null;
  }[];
}

// --- Helpers ---

function isDirector(user: Awaited<ReturnType<typeof getAuthenticatedUser>>) {
  if (!user) return false;
  return user.currentRole?.area.includes(AreaRoles.DIRETORIA) ?? false;
}

// --- Actions ---

/**
 * Busca avaliações de um trainee. Se traineeId não for fornecido,
 * retorna as avaliações do usuário logado.
 */
export async function getTraineeEvaluations(traineeId?: string) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Não autenticado");

  const targetId = traineeId ?? user.id;

  // Se não for diretor e está tentando ver de outro usuário, nega
  if (targetId !== user.id && !isDirector(user)) {
    throw new Error("Sem permissão");
  }

  const evaluations = await prisma.traineeEvaluation.findMany({
    where: { traineeId: targetId },
    orderBy: [{ department: "asc" }, { category: "asc" }],
  });

  return evaluations;
}

/**
 * Cria ou atualiza uma avaliação de trainee.
 * Apenas diretores podem chamar esta action.
 */
export async function upsertTraineeEvaluation(data: TraineeEvaluationData) {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Não autenticado");
  if (!isDirector(user)) throw new Error("Sem permissão");

  if (data.grade < 0 || data.grade > 10) {
    throw new Error("Nota deve estar entre 0 e 10");
  }

  const evaluation = await prisma.traineeEvaluation.upsert({
    where: {
      traineeId_department_category: {
        traineeId: data.traineeId,
        department: data.department,
        category: data.category,
      },
    },
    update: {
      grade: data.grade,
      feedback: data.feedback ?? null,
      evaluatorId: user.id,
    },
    create: {
      traineeId: data.traineeId,
      evaluatorId: user.id,
      department: data.department,
      category: data.category,
      grade: data.grade,
      feedback: data.feedback ?? null,
    },
  });

  return evaluation;
}

/**
 * Lista todos os usuários com role "Trainee".
 */
export async function getTrainees(): Promise<TraineeWithEvaluations[]> {
  const user = await getAuthenticatedUser();
  if (!user) throw new Error("Não autenticado");

  const trainees = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          name: "Trainee",
        },
      },
      isExMember: false,
    },
    select: {
      id: true,
      name: true,
      imageUrl: true,
      email: true,
      traineeEvaluations: {
        select: {
          id: true,
          department: true,
          category: true,
          grade: true,
          feedback: true,
        },
        orderBy: [{ department: "asc" }, { category: "asc" }],
      },
    },
    orderBy: { name: "asc" },
  });

  return trainees.map((t) => ({
    ...t,
    evaluations: t.traineeEvaluations,
  }));
}

/**
 * Dados agregados para o overview dos diretores.
 * Retorna médias por trainee e departamento.
 */
export async function getTraineeOverview() {
  const trainees = await getTrainees();

  const departments = Object.values(TraineeDepartment);

  const overview = trainees.map((trainee) => {
    const departmentAverages: Record<string, number> = {};
    let totalGrades = 0;
    let totalCount = 0;

    for (const dept of departments) {
      const deptEvals = trainee.evaluations.filter(
        (e) => e.department === dept
      );
      if (deptEvals.length > 0) {
        const avg =
          deptEvals.reduce((sum, e) => sum + e.grade, 0) / deptEvals.length;
        departmentAverages[dept] = Math.round(avg * 10) / 10;
        totalGrades += deptEvals.reduce((sum, e) => sum + e.grade, 0);
        totalCount += deptEvals.length;
      } else {
        departmentAverages[dept] = 0;
      }
    }

    return {
      id: trainee.id,
      name: trainee.name,
      imageUrl: trainee.imageUrl,
      departmentAverages,
      overallAverage:
        totalCount > 0 ? Math.round((totalGrades / totalCount) * 10) / 10 : 0,
    };
  });

  return overview;
}
