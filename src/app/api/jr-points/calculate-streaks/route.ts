import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { differenceInDays } from "date-fns";
import { Prisma } from "@prisma/client";

// Schema para cada item de cálculo individual
const streakCalculationRequestSchema = z.object({
  userId: z.string().optional(), // Opcional, pois não é usado no caso da empresa
  tagTemplateId: z.string(),
});

// Schema para o corpo completo da requisição
const calculateStreaksSchema = z.object({
  requests: z.array(streakCalculationRequestSchema),
  datePerformed: z.string().datetime(), // Espera uma data no formato ISO
  isForEnterprise: z.boolean().default(false), // Flag para diferenciar o tipo de cálculo
});

export async function POST(request: Request) {
  try {
    // Autenticação e Autorização
    const authUser = await getAuthenticatedUser();
    if (!authUser || !checkUserPermission(authUser, DIRECTORS_ONLY)) {
      return NextResponse.json({ message: "Acesso negado" }, { status: 403 });
    }

    // Validação do Corpo da Requisição
    const body = await request.json();
    const validation = calculateStreaksSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({ message: "Dados inválidos.", errors: validation.error.flatten() }, { status: 400 });
    }

    const { requests, datePerformed, isForEnterprise } = validation.data;
    const performedDateObject = new Date(datePerformed);

    // Objeto para armazenar os resultados calculados
    const calculatedValues: Record<string, number> = {};

    for (const req of requests) {
      const { userId, tagTemplateId } = req;

      // Validação para garantir que o userId exista para cálculos de usuário
      if (!isForEnterprise && !userId) {
        return NextResponse.json({ message: `Faltando userId para o cálculo de streak do usuário.` }, { status: 400 });
      }
      
      const tagTemplate = await prisma.tagTemplate.findUnique({ where: { id: tagTemplateId } });
      if (!tagTemplate) continue; // Pula se o modelo não for encontrado

      let finalValue = tagTemplate.baseValue;

      // Lógica de Streak
      if (tagTemplate.isScalable && tagTemplate.escalationValue != null && tagTemplate.escalationStreakDays != null) {
        
        // --- LÓGICA CONDICIONAL PARA A CONSULTA ---
        const whereClause: Prisma.TagFindFirstArgs['where'] = {
          templateId: tagTemplateId,
        };

        if (isForEnterprise) {
          whereClause.enterprisePointsId = 1;
        } else {
          whereClause.userPoints = { userId: userId! };
        }
        // -----------------------------------------

        const lastInstance = await prisma.tag.findFirst({
          where: whereClause,
          orderBy: { datePerformed: "desc" },
        });

        if (lastInstance) {
          const daysSinceLast = differenceInDays(performedDateObject, lastInstance.datePerformed);
          if (daysSinceLast <= tagTemplate.escalationStreakDays) {
            const bonus = tagTemplate.baseValue >= 0 
                ? Math.abs(tagTemplate.escalationValue) 
                : -Math.abs(tagTemplate.escalationValue);
            finalValue = lastInstance.value + bonus;
          }
        }
      }
      
      // --- CHAVE DE RESPOSTA CONDICIONAL ---
      const key = isForEnterprise ? `enterprise-${tagTemplateId}` : `${userId}-${tagTemplateId}`;
      calculatedValues[key] = finalValue;
    }

    return NextResponse.json(calculatedValues);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Erro ao calcular streaks:", error);
    return NextResponse.json({ message: "Erro interno do servidor.", error: error.message }, { status: 500 });
  }
}