/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { RDSDataClient, ExecuteStatementCommand } from "@aws-sdk/client-rds-data";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";
import { Context, APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

// Importações para o Google Gemini/Search (ajuste os caminhos conforme sua estrutura de projeto)
// Certifique-se de que essas funções e suas dependências estão disponíveis para a Lambda.
// O esbuild irá empacotar essas dependências.

import { Content, Part, Tool } from "@google/generative-ai";
import { isSameDay } from "date-fns";
import { googleSearch, googleSearchTool } from "@/lib/ai-tools";
import { embeddingModel, geminiFlash, geminiPro } from "@/lib/gemini";
import { checkCommonMessages, simpleKeywords, toolKeywords } from "@/lib/ai-utils";
import { normalizeString } from "@/lib/format";
import { DIRECTORS_ONLY } from "@/lib/permissions";

// --- Configurações do RDS Data API ---
// Estes valores serão obtidos de variáveis de ambiente da Lambda.
const dbClusterArn = process.env.DB_CLUSTER_ARN;
const dbSecretArn = process.env.DB_SECRET_ARN;
const dbName = process.env.DB_NAME || "odin";

// Cliente do RDS Data API
const rdsDataClient = new RDSDataClient({ region: process.env.AWS_REGION });
const secretsManagerClient = new SecretsManagerClient({ region: process.env.AWS_REGION });

// --- Funções Auxiliares para Interagir com o Banco de Dados via RDS Data API ---

/**
 * Executa uma instrução SQL no banco de dados usando o RDS Data API.
 * @param sql A string SQL a ser executada.
 * @param parameters Parâmetros para a query, no formato do RDS Data API.
 * @returns Os registros retornados pela query.
 */
async function executeSql(sql: string, parameters: any[] = []) {
  if (!dbClusterArn || !dbSecretArn) {
    throw new Error("DB_CLUSTER_ARN ou DB_SECRET_ARN não configurados para RDS Data API.");
  }

  const command = new ExecuteStatementCommand({
    resourceArn: dbClusterArn,
    secretArn: dbSecretArn,
    database: dbName,
    sql: sql,
    parameters: parameters,
  });

  try {
    const response = await rdsDataClient.send(command);
    // O RDS Data API retorna 'records' onde cada record é um array de objetos de valor.
    // Precisamos converter isso para um formato mais utilizável.
    return response.records?.map((record: any[]) => {
      const obj: { [key: string]: any } = {};
      record.forEach((field: any) => {
        // Cada campo é um objeto com uma única chave (o tipo de valor)
        const key = Object.keys(field)[0];
        obj[key] = field[key];
      });
      return obj;
    }) || [];
  } catch (error) {
    console.error("Erro ao executar SQL via RDS Data API:", error);
    throw error;
  }
}

// --- Adaptações das Funções de Utilitário do Servidor para usar RDS Data API ---
// Você precisará adaptar a lógica original dessas funções para usar executeSql.

async function getAuthenticatedUserAdapted(requestHeaders: any): Promise<{ id: string } | null> {
  // Sua lógica original de autenticação do usuário.
  // Se ela usa Prisma para buscar o usuário, refatore para usar executeSql.
  // Ex: Decodificar o token JWT do Cognito e validar.
  const authHeader = requestHeaders['authorization'] || requestHeaders['Authorization']; // Headers podem ser case-insensitive
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // Aqui você faria a validação real do token JWT (Cognito)
    // Usando uma biblioteca como 'aws-jwt-verify'
    // Por simplicidade, vamos simular um ID de usuário a partir de um token válido
    // Em produção, você DEVE validar o token JWT completamente.
    try {
        // Exemplo de validação SIMPLIFICADA (NÃO SEGURA PARA PROD)
        // Você usaria aws-jwt-verify ou similar aqui
        const decodedToken = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
        return { id: decodedToken.sub }; // 'sub' é o ID do usuário no Cognito
    } catch (e) {
        console.error("Erro ao decodificar token:", e);
        return null;
    }
  }
  return null;
}

