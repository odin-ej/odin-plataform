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

// lambda-handlers/resetUserMessageLimits.ts
var resetUserMessageLimits_exports = {};
__export(resetUserMessageLimits_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(resetUserMessageLimits_exports);
var import_client = require("@prisma/client");
var prisma = new import_client.PrismaClient();
async function handler(event, context) {
  console.log("In\xEDcio da execu\xE7\xE3o da fun\xE7\xE3o Lambda para resetar limite de mensagens.");
  console.log("Evento recebido:", JSON.stringify(event, null, 2));
  console.log("Contexto da Lambda:", JSON.stringify(context, null, 2));
  try {
    const updateResult = await prisma.user.updateMany({
      data: {
        dailyMessageCount: 0,
        lastMessageDate: /* @__PURE__ */ new Date()
        // Opcional: registrar a data da última redefinição
      }
    });
    console.log(`Sucesso! ${updateResult.count} usu\xE1rios tiveram seu limite de mensagens di\xE1rio resetado.`);
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Sucesso! ${updateResult.count} usu\xE1rios tiveram seu limite de mensagens di\xE1rio resetado.`
      })
    };
  } catch (error) {
    console.error("Erro na fun\xE7\xE3o Lambda de reset de limite de mensagens:", error);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Erro interno do servidor ao resetar limite de mensagens." })
    };
  } finally {
    await prisma.$disconnect();
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
