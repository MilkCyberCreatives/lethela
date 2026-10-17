import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit } from "@/lib/rate-limit";
import { currentRider } from "@/lib/rider-session";
import { acceptOffer, declineOffer, offerOrder } from "@/lib/rider-offers";
import { notifyAdminsOfOrder } from "@/lib/order-notifications";

const BodySchema = z.object({ action: z.enum(["accept", "decline"]) });

type Params = { params: Promise<{ ref: string }> };

const ACCEPT_ERRORS = {
  taken: { status: 409, error: "Another rider accepted this delivery first." },
  busy: { status: 409, error: "Finish your current delivery before accepting another one." },
  "not-offered": { status: 404, error: "This delivery request is no longer open to you." },
} as const;

export async function POST(req: NextRequest, { params }: Params) {
  const limited = await checkRateLimit({
    key: "rider-offer-answer",
    limit: 60,
    windowMs: 15 * 60 * 1000,
    headers: req.headers,
  });
  if (!limited.ok) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }
  const rider = await currentRider();
  if (!rider || rider.status !== "APPROVED") {
    return NextResponse.json({ ok: false, error: "Rider access required." }, { status: 401 });
  }
  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid answer." }, { status: 400 });
  }
  const { ref } = await params;
  const orderRef = String(ref || "").trim();

  if (parsed.data.action === "accept") {
    const result = await acceptOffer(rider.id, orderRef);
    if (result === "accepted") return NextResponse.json({ ok: true, result });
    const failure = ACCEPT_ERRORS[result];
    return NextResponse.json(
      { ok: false, result, error: failure.error },
      { status: failure.status },
    );
  }

  const declined = await declineOffer(rider.id, orderRef);
  if (declined.orderId) {
    // When every rider alerted so far said "Not now", the rest hear straight away.
    const round = await offerOrder(declined.orderId).catch(() => null);
    if (round && round.open === 0) {
      const widened = await offerOrder(declined.orderId, { widen: true }).catch(() => null);
      if (widened && widened.open === 0) {
        await notifyAdminsOfOrder(declined.orderId, "no-rider-accepted").catch(() => null);
      }
    }
  }
  return NextResponse.json({ ok: true, result: "declined" });
}
