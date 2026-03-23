import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

// ─── Respostas de API padronizadas ──────────────────────────────────

export function apiError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

/**
 * Trata erros comuns do Prisma e retorna respostas HTTP apropriadas.
 * Use dentro de blocos catch em API routes.
 */
export function handleApiError(error: unknown, context: string) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = (error.meta?.target as string[])?.join(", ") ?? "campo";
      return apiError(`O campo ${target} já está em uso.`, 409);
    }
    if (error.code === "P2025") {
      return apiError("Registro não encontrado.", 404);
    }
  }

  console.error(`Erro em ${context}:`, error);
  return apiError(`Erro ao processar ${context}.`, 500);
}
