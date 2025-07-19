import { NextResponse } from "next/server";

export async function GET() {
  const MONDAY_API_KEY = process.env.MONDAY_API_KEY;
  const MONDAY_API_URL = "https://api.monday.com/v2";

  // Substitua pelos IDs dos seus quadros
  const BOARD_IDS = [
    process.env.ALFA_BOARD,
    process.env.BETA_BOARD,
    process.env.DELTA_BOARD,
  ].filter(Boolean);

  if (!MONDAY_API_KEY) {
    return NextResponse.json({ message: "Chave da API do Monday.com não configurada." }, { status: 500 });
  }

  if (BOARD_IDS.length === 0) {
      return NextResponse.json({ message: "IDs de quadro do Monday.com não configurados." }, { status: 500 });
  }

  // Consulta GraphQL para buscar o nome e a contagem de itens (projetos)
  // de múltiplos quadros de uma só vez.
   const query = `
    query {
      boards(ids: [${BOARD_IDS.join(", ")}]) {
        name
        groups {
          id
        }
      }
    }
  `;

  try {
    const response = await fetch(MONDAY_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": MONDAY_API_KEY,
        "API-Version": "2023-10",
      },
      body: JSON.stringify({ query }),
      next: { revalidate: 3600 }, // Revalida a cada 1 hora
    });

    const result = await response.json();

    if (result.errors) {
      console.error("Erro da API do Monday:", result.errors);
      throw new Error("Falha ao buscar dados do Monday.com.");
    }

    const data = result.data;
    
    // Estrutura os dados, contando o número de grupos em cada quadro
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const projectStats = data.boards.map((board: { name: string; groups: any[] }) => ({
        accountName: board.name,
        projectCount: board.groups?.length || 0,
    }));
    
    const totalProjects = projectStats.reduce((sum: number, board: { projectCount: number; }) => sum + board.projectCount, 0);

    return NextResponse.json({
        totalProjects,
        details: projectStats
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Erro interno ao conectar com o Monday.com." },
      { status: 500 }
    );
  }
}
