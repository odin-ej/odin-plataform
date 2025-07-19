import { FunctionDeclaration, SchemaType } from "@google/generative-ai";

export const googleSearchTool: FunctionDeclaration = {
  name: "searchGoogle",
  description:
    "Busca informações atualizadas na internet quando o modelo precisa saber algo em tempo real ou que não faz parte do seu conhecimento interno, como notícias, dados financeiros, clima, resultados de jogos, ou recomendações atuais.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "O termo de pesquisa a ser usado.",
      },
    },
    required: ["query"],
  },
};
// CORREÇÃO: A função agora usa 'fetch' para chamar a API do Google diretamente.
// Ela não depende de nenhum pacote externo.
export async function googleSearch({ query }: { query: string }) {
  try {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      throw new Error(
        "As chaves da API de Pesquisa do Google não estão configuradas."
      );
    }

    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${searchEngineId}&q=${encodeURIComponent(
      query
    )}`;

    const response = await fetch(url);
    if (!response.ok)
      throw new Error(`Erro na API do Google: ${response.statusText}`);

    const data = await response.json();
    const results =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.items?.map((item: any) => ({
        title: item.title,
        link: item.link,
        snippet: item.snippet,
      })) || [];

    return results.slice(0, 5);
  } catch (error) {
    console.error("Erro ao buscar no Google:", error);
    return [
      {
        title: "Erro",
        snippet: "Não foi possível realizar a busca.",
        link: "",
      },
    ];
  }
}
