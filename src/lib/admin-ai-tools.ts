import { adminAiComplete, type AdminAiProvider } from "@/lib/admin-ai";
import type { DailyBrief } from "@/lib/daily-brief";

/**
 * The writing helpers on /admin/ai. Each one drafts text for an admin to read, edit and copy;
 * none of them sends anything. With no AI key they return a plain template instead.
 */

export type AdminDraft = { text: string; provider: AdminAiProvider };

const SITE = "lethela.co.za";

function firstName(value: string | null | undefined) {
  return (
    String(value || "")
      .trim()
      .split(/\s+/)[0] || "there"
  );
}

export function templateAccountMessage(input: {
  audience: "vendor" | "rider";
  name?: string | null;
  missing: string[];
}) {
  const greeting = `Hi ${firstName(input.name)}, it's Lethela.`;
  const missing = input.missing.length
    ? ` To finish your ${input.audience === "vendor" ? "store" : "rider"} profile we still need: ${input.missing.join(", ")}.`
    : "";
  const where =
    input.audience === "vendor"
      ? `Sign in at ${SITE}/vendors/dashboard to finish it.`
      : `Sign in at ${SITE}/rider/dashboard to finish it.`;
  const why =
    input.audience === "vendor"
      ? " Once it is done, customers in Klipfontein View can order from you online and a Lethela rider collects the order."
      : " Once it is done, you can go online and get delivery requests near you.";
  return `${greeting}${missing} ${where}${why} Reply here if you need help.`;
}

export async function draftAccountMessage(input: {
  audience: "vendor" | "rider";
  name?: string | null;
  missing: string[];
}): Promise<AdminDraft> {
  const ai = await adminAiComplete(
    "Write one short, warm WhatsApp message (at most 70 words) from Lethela to the person below, asking them to finish their profile. Name what is missing in plain words, say where to sign in, and offer help. No prices.",
    JSON.stringify({
      ...input,
      signIn: input.audience === "vendor" ? `${SITE}/vendors/dashboard` : `${SITE}/rider/dashboard`,
    }),
    { maxTokens: 250 },
  );
  return ai
    ? { text: ai.text, provider: ai.provider }
    : { text: templateAccountMessage(input), provider: "none" };
}

export function templateProductDescription(input: {
  name: string;
  storeType?: string | null;
  notes?: string | null;
}) {
  const name = input.name.trim();
  const extra = input.notes?.trim() ? ` ${input.notes.trim().replace(/\.?$/, ".")}` : "";
  return `${name} from a local ${input.storeType?.trim().toLowerCase() || "store"} in Klipfontein View.${extra} Order online and a Lethela rider brings it to your door.`;
}

export async function draftProductDescription(input: {
  name: string;
  storeType?: string | null;
  notes?: string | null;
}): Promise<AdminDraft> {
  const ai = await adminAiComplete(
    "Write a product description for a menu item on Lethela: one or two sentences, at most 35 words, appetising and plain. Do not invent ingredients, sizes or prices beyond what is given.",
    JSON.stringify(input),
    { maxTokens: 160 },
  );
  return ai
    ? { text: ai.text, provider: ai.provider }
    : { text: templateProductDescription(input), provider: "none" };
}

export function templateSocialCaption(input: {
  topic: string;
  audience: "customers" | "stores" | "riders";
}) {
  const topic = input.topic.trim().replace(/\.?$/, ".");
  if (input.audience === "stores") {
    return `${topic}\n\nSell to your neighbours online with Lethela. Lethela riders handle the delivery. Sign up in a few minutes at ${SITE}/vendors/register\n\n#Lethela #KlipfonteinView #Kasi`;
  }
  if (input.audience === "riders") {
    return `${topic}\n\nDeliver with Lethela in Klipfontein View. Sign up at ${SITE}/rider\n\n#Lethela #KlipfonteinView #Kasi`;
  }
  return `${topic}\n\nYour kasi, delivered. Order from local stores in Klipfontein View, pay online and track your rider to your door: ${SITE}\n\n#Lethela #KlipfonteinView #Kasi`;
}

export async function draftSocialCaption(input: {
  topic: string;
  audience: "customers" | "stores" | "riders";
}): Promise<AdminDraft> {
  const ai = await adminAiComplete(
    "Write one Facebook post caption for Lethela (at most 60 words plus up to 3 hashtags). Lethela is open now. Few, strong words. Include the right link: lethela.co.za for customers, lethela.co.za/vendors/register for stores, lethela.co.za/rider for riders. Never write 'Siyashesha' on its own and never mention prices.",
    JSON.stringify(input),
    { maxTokens: 220 },
  );
  return ai
    ? { text: ai.text, provider: ai.provider }
    : { text: templateSocialCaption(input), provider: "none" };
}

export async function answerAdminQuestion(
  question: string,
  brief: DailyBrief,
): Promise<AdminDraft> {
  const ai = await adminAiComplete(
    "Answer the admin's question using only the Lethela facts given (yesterday's numbers, what is open now, unfinished accounts and requests). Be brief and practical. If the facts do not answer it, say what is missing and where in /admin to look.",
    `Facts:\n${JSON.stringify(brief)}\n\nQuestion: ${question}`,
    { maxTokens: 600 },
  );
  if (ai) return { text: ai.text, provider: ai.provider };
  return {
    text: [
      "The AI is not switched on yet, so here is today's to-do list from the numbers instead:",
      ...brief.actions.map((action, index) => `${index + 1}. ${action}`),
    ].join("\n"),
    provider: "none",
  };
}