async function checkUserPermissionAdapted(userId: string, permission: string): Promise<boolean> {
  // Refatorar para buscar roles do usuário via RDS Data API
  const userRolesRecords = await executeSql(
    `SELECT r.name FROM "User" u JOIN "_UserRoles" ur ON u.id = ur."A" JOIN "Role" r ON ur."B" = r.id WHERE u.id = :userId`,
    [{ name: "userId", value: { stringValue: userId } }]
  );
  return userRolesRecords.some((role: any) => role.name === permission);
}

async function getConversationHistoryAdapted(conversationId: string): Promise<Content[]> { // Alterado para Promise<Content[]>
  const messages = await executeSql(
    `SELECT "role", "content" FROM "Message" WHERE "conversationId" = :conversationId ORDER BY "createdAt" ASC`,
    [{ name: "conversationId", value: { stringValue: conversationId } }]
  );

  return messages.map((msg: any) => ({
    role: msg.role.stringValue, // Acessar o valor da string
    parts: [{ text: msg.content.stringValue }], // Envolver o texto em um array de Part
  }));
}

// --- Restante da Lógica da Sua Rota de Chat (Adaptada para RDS Data API) ---

const tools: Tool[] = [
  {
    functionDeclarations: [googleSearchTool],
  },
];

const systemPrompt = `
Você é Hórus IA, um assistente de inteligência artificial para a Empresa Júnior ADM UFBA. 
O seu propósito é ajudar os membros a encontrar informações, analisar dados e impulsionar os sonhos da empresa.
Responda sempre de forma prestativa, profissional e alinhada com os valores da empresa.
Quando um utilizador fizer uma pergunta, responda como se fosse Hórus IA.
`;

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 2; // 20MB

const getModelForPrompt = (prompt: string, forcePro = false) => {
  if (forcePro) return geminiPro;

  const isSimple = simpleKeywords.some((kw: string) => // Adicionado tipo explícito para kw
    prompt.toLowerCase().includes(kw)
  );

  return isSimple ? geminiFlash : geminiPro;
};

const shouldUseTools = (prompt: string) => {
  const normalized = normalizeString(prompt);
  return toolKeywords.some((kw: string) => normalized.includes(normalizeString(kw))); // Adicionado tipo explícito para kw
};

