import { GoogleGenerativeAI } from "@google/generative-ai";
import { googleSearchTool } from "./ai-tools";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});
export const geminiPro = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
export const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
  tools: [{ functionDeclarations: [googleSearchTool] }],
});
