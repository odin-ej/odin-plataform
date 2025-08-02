import { z } from "zod";
import { prisma } from "@/db";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { TagAreas } from "@prisma/client";
import { checkUserPermission } from "@/lib/utils";
import { DIRECTORS_ONLY } from "@/lib/permissions";

const tagSchema = z.object({
  description: z.string().min(5, "A descrição é obrigatória."),
  value: z.string().min(1, "O valor é obrigatório."), // Permite qualquer número: positivo, negativo ou zero.ghi
  actionTypeId: z.string({
    required_error: "É necessário selecionar um tipo de ação.",
  }),
  areas: z
    .array(z.nativeEnum(TagAreas))
    .min(1, "Selecione pelo menos uma área."),
  assignerId: z.string().optional(),
});

export async function POST(request: Request) {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  const hasPermission = checkUserPermission(authUser, DIRECTORS_ONLY);

  if (!hasPermission) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }
  try {
    const body = await request.json();
    const validation = tagSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: validation.error.formErrors },
        { status: 400 }
      );
    }
    const { value } = validation.data;

    const formatedValue = value.replace(",", ".").match(/^-?\d+(\.\d+)?$/)
      ? parseFloat(value)
      : value;

    if (
      isNaN(formatedValue as number) ||
      typeof formatedValue !== "number" ||
      !formatedValue
    ) {
      return NextResponse.json(
        { message: "O valor deve ser um número." },
        { status: 400 }
      );
    }

    const newTag = await prisma.tag.create({
      data: {
        ...validation.data,
        value: formatedValue,
        assignerId: authUser.id,
        areas: validation.data.areas,
        datePerformed: new Date(),
      },
    });
    return NextResponse.json(newTag, { status: 201 });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json(
      { message: "Erro ao criar tag.", error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  const authUser = await getAuthenticatedUser();

  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  try {
    const tags = await prisma.tag.findMany();
    return NextResponse.json(tags);
  } catch (error) {
    console.error("Erro ao buscar tags:", error);
    return NextResponse.json(
      { message: "Erro ao buscar tags." },
      { status: 500 }
    );
  }
}
