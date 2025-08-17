// /app/api/jr-points/versions/route.ts

import { prisma } from "@/db";
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission } from "@/lib/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

const createVersionSchema = z.object({
  versionName: z.string().min(3, "O nome da versão é obrigatório."),
  description: z.string().optional(),
  implementationDate: z.string().refine((d) => !isNaN(Date.parse(d))),
  endDate: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)))
    .optional()
    .nullable(),
});

export async function POST(request: Request) {
  try {
    const authUser = await getAuthenticatedUser();
    if (!authUser)
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
    const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
    if (!isDirector)
      return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

    const body = await request.json();
    const data = createVersionSchema.parse(body);

    const newVersion = await prisma.jRPointsVersion.create({
      data: {
        ...data,
        implementationDate: new Date(data.implementationDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    const allDirectorsId = await prisma.user.findMany({
      where: { currentRole: { area: { has: "DIRETORIA" } } },
      select: { id: true },
    });

    const notification = await prisma.notification.create({
      data: {
        link: `/gerenciar-jr-points`,
        type: "NEW_MENTION",
        notification: `Nova versão da JR Points criada: ${newVersion.versionName}. Por ${authUser.name}`,
      },
    });

    await prisma.notificationUser.createMany({
      data: allDirectorsId.filter((user) => user.id !== authUser.id).map((user) => ({
        notificationId: notification.id,
        userId: user.id,
      })),
    })

    return NextResponse.json(newVersion, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return new NextResponse(JSON.stringify(error.issues), { status: 400 });
    console.error("[VERSIONS_CREATE_ERROR]", error);
    return new NextResponse("Erro Interno do Servidor", { status: 500 });
  }
}
