/* eslint-disable @typescript-eslint/no-explicit-any */
import '../shared/prisma-fix.js';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse } from "../shared/utils";
import { getAuthenticatedUserFromEvent } from "../shared/auth";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const authUser = await getAuthenticatedUserFromEvent(event);
    if (!authUser) return createResponse(401, { message: "Não autorizado" });

    const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
    const MONDAY_API_URL = "https://api.monday.com/v2";
    const BOARD_IDS = [
      process.env.ALFA_BOARD,
      process.env.BETA_BOARD,
      process.env.DELTA_BOARD,
    ].filter(Boolean);

    if (!MONDAY_API_KEY || BOARD_IDS.length === 0) {
      return createResponse(500, {
        message: "Variáveis de ambiente do Monday.com não configuradas.",
      });
    }

    const query = `query { boards(ids: [${BOARD_IDS.join(", ")}]) { name, groups { id } } }`;

    const response = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: MONDAY_API_KEY,
        "API-Version": "2023-10",
      },
      body: JSON.stringify({ query }),
    });

    const result = await response.json();
    if (result.errors) {
      throw new Error(
        `Erro da API do Monday: ${JSON.stringify(result.errors)}`
      );
    }

    const projectStats = result.data.boards.map((board: any) => ({
      accountName: board.name,
      projectCount: board.groups?.length || 0,
    }));

    const totalProjects = projectStats.reduce(
      (sum: number, board: any) => sum + board.projectCount,
      0
    );

    return createResponse(200, { totalProjects, details: projectStats });
  } catch (error: any) {
    console.error("Erro ao conectar com o Monday.com:", error);
    return createResponse(500, {
      message: "Erro interno ao conectar com o Monday.com.",
      error: error.message,
    });
  }
};
