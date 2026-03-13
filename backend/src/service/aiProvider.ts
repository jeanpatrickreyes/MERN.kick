/**
 * AI provider abstraction: Gemini or Grok (xAI).
 * Set AI_PROVIDER=grok to use Grok; default is gemini.
 * Grok: GROK_API_KEY or XAI_API_KEY, GROK_MODEL (e.g. grok-4-1-fast-non-reasoning)
 */
import { GoogleGenAI } from "@google/genai";
import axios from "axios";

const PROVIDER = (process.env.AI_PROVIDER || "gemini").toLowerCase();
const isGrok = PROVIDER === "grok";

const gemini = !isGrok ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" }) : null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const GROK_API_KEY = process.env.GROK_API_KEY || process.env.XAI_API_KEY || "";
const GROK_MODEL = process.env.GROK_MODEL || "grok-4-1-fast-non-reasoning";
const GROK_URL = "https://api.x.ai/v1/chat/completions";

export function getProviderName(): string {
  return isGrok ? "Grok" : "Gemini";
}

export function getModelName(): string {
  return isGrok ? GROK_MODEL : GEMINI_MODEL;
}

/**
 * Generate text from the configured AI provider (Gemini or Grok).
 * Same interface for both; used by single-match and batch analysis.
 */
export async function generateText(
  prompt: string,
  options?: { systemInstruction?: string; temperature?: number }
): Promise<string> {
  const systemInstruction = options?.systemInstruction ?? "";
  const temperature = options?.temperature ?? 0.2;

  if (isGrok) {
    if (!GROK_API_KEY) {
      throw new Error("Grok requires GROK_API_KEY or XAI_API_KEY in .env. Get a key at https://console.x.ai");
    }
    const messages: { role: string; content: string }[] = [];
    if (systemInstruction) {
      messages.push({ role: "system", content: systemInstruction });
    }
    messages.push({ role: "user", content: prompt });

    const { data } = await axios.post<{
      choices?: Array<{ message?: { content?: string } }>;
    }>(
      GROK_URL,
      {
        model: GROK_MODEL,
        messages,
        temperature,
        max_tokens: 8192,
      },
      {
        headers: {
          Authorization: `Bearer ${GROK_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );
    const content = data?.choices?.[0]?.message?.content ?? "";
    return content;
  }

  if (!gemini) throw new Error("Gemini client not initialized");
  const timeoutMs = 120000;
  const response = await Promise.race([
    gemini.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction || undefined,
        temperature,
      },
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini API timeout after 120s")), timeoutMs)
    ),
  ]);
  return response.text ?? "";
}
