import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Delay utility
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function safeGenerateContent(prompt: string) {
  // Wait 2 seconds before calling API to respect rate limits
  await delay(2000); 
  return model.generateContent(prompt);
}