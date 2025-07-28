/* eslint-disable @typescript-eslint/no-explicit-any */
import { DIRECTORS_ONLY } from "@/lib/permissions";
import { getAuthenticatedUser } from "@/lib/server-utils";
import { checkUserPermission, parseBrazilianDate } from "@/lib/utils";
import { TagAreas } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import z from "zod";

// /api/tags/[id]/route.ts

const tagUpdateSchema = z.object({
  description: z.string().min(5).optional(),
  value: z.number().optional(),
  actionTypeId: z.string().optional(),
  areas: z
    .array(z.nativeEnum(TagAreas))
    .min(1, "Selecione pelo menos uma área."),
  datePerformed: z.string().optional(), // Converte string para Date automaticamente
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // ... (sua lógica de autenticação e permissão permanece igual)
  const authUser = await getAuthenticatedUser();
  if (!authUser)
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
  if (!isDirector)
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });

  try {
    const { id } = await params;
    const body = await request.json();

    // Lógica de desvincular (não precisa de mudanças)
    if (body.userPointsId === null && Object.keys(body).length === 1) {
      // ... sua lógica de desvincular ...
      return NextResponse.json({ message: "Tag desvinculada com sucesso." });
    }

    // Lógica de atualização de dados
    const validation = tagUpdateSchema.partial().safeParse(body);
    if (!validation.success || Object.keys(validation.data).length === 0) {
      return NextResponse.json(
        {
          message: "Nenhum dado válido para atualização fornecido.",
          errors: validation?.error?.formErrors,
        },
        { status: 400 }
      );
    }

    const formatedDate =
      typeof validation.data.datePerformed === "string"
        ? (parseBrazilianDate(validation.data.datePerformed) as Date)
        : new Date(validation.data.datePerformed!);
    const newData = { ...validation.data, datePerformed: formatedDate };

    await prisma.$transaction(
      async (tx: {
        tag: {
          findUnique: (arg0: { where: { id: string } }) => any;
          findMany: (arg0: {
            where:
              | { description: any; value: any; userPointsId: { not: null } }
              | {
                  description: any;
                  value: any;
                  enterprisePointsId: { not: null };
                };
          }) => any;
          updateMany: (arg0: {
            where: { id: { in: any[] } };
            data: any;
          }) => any;
          update: (arg0: {
            where: { id: string } | { id: string };
            data: any;
          }) => any;
        };
        userPoints: {
          updateMany: (arg0: {
            where: { id: { in: any } };
            data: { totalPoints: { increment: number } };
          }) => any;
          update: (arg0: {
            where: { id: any };
            data: { totalPoints: { increment: number } };
          }) => any;
        };
        enterprisePoints: {
          update: (arg0: {
            where: { id: number } | { id: any };
            data:
              | { value: { increment: number } }
              | { value: { increment: number } };
          }) => any;
        };
      }) => {
        const originalTag = await tx.tag.findUnique({ where: { id } });
        if (!originalTag) {
          throw new Error("Tag não encontrada.");
        }

        const isModelTag =
          originalTag.userPointsId === null &&
          originalTag.enterprisePointsId === null;

        if (isModelTag) {
          const userClones = await tx.tag.findMany({
            where: {
              description: originalTag.description,
              value: originalTag.value,
              userPointsId: { not: null },
            },
          });
          const enterpriseClones = await tx.tag.findMany({
            where: {
              description: originalTag.description,
              value: originalTag.value,
              enterprisePointsId: { not: null },
            },
          });

          const valueIsChanging =
            typeof newData.value === "number" &&
            newData.value !== originalTag.value;
          if (valueIsChanging) {
            const pointDifference = Number(!newData.value) - +originalTag.value;
            if (userClones.length > 0) {
              await tx.userPoints.updateMany({
                where: {
                  id: {
                    in: userClones.map(
                      (c: { userPointsId: any }) => c.userPointsId!
                    ),
                  },
                },
                data: { totalPoints: { increment: pointDifference } },
              });
            }
            if (enterpriseClones.length > 0) {
              const totalEnterpriseDifference =
                pointDifference * enterpriseClones.length;
              await tx.enterprisePoints.update({
                where: { id: 1 },
                data: { value: { increment: totalEnterpriseDifference } },
              });
            }
          }

          // ✅ Prepara os dados para as clones, EXCLUINDO a data
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { datePerformed, ...dataForClones } = newData;

          const allCloneIds = [
            ...userClones.map((c: { id: any }) => c.id),
            ...enterpriseClones.map((c: { id: any }) => c.id),
          ];
          if (allCloneIds.length > 0) {
            await tx.tag.updateMany({
              where: { id: { in: allCloneIds } },
              data: dataForClones, // Usa os dados sem a data
            });
          }

          // Atualiza a tag modelo com todos os dados (incluindo a data)
          await tx.tag.update({ where: { id }, data: newData });
        } else {
          // Lógica para atualizar uma única tag individual (clone)
          const pointDifference =
            typeof newData.value === "number"
              ? newData.value - originalTag.value
              : 0;
          if (pointDifference !== 0) {
            if (originalTag.userPointsId) {
              await tx.userPoints.update({
                where: { id: originalTag.userPointsId },
                data: { totalPoints: { increment: pointDifference } },
              });
            }
            if (originalTag.enterprisePointsId) {
              await tx.enterprisePoints.update({
                where: { id: originalTag.enterprisePointsId },
                data: { value: { increment: pointDifference } },
              });
            }
          }
          await tx.tag.update({ where: { id }, data: newData });
        }
      }
    );

    revalidatePath("/jr-points/nossa-empresa");
    return NextResponse.json({ message: "Tag(s) atualizada(s) com sucesso." });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Erro ao atualizar a tag.", error: error.message },
      { status: 500 }
    );
  }
}