async function generateTitle(prompt: string): Promise<string> {
  const titlePrompt = `Gere um título curto e conciso (máximo 5 palavras, sem aspas) para a seguinte pergunta: "${prompt}"`;
  const titleResult = await geminiFlash.generateContent(titlePrompt);
  return titleResult.response.text().replace(/"/g, "").trim();
}

/**
 * Handler principal da função AWS Lambda para a rota de chat.
 * Esta função será invocada pelo Amazon API Gateway.
 * @param event O objeto de evento da requisição HTTP do API Gateway.
 * @param context O objeto de contexto da invocação Lambda.
 * @returns Um objeto de resultado Lambda com statusCode e body.
 */
export async function handler(event: APIGatewayProxyEventV2, context: Context): Promise<APIGatewayProxyResultV2> {
  console.log('Início da execução da função Lambda de chat.');
  console.log('Evento recebido:', JSON.stringify(event, null, 2));

  try {
    // 1. Obter usuário autenticado (adaptado para não usar Prisma diretamente)
    const authUser = await getAuthenticatedUserAdapted(event.headers);
    if (!authUser) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Não autorizado" }),
      };
    }

    // 2. Parsear o corpo da requisição
    const { prompt, conversationId, fileData } = JSON.parse(event.body || '{}');
    if (!prompt) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "A pergunta é obrigatória." }),
      };
    }

    // 3. Obter dados do usuário via RDS Data API
    const userRecords = await executeSql(
      `SELECT "id", "dailyMessageCount", "lastMessageDate" FROM "User" WHERE "id" = :userId`,
      [{ name: "userId", value: { stringValue: authUser.id } }]
    );
    const user = userRecords[0]; // Assumindo que o ID é único e sempre retorna 1 registro

    if (!user) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Perfil não encontrado." }),
      };
    }

    // 4. Lógica de limite de mensagens (adaptada para usar dados do Data API)
    const isDirector = await checkUserPermissionAdapted(user.id.stringValue, DIRECTORS_ONLY as string); // Passa o ID do usuário
    const messageLimit = isDirector ? 40 : 20;
    const today = new Date();
    let currentCount = user.dailyMessageCount.longValue; // Acessar o valor numérico
    const userLastMessageDate = user.lastMessageDate?.stringValue ? new Date(user.lastMessageDate.stringValue) : null; // Acessar o valor da string

    if (userLastMessageDate && isSameDay(userLastMessageDate, today)) {
      if (currentCount >= messageLimit) {
        return {
          statusCode: 429,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Você atingiu o seu limite de mensagens diárias." }),
        };
      }
    } else {
      currentCount = 0;
    }

    // 5. Lógica de mensagens comuns
    const normalizedPrompt = normalizeString(prompt);
    const handled = checkCommonMessages(normalizedPrompt);
    if (handled) {
      // Usar RDS Data API para criar mensagens
      await executeSql(
        `INSERT INTO "Message" ("role", "content", "conversationId", "createdAt") VALUES (:role1, :content1, :convId1, :createdAt1), (:role2, :content2, :convId2, :createdAt2)`,
        [
          { name: "role1", value: { stringValue: "user" } },
          { name: "content1", value: { stringValue: prompt } },
          { name: "convId1", value: { stringValue: conversationId } },
          { name: "createdAt1", value: { stringValue: new Date().toISOString() } },
          { name: "role2", value: { stringValue: "model" } },
          { name: "content2", value: { stringValue: handled } },
          { name: "convId2", value: { stringValue: conversationId } },
          { name: "createdAt2", value: { stringValue: new Date().toISOString() } },
        ]
      );
      // revalidatePath não funciona em Lambda autônoma, trate a revalidação no frontend
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: handled }),
      };
    }

    // 6. Lógica de embedding e busca de contexto (Prisma.$queryRaw adaptado para RDS Data API)
    const embedding = await embeddingModel.embedContent(prompt);
    const vector = embedding.embedding.values;

    // ATENÇÃO: A query raw com '<->' (operador pg_vector) pode precisar de adaptação
    // para ser executada via RDS Data API, dependendo de como o Data API lida com tipos customizados.
    // Pode ser necessário passar o vetor como string e converter no SQL.
    const contextChunksRecords = await executeSql(
      `SELECT content FROM "KnowledgeChunk" ORDER BY embedding <-> :vector::vector LIMIT 3`,
      [{ name: "vector", value: { stringValue: `[${vector.join(',')}]` } }] // Passa o vetor como string para o SQL
    );
    const context = contextChunksRecords.map((c: any) => c.content.stringValue).join("\n---\n"); // Acessar o valor da string
    const finalPrompt = `Com base no seguinte contexto da nossa empresa:\n\n${context}\n\nResponda à pergunta do utilizador: "${prompt}"`;

    const modelParts: Part[] = [{ text: finalPrompt }];

    // 7. Lógica de manipulação de arquivos (fileData)
    if (fileData) {
      const estimatedSize = (fileData.base64.length * 3) / 4;
      if (estimatedSize > MAX_FILE_SIZE) {
        return {
          statusCode: 413,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: "Arquivo muito grande." }),
        };
      }
      modelParts.push({
        inlineData: {
          mimeType: fileData.mimeType,
          data: fileData.base64,
        },
      });
    }

    // 8. Lógica de histórico de conversas (adaptada para usar getConversationHistoryAdapted)
    const history = await getConversationHistoryAdapted(conversationId);
    while (history.length > 0 && history[0].role !== "user") {
      history.shift();
    }
    if (
      history.length % 2 !== 0 &&
      history[history.length - 1].role === "model"
    ) {
      history.pop();
    }
    if (history.length > 0 && history[history.length - 1].role === "model") {
      history.pop();
    }
    const useTools = shouldUseTools(prompt);

    const model = getModelForPrompt(prompt, useTools);
    const chat = model.startChat({
      history,
      systemInstruction: systemPrompt,
      ...(useTools && { tools }),
    });

    const result = await chat.sendMessage(modelParts);
    let aiResponse = result.response.text().trim();
    const functionCall = result.response.candidates?.[0]?.content?.parts?.find(
      (p: any) => "functionCall" in p // Adicionado tipo explícito para p
    )?.functionCall;

    // 9. Lógica de chamada de ferramenta (Google Search)
    if (functionCall?.name === "searchGoogle") {
      const searchResult = await googleSearch(
        functionCall.args as { query: string }
      );

      const result2 = await chat.sendMessage([
        {
          functionResponse: {
            name: "googleSearch",
            response: { content: searchResult },
          },
        },
      ]);

      aiResponse = result2.response.text().trim();
    }

    // 10. Lógica de retry para ferramentas
    if (useTools && !functionCall && !aiResponse.includes("google")) {
      const retry = await chat.sendMessage([
        {
          text: `Use a ferramenta googleSearch para buscar as informações mais recentes antes de responder.`,
        },
      ]);

      const retryCall =
        retry.response.candidates?.[0]?.content?.parts?.[0]?.functionCall;

      if (retryCall?.name === "googleSearch") {
        const searchResult = await googleSearch(
          retryCall.args as { query: string }
        );

        const retryResponse = await chat.sendMessage([
          {
            functionResponse: {
              name: "googleSearch",
              response: { content: searchResult },
            },
          },
        ]);

        aiResponse = retryResponse.response.text().trim();
      }
    }

    if (!aiResponse) {
      return {
        statusCode: 502,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: "Resposta da IA vazia." }),
      };
    }

    // 11. Lógica de contagem de mensagens e título (adaptada para RDS Data API)
    const messageCountRecords = await executeSql(
      `SELECT COUNT(*) FROM "Message" WHERE "conversationId" = :conversationId AND "role" = 'user'`,
      [{ name: "conversationId", value: { stringValue: conversationId } }]
    );
    const messageCount = messageCountRecords[0]?.count?.longValue || 0; // Acessar o valor numérico

    let updatedTitle: string | null = null;
    if (messageCount === 0) {
      updatedTitle = await generateTitle(prompt);
    }

    // 12. Transação para criar mensagens e atualizar conversa/usuário (adaptada para RDS Data API)
    // Para garantir atomicidade, você deve implementar transações explícitas com BEGIN, COMMIT, ROLLBACK via executeSql.
    // O exemplo abaixo faz as operações sequencialmente (menos ideal para atomicidade sem transação explícita).

    await executeSql(
      `INSERT INTO "Message" ("role", "content", "conversationId", "createdAt") VALUES (:role1, :content1, :convId1, :createdAt1), (:role2, :content2, :convId2, :createdAt2)`,
      [
        { name: "role1", value: { stringValue: "user" } },
        { name: "content1", value: { stringValue: prompt } },
        { name: "convId1", value: { stringValue: conversationId } },
        { name: "createdAt1", value: { stringValue: new Date().toISOString() } },
        { name: "role2", value: { stringValue: "model" } },
        { name: "content2", value: { stringValue: aiResponse } },
        { name: "convId2", value: { stringValue: conversationId } },
        { name: "createdAt2", value: { stringValue: new Date().toISOString() } },
      ]
    );

    const updateConversationSql = `UPDATE "Conversation" SET "updatedAt" = :updatedAt ${updatedTitle ? ', "title" = :title' : ''} WHERE "id" = :conversationId`;
    const updateConversationParams: any[] = [
      { name: "updatedAt", value: { stringValue: new Date().toISOString() } },
      { name: "conversationId", value: { stringValue: conversationId } },
    ];
    if (updatedTitle) updateConversationParams.push({ name: "title", value: { stringValue: updatedTitle } });
    await executeSql(updateConversationSql, updateConversationParams);

    await executeSql(
      `UPDATE "User" SET "dailyMessageCount" = "dailyMessageCount" + 1, "lastMessageDate" = :lastMessageDate WHERE "id" = :userId`,
      [
        { name: "lastMessageDate", value: { stringValue: new Date().toISOString() } },
        { name: "userId", value: { stringValue: user.id.stringValue } }, // Acessar o valor da string
      ]
    );

    // revalidatePath não funciona em Lambda autônoma, trate a revalidação no frontend
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        response: aiResponse,
        ...(updatedTitle && { title: updatedTitle }),
      }),
    };
  } catch (error) {
    console.error("Erro na API de chat:", error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: "Ocorreu um erro ao processar o seu pedido." }),
    };
  }
}
