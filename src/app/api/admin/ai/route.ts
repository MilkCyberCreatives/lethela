import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminRequest } from "@/lib/admin-auth";
import { adminAiProvider } from "@/lib/admin-ai";
import {
  answerAdminQuestion,
  draftAccountMessage,
  draftProductDescription,
  draftSocialCaption,
} from "@/lib/admin-ai-tools";
import { loadDailyBrief, writeBriefAiNote } from "@/lib/daily-brief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Admin-only AI helpers for /admin/ai. Every task only drafts or explains text for the admin to
// read and copy: nothing here sends a message, changes an order or edits a store.
const TaskSchema = z.discriminatedUnion("task", [
  z.object({ task: z.literal("brief-note") }),
  z.object({ task: z.literal("ask"), question: z.string().trim().min(3).max(600) }),
  z.object({
    task: z.literal("account-message"),
    audience: z.enum(["vendor", "rider"]),
    name: z.string().trim().max(120).optional().nullable(),
    missing: z.array(z.string().trim().max(120)).max(12).default([]),
  }),
  z.object({
    task: z.literal("product-description"),
    name: z.string().trim().min(2).max(120),
    storeType: z.string().trim().max(60).optional().nullable(),
    notes: z.string().trim().max(300).optional().nullable(),
  }),
  z.object({
    task: z.literal("social-caption"),
    topic: z.string().trim().min(3).max(300),
    audience: z.enum(["customers", "stores", "riders"]),
  }),
]);

const noStore = { "cache-control": "no-store" };

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }
  return NextResponse.json({ ok: true, provider: adminAiProvider() }, { headers: noStore });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });
  }

  const parsed = TaskSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "Fill in the form and try again." },
      { status: 400, headers: noStore },
    );
  }

  try {
    const input = parsed.data;
    if (input.task === "brief-note") {
      const text = await writeBriefAiNote(await loadDailyBrief());
      return NextResponse.json(
        {
          ok: true,
          provider: text ? adminAiProvider() : "none",
          text:
            text || "The AI is not switched on yet. The to-do list above comes from the numbers.",
        },
        { headers: noStore },
      );
    }
    const draft =
      input.task === "ask"
        ? await answerAdminQuestion(input.question, await loadDailyBrief())
        : input.task === "account-message"
          ? await draftAccountMessage(input)
          : input.task === "product-description"
            ? await draftProductDescription(input)
            : await draftSocialCaption(input);
    return NextResponse.json({ ok: true, ...draft }, { headers: noStore });
  } catch (error) {
    console.error("Admin AI task failed.", error);
    return NextResponse.json(
      { ok: false, error: "That did not work. Try again in a minute." },
      { status: 500, headers: noStore },
    );
  }
}
