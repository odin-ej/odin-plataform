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

// lambda-handlers/cleanupConversations.ts
var cleanupConversations_exports = {};
__export(cleanupConversations_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(cleanupConversations_exports);
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
async function handler(event, context) {
  console.log("In\xEDcio da execu\xE7\xE3o da fun\xE7\xE3o Lambda para apagar conversas antigas.");
  console.log("Evento recebido:", JSON.stringify(event, null, 2));
  console.log("Contexto da Lambda:", JSON.stringify(context, null, 2));
  try {
    const thirtyDaysAgo = /* @__PURE__ */ new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const result = await prisma.conversation.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } }
    });
    const message = `${result.count} conversas antigas foram apagadas.`;
    console.log(message);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    };
  } catch (error) {
    console.error("Erro na fun\xE7\xE3o Lambda para apagar conversas antigas:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Erro interno do servidor ao apagar conversas antigas." })
    };
  } finally {
    await prisma.$disconnect();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
