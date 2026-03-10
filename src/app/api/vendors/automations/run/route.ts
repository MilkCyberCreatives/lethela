// /src/app/api/vendors/automations/run/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireVendor } from "@/lib/authz";
import { aiChat } from "@/lib/ai";

export async function POST() {
  try {
    const { vendorId } = await requireVendor("MANAGER");

    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
      include: { products: true, orders: { include: { items: true } } },
    });

    if (!vendor) return NextResponse.json({ ok: false, error: "Vendor not found" }, { status: 404 });

    const actions: string[] = [];

    // 1) Smart price optimiser (AI proposes +/- and we store a suggestion note)
    const priceMsg = [
      { role: "system", content: "You are a pricing analyst. Given product names and prices (ZAR), suggest up to 5 price tweaks (+/-) to improve conversion. Keep each suggestion short." },
      { role: "user", content: vendor.products.map((p: any) => `${p.name} : R${(p.priceCents / 100).toFixed(0)}`).join("\n") || "No products" },
    ] as any;
    const priceAdvice = await aiChat(priceMsg);
    actions.push(`Price optimiser: ${priceAdvice?.slice(0, 200) || "no advice"}`);

    // 2) Low-stock detector (mock: flag any product with name containing 'promo')
    const lowStock = vendor.products.filter((p: any) => /promo/i.test(p.name)).map((p: any) => p.name);
    actions.push(`Low-stock: ${lowStock.length ? lowStock.join(", ") : "none"}`);

    // 3) SEO blurbs (vendor)
    const seoVendor = await aiChat([
      { role: "system", content: "Write a 20-30 word SEO blurb for a food delivery vendor in South Africa. No emojis." },
      { role: "user", content: vendor.name },
    ] as any);
    actions.push(`SEO vendor: ${seoVendor?.slice(0, 160)}`);

    // 4) Best times to run specials (based on last 30 orders timestamps)
    const recent = vendor.orders.slice(-30).map((o: any) => o.createdAt.toISOString());
    const specialAdvice = await aiChat([
      { role: "system", content: "Given recent order timestamps (ISO), infer two best time windows to run promotions. Keep answer under 40 words." },
      { role: "user", content: recent.join("\n") || "No orders" },
    ] as any);
    actions.push(`Promo timing: ${specialAdvice?.slice(0, 160)}`);

    // 5) Daily summary (quick text)
    const daily = await aiChat([
      { role: "system", content: "Write a concise daily business summary for a vendor based on order count and revenue (ZAR). Keep under 40 words." },
      { role: "user", content: `Orders: ${vendor.orders.length}, Revenue: R${(vendor.orders.reduce((s: number, o: any) => s + o.totalCents, 0) / 100).toFixed(0)}` },
    ] as any);
    actions.push(`Daily summary: ${daily?.slice(0, 180)}`);

    // 6) Image alt-text generation for product images
    const withImgs = vendor.products.filter((p: any) => p.image);
    const altAdvice = withImgs.slice(0, 5).map((p: any) => `Alt for ${p.name}: appetizing ${p.name} on a plate`);
    actions.push(`Alt text: ${altAdvice.join("; ") || "no images"}`);

    return NextResponse.json({ ok: true, actions });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || "Auth error" }, { status: 401 });
  }
}
