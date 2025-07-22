/* eslint-disable @typescript-eslint/no-explicit-any */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { getPrismaClient } from "../shared/db";
import { getAuthenticatedUserFromEvent } from "../shared/auth";
import { createResponse } from "../shared/utils";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) {
      return createResponse(401, { message: "Não autorizado" });
    }

    const prisma = await getPrismaClient();

    const [
      userPointsData,
      rankingSettings,
      enterpriseData,
      allUsers,
      allTags,
      allActionTypes,
    ] = await Promise.all([
      prisma.userPoints.findMany({
        orderBy: { totalPoints: "desc" },
        include: {
          user: { select: { id: true, name: true, imageUrl: true } },
          _count: { select: { tags: true } },
        },
      }),
      prisma.jRPointsRanking.findUnique({ where: { id: 1 } }),
      prisma.enterprisePoints.findUnique({
        where: { id: 1 },
        include: {
          tags: {
            include: { actionType: true },
            orderBy: { datePerformed: "desc" },
          },
        },
      }),
      prisma.user.findMany({
        select: { id: true, name: true, imageUrl: true },
        where: { isExMember: false },
      }),
      prisma.tag.findMany({
        where: { userPointsId: null, enterprisePointsId: null },
        include: { actionType: true },
        orderBy: { datePerformed: "asc" },
      }),
      prisma.actionType.findMany({
        orderBy: { name: "asc" },
        include: { _count: { select: { tags: true } } },
      }),
    ]);

    const usersRanking = userPointsData.map(
      (item: {
        user: { id: any; name: any; imageUrl: any };
        totalPoints: any;
        _count: { tags: any };
      }) => ({
        id: item.user.id,
        name: item.user.name,
        imageUrl: item.user.imageUrl,
        totalPoints: item.totalPoints,
        tagsCount: item._count.tags,
      })
    );

    const responseData = {
      usersRanking: usersRanking,
      rankingIsHidden: rankingSettings?.isHidden ?? false,
      enterprisePoints: enterpriseData?.value ?? 0,
      enterpriseTags: enterpriseData?.tags ?? [],
      allUsers: allUsers,
      allTags: allTags,
      allActionTypes: allActionTypes,
    };

    return createResponse(200, responseData);
  } catch (error: any) {
    console.error("Erro ao buscar dados para a página de JR Points:", error);
    return createResponse(500, {
      message: "Ocorreu um erro no servidor.",
      error: error.message,
    });
  }
};
