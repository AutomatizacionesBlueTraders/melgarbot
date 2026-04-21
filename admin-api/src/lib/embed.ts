import { config } from "../config.js";

const MODEL = "gemini-embedding-001";
const DIM = 768;
const BATCH = 100;

export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (!config.geminiApiKey) throw new Error("GEMINI_API_KEY no configurada");
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const batch = texts.slice(i, i + BATCH);
    const body = {
      requests: batch.map((t) => ({
        model: `models/${MODEL}`,
        content: { parts: [{ text: t }] },
        outputDimensionality: DIM,
      })),
    };
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents?key=${config.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      throw new Error(`Gemini embed API ${r.status}: ${msg.slice(0, 300)}`);
    }
    const data = (await r.json()) as { embeddings: { values: number[] }[] };
    out.push(...data.embeddings.map((e) => e.values));
  }
  return out;
}

export function toPgVector(v: number[]): string {
  return `[${v.join(",")}]`;
}
