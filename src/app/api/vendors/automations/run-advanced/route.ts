import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";
import { aiChat } from "@/lib/ai";

function minutesBetween(a: Date, b: Date) {
  return Math.abs((b.getTime() - a.getTime()) / 60000);
}

async function runStockMonitor(vendorId: string) {
  const lowItems = await prisma.product.findMany({
    where: {
      vendorId,
      inStock: true,
      OR: [{ priceCents: { lte: 0 } }, { name: { contains: "OUT" } }],
    },
  });

  const updates: string[] = [];
  for (const product of lowItems) {
    await prisma.product.update({
      where: { id: product.id },
      data: { inStock: false },
    });
    updates.push(`Paused "${product.name}" (set inStock=false)`);
  }

  return updates.length
    ? `Auto-stock monitor: ${updates.join("; ")}`
    : "Auto-stock monitor: no items paused.";
}

async function runAlcoholCompliance(vendorId: string) {
  const booze = await prisma.product.findMany({
    where: {
      vendorId,
      isAlcohol: true,
      OR: [{ abv: null }, { abv: { lte: 0 } }],
    },
  });

  const results: string[] = [];
  for (const item of booze) {
    const guess = await aiChat([
      {
        role: "system",
        content:
          "Given an alcoholic product name, estimate typical ABV percentage (just a number like 5 or 12). If unknown, return 5.",
      },
      {
        role: "user",
        content: `Product: ${item.name}`,
      },
    ] as const);

    const abvGuess = parseFloat(String(guess).match(/\d+(\.\d+)?/)?.[0] || "5");

    await prisma.product.update({
      where: { id: item.id },
      data: {
        abv: abvGuess,
        description:
          (item.description || "") +
          `\n\n18+ only. Contains alcohol (~${abvGuess}% ABV). Drink responsibly.`,
      },
    });

    results.push(`Updated "${item.name}" with ABV~${abvGuess}% and added responsible-sale note.`);
  }

  return results.length
    ? `Alcohol compliance: ${results.join(" ")}`
    : "Alcohol compliance: all alcohol items already OK.";
}

function bucketOrdersByDowHour(orders: { createdAt: Date; totalCents: number }[]) {
  const map: Record<number, Record<number, number>> = {};
  for (let day = 0; day < 7; day++) map[day] = {};
  for (const order of orders) {
    const day = order.createdAt.getDay();
    const hour = order.createdAt.getHours();
    map[day][hour] = (map[day][hour] || 0) + order.totalCents;
  }
  return map;
}

async function runHoursSuggestion(vendorId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const orders = await prisma.order.findMany({
    where: { vendorId, createdAt: { gte: since } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, totalCents: true },
  });

  const map = bucketOrdersByDowHour(orders);
  const lines: string[] = [];

  for (let day = 0; day < 7; day++) {
    const row = map[day];
    const hours = Object.keys(row)
      .sort((a, b) => Number(a) - Number(b))
      .map((hour) => `${hour}:00=>R${(row[Number(hour)] / 100).toFixed(0)}`)
      .join(", ");
    lines.push(`Day ${day}: ${hours || "no orders"}`);
  }

  const ai = await aiChat([
    {
      role: "system",
      content:
        "You're a scheduling assistant for a delivery vendor. Suggest updated opening and closing time for each day of week (0=Sun..6=Sat). Aim to match peak demand and cut dead hours. Keep it short, machine-readable JSON array [{day,open,close}]. Use 24h HH:MM.",
    },
    { role: "user", content: lines.join("\n") },
  ] as const);

  return `Hours suggestion (review before applying): ${String(ai).trim().slice(0, 500)}`;
}

async function runPromoHeatmap(vendorId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 14);

  const orders = await prisma.order.findMany({
    where: { vendorId, createdAt: { gte: since } },
    select: { createdAt: true, totalCents: true },
  });

  const weekMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const order of orders) {
    const dayOfWeek = order.createdAt.getDay();
    weekMap[dayOfWeek] += order.totalCents;
  }

  const worstDay = Object.entries(weekMap).sort((a, b) => a[1] - b[1])[0]?.[0];
  if (worstDay === undefined) {
    return "Promo heatmap: not enough data to draft a promo.";
  }

  const now = new Date();
  const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const existingDraft = await prisma.special.findFirst({
    where: {
      vendorId,
      draft: true,
      title: "Slow-day Boost",
      endsAt: { gte: now },
    },
    select: { id: true },
  });

  if (existingDraft) {
    return `Promo heatmap: an existing slow-day promo draft is already waiting for review for weekday ${worstDay}.`;
  }

  await prisma.special.create({
    data: {
      vendorId,
      productId: null,
      title: "Slow-day Boost",
      description:
        "Limited-time promo to drive traffic in a quieter period. Automatically suggested by Lethela.",
      discountPct: 10,
      startsAt: start,
      endsAt: end,
      draft: true,
    },
  });

  return `Promo heatmap: drafted a slow-day promo (10% off) for weekday ${worstDay}.`;
}

