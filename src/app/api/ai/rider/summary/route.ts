// src/app/api/ai/rider/summary/route.ts
import { NextResponse } from "next/server";
import { aiChat } from "@/lib/ai";

/**
 * Input:
 * {
 *   fullName: string;
 *   phone: string;
 *   suburb: string;
 *   vehicle: string;
 *   experience: string;
 * }
 *
 * Output:
 * {
 *   ok: true,
 *   summary: "Short pitch we can review / onboard"
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { fullName, phone, suburb, vehicle, experience } = body as {
    fullName?: string;
    phone?: string;
    suburb?: string;
    vehicle?: string;
    experience?: string;
  };

  const messages = [
    {
      role: "system",
      content:
        "You are an assistant for a South African last-mile delivery platform. Create a short rider onboarding summary (max ~60 words) that's professional, trustworthy, and focused on readiness to deliver. Plain text only.",
    },
    {
      role: "user",
      content: `
Full name: ${fullName || "N/A"}
Phone / WhatsApp: ${phone || "N/A"}
Area/Suburb: ${suburb || "N/A"}
Vehicle: ${vehicle || "N/A"}
Experience: ${experience || "N/A"}

Write a quick summary for Lethela ops to evaluate this rider.
`,
    },
  ] as const;

  const pitch = await aiChat(messages as any);

  return NextResponse.json({
    ok: true,
    summary: (pitch || "").toString().trim().slice(0, 600),
  });
}
