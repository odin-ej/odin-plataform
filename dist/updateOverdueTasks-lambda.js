"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambda-handlers/updateOverdueTasks.ts
var updateOverdueTasks_exports = {};
__export(updateOverdueTasks_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(updateOverdueTasks_exports);
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
async function handler(event, context) {
  console.log("In\xEDcio da execu\xE7\xE3o da fun\xE7\xE3o Lambda para atualizar tarefas atrasadas.");
  console.log("Evento recebido:", JSON.stringify(event, null, 2));
  console.log("Contexto da Lambda:", JSON.stringify(context, null, 2));
  try {
    const now = /* @__PURE__ */ new Date();
    const overdueTasks = await prisma.task.findMany({
      where: {
        status: import_client.TaskStatus.IN_PROGRESS,
        // Apenas tarefas que ainda estão ativas
        deadline: {
          lt: now
          // "lt" (less than) - o prazo é menor que (anterior a) agora.
        }
      },
      select: {
        id: true
        // Seleciona apenas os IDs para ser mais eficiente.
      }
    });
    if (overdueTasks.length === 0) {
      console.log("Nenhuma tarefa atrasada encontrada para atualiza\xE7\xE3o.");
      return {
        statusCode: 200,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Nenhuma tarefa atrasada encontrada." })
      };
    }
    const overdueTaskIds = overdueTasks.map((task) => task.id);
    const updateResult = await prisma.task.updateMany({
      where: {
        id: {
          in: overdueTaskIds
        }
      },
      data: {
        status: import_client.TaskStatus.PENDING
        // Define o novo status
      }
    });
    console.log(`Sucesso! ${updateResult.count} tarefas foram atualizadas para PENDENTE.`);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Sucesso! ${updateResult.count} tarefas foram atualizadas.`,
        updatedIds: overdueTaskIds
      })
    };
  } catch (error) {
    console.error("Erro na fun\xE7\xE3o Lambda de atualiza\xE7\xE3o de tarefas atrasadas:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Erro interno do servidor ao atualizar tarefas." })
    };
  } finally {
    await prisma.$disconnect();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