// /api/tags/[id]/route.ts

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authUser = await getAuthenticatedUser();
  if (!authUser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 401 });
  }

  const isDirector = checkUserPermission(authUser, DIRECTORS_ONLY);
  if (!isDirector) {
    return NextResponse.json({ message: "Acesso negado." }, { status: 403 });
  }

  try {
    const { id } = await params;

    await prisma.$transaction(
      async (tx: {
        tag: {
          findUnique: (arg0: { where: { id: string } }) => any;
          findMany: (arg0: {
            where:
              | { description: any; value: any; userPointsId: { not: null } }
              | {
                  description: any;
                  value: any;
                  enterprisePointsId: { not: null };
                };
          }) => any;
          deleteMany: (arg0: { where: { id: { in: any[] } } }) => any;
          delete: (arg0: { where: { id: any } | { id: any } }) => any;
        };
        userPoints: {
          update: (arg0: {
            where: { id: any } | { id: any };
            data:
              | { totalPoints: { decrement: any } }
              | { totalPoints: { decrement: any } };
          }) => any;
        };
        enterprisePoints: {
          update: (arg0: {
            where: { id: number } | { id: any };
            data: { value: { decrement: any } } | { value: { decrement: any } };
          }) => any;
        };
      }) => {
        const tagToDelete = await tx.tag.findUnique({
          where: { id },
        });
        console.log('TagToDelete:',tagToDelete)
        if (!tagToDelete) {
          throw new Error("Tag não encontrada.");
        }

        // ✅ DEFINIÇÃO ATUALIZADA: Um modelo não está ligado a ninguém.
        const isModelTag =
          tagToDelete.userPointsId === null &&
          tagToDelete.enterprisePointsId === null;
          console.log('isModelTag: ',isModelTag)
        if (isModelTag) {
          // --- LÓGICA PARA APAGAR UM MODELO E TODOS OS SEUS CLONES ---

          // a. Encontra clones de utilizadores e da empresa
          const userClones = await tx.tag.findMany({
            where: {
              description: tagToDelete.description,
              value: tagToDelete.value,
              userPointsId: { not: null },
            },
          });
          const enterpriseClones = await tx.tag.findMany({
            where: {
              description: tagToDelete.description,
              value: tagToDelete.value,
              enterprisePointsId: { not: null },
            },
          });
console.log('UserClones: ',userClones)
          // b. Reverte pontos dos utilizadores
          if (userClones.length > 0) {
            for (const clone of userClones) {
              await tx.userPoints.update({
                where: { id: clone.userPointsId! },
                data: { totalPoints: { decrement: clone.value } },
              });
            }
          }
          console.log('EnterpriseClones: ',enterpriseClones)
          
          // c. Reverte pontos da empresa
          if (enterpriseClones.length > 0) {
            const totalValueToDecrement = enterpriseClones.reduce(
              (sum: any, clone: { value: any }) => sum + clone.value,
              0
            );
            await tx.enterprisePoints.update({
              where: { id: 1 }, // Assumindo que o ID é sempre 1
              data: { value: { decrement: totalValueToDecrement } },
            });
          }

          // d. Apaga todos os clones (de utilizadores e da empresa)
          const allCloneIds = [
            ...userClones.map((c: { id: any }) => c.id),
            ...enterpriseClones.map((c: { id: any }) => c.id),
          ];

          if (allCloneIds.length > 0) {
            await tx.tag.deleteMany({
              where: { id: { in: allCloneIds } },
            });
          }
          console.log('AllCloneIds: ',allCloneIds)
          // e. Apaga a tag modelo
          await tx.tag.delete({ where: { id: tagToDelete.id } });
        } else {
          // --- LÓGICA PARA APAGAR UMA ÚNICA TAG ASSOCIADA ---
          if (tagToDelete.userPointsId) {
            await tx.userPoints.update({
              where: { id: tagToDelete.userPointsId },
              data: { totalPoints: { decrement: tagToDelete.value } },
            });
          }
          if (tagToDelete.enterprisePointsId) {
            await tx.enterprisePoints.update({
              where: { id: tagToDelete.enterprisePointsId },
              data: { value: { decrement: tagToDelete.value } },
            });
          }
          console.log('TagToDelete IsNot Model: ',tagToDelete)
          await tx.tag.delete({ where: { id: tagToDelete.id } });
        }
      }
    );

    revalidatePath("/jr-points/nossa-empresa");
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    console.error(error)
    return NextResponse.json(
      { message: "Erro ao apagar tag.", error: error.message },
      { status: 500 }
    );
  }
}