async function runUpsell(vendorId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const recentOrders = await prisma.order.findMany({
    where: { vendorId, createdAt: { gte: since } },
    include: { items: true },
  });

  const pairCount: Record<string, Record<string, number>> = {};
  for (const order of recentOrders) {
    const ids = order.items.map((item: { productId: string | null }) => item.productId);
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const left = ids[i];
        const right = ids[j];
        if (!left || !right || left === right) continue;
        pairCount[left] = pairCount[left] || {};
        pairCount[right] = pairCount[right] || {};
        pairCount[left][right] = (pairCount[left][right] || 0) + 1;
        pairCount[right][left] = (pairCount[right][left] || 0) + 1;
      }
    }
  }

  const suggestions: string[] = [];

  for (const baseId of Object.keys(pairCount)) {
    const ranked = Object.entries(pairCount[baseId]).sort((a, b) => b[1] - a[1]);
    const top = ranked[0];
    if (!top) continue;
    const [upsellId] = top;

    try {
      await prisma.productUpsell.create({
        data: {
          vendorId,
          baseProductId: baseId,
          upsellProductId: upsellId,
          blurb: "Customers also add this to the order.",
        },
      });
      suggestions.push(`Upsell: ${baseId} -> ${upsellId}`);
    } catch {
      // Ignore duplicates from the unique constraint.
    }
  }

  return suggestions.length
    ? `Upsell recommender: ${suggestions.join("; ")}`
    : "Upsell recommender: no new combos.";
}

async function runLateOrderAlert(vendorId: string) {
  const cutoff = new Date(Date.now() - 35 * 60 * 1000);
  const late = await prisma.order.findMany({
    where: {
      vendorId,
      status: { not: "DELIVERED" },
      createdAt: { lte: cutoff },
    },
    include: { vendor: true },
  });

  const messages: string[] = [];

  for (const order of late) {
    const already = await prisma.lateOrderFlag.findUnique({
      where: { orderPublic: order.publicId },
    });
    if (already) continue;

    const aiMessage = await aiChat([
      {
        role: "system",
        content:
          "Write a polite 1-2 sentence WhatsApp-style update to a hungry customer in South Africa. Be honest, friendly, and don't blame the rider directly.",
      },
      {
        role: "user",
        content: `Order ${order.publicId} is running late. We estimate about 6-10 minutes more.`,
      },
    ] as const);

    const etaMins = Math.round(minutesBetween(order.createdAt, new Date()));
    await prisma.lateOrderFlag.create({
      data: {
        vendorId,
        orderId: order.id,
        orderPublic: order.publicId,
        etaMinutes: etaMins,
        aiMessage: String(aiMessage || "").trim().slice(0, 300),
      },
    });

    messages.push(`Late order ${order.publicId} flagged (ETA ${etaMins}m).`);
  }

  return messages.length
    ? `Late order alert: ${messages.join(" ")}`
    : "Late order alert: no late orders requiring outreach.";
}

async function runFraudSignal(vendorId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 7);

  const canceled = await prisma.order.findMany({
    where: {
      vendorId,
      status: "CANCELED",
      createdAt: { gte: since },
    },
    select: { customerLat: true, customerLng: true },
  });

  if (canceled.length === 0) {
    return "Fraud monitor: no suspicious cancellation clusters.";
  }

  const locations = canceled
    .map(
      (item) =>
        `(${item.customerLat?.toFixed(4) ?? "?"},${item.customerLng?.toFixed(4) ?? "?"})`
    )
    .join(" ");

  const fraudNote = await aiChat([
    {
      role: "system",
      content:
        "You are an anti-fraud assistant for local delivery. Based on a list of lat/lng cancellation clusters, describe (in <40 words) what ops should watch out for. Plain text.",
    },
    {
      role: "user",
      content: `Recent canceled order locations: ${locations}`,
    },
  ] as const);

  return `Fraud monitor: ${String(fraudNote || "").trim().slice(0, 200)}`;
}

async function runDailyHealth(vendorId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const todayOrders = await prisma.order.findMany({
    where: { vendorId, createdAt: { gte: start } },
    include: { items: true },
  });

  const revenueCents = todayOrders.reduce((sum, order) => sum + order.totalCents, 0);
  const best = new Map<string, number>();

  for (const order of todayOrders) {
    for (const item of order.items) {
      if (!item.productId) continue;
      best.set(item.productId, (best.get(item.productId) || 0) + item.qty);
    }
  }

  const top = [...best.entries()].sort((a, b) => b[1] - a[1])[0];
  const topName = top
    ? (await prisma.product.findUnique({ where: { id: top[0] } }))?.name || "Top seller"
    : "No sales yet";

  const health = await aiChat([
    {
      role: "system",
      content:
        "Summarize vendor health in South African English under 60 words: mention revenue (R), order count, today's top seller, any risk / win. Positive but honest.",
    },
    {
      role: "user",
      content: `Revenue today: R${(revenueCents / 100).toFixed(2)}; Orders today: ${todayOrders.length}; Best seller: ${topName}`,
    },
  ] as const);

  return `Daily health: ${String(health || "").trim().slice(0, 400)}`;
}

export async function POST() {
  try {
    const { vendorId } = await requireVendor("MANAGER");

    const results: string[] = [];
    results.push(await runStockMonitor(vendorId));
    results.push(await runAlcoholCompliance(vendorId));
    results.push(await runHoursSuggestion(vendorId));
    results.push(await runPromoHeatmap(vendorId));
    results.push(await runUpsell(vendorId));
    results.push(await runLateOrderAlert(vendorId));
    results.push(await runFraudSignal(vendorId));
    results.push(await runDailyHealth(vendorId));

    return NextResponse.json({ ok: true, results });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Auth error",
      },
      { status: 401 }
    );
  }
}
