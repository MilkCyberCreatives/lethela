// /src/lib/embeddings.ts
/**
 * Tiny embedding helper:
 * - Uses OpenAI text-embedding-3-small if OPENAI_API_KEY is set.
 * - Falls back to a simple bag-of-words + hashing embedding when no key.
 * - Cosine similarity utilities included.
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export type Vector = number[];

// --- OpenAI embeddings ---
async function openAIEmbed(texts: string[]): Promise<Vector[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`OpenAI embeddings failed: ${res.status} ${msg}`);
  }
  const data = await res.json();
  return (data.data || []).map((d: any) => d.embedding as number[]);
}

// --- Local fallback embeddings (bag-of-words hash) ---
function hashStr(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function localEmbedOne(text: string, dim = 256): Vector {
  const v = new Array(dim).fill(0);
  const tokens = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    const idx = hashStr(t) % dim;
    v[idx] += 1;
  }
  // L2 normalize
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

function localEmbed(texts: string[]): Vector[] {
  return texts.map((t) => localEmbedOne(t));
}

// --- Public API ---
export async function embed(texts: string[]): Promise<Vector[]> {
  if (OPENAI_API_KEY) {
    try {
      return await openAIEmbed(texts);
    } catch {
      // fall back
    }
  }
  return localEmbed(texts);
}

export function cosine(a: Vector, b: Vector) {
  const len = Math.min(a.length, b.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}
