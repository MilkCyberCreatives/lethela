import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { adminAiComplete, adminAiProvider } from "../src/lib/admin-ai";
import {
  templateAccountMessage,
  templateProductDescription,
  templateSocialCaption,
} from "../src/lib/admin-ai-tools";
import { buildBriefActions, formatBriefText, type DailyBrief } from "../src/lib/daily-brief";

function brief(overrides: Partial<Omit<DailyBrief, "actions">> = {}): Omit<DailyBrief, "actions"> {
  return {
    dayKey: "2026-10-28",
    dayLabel: "Wed 28 Oct",
    generatedAt: "2026-10-29T05:00:00.000Z",
    orders: {
      placed: 0,
      paid: 0,
      delivered: 0,
      cancelled: 0,
      paidValueCents: 0,
      openNow: 0,
      stuckNow: 0,
      refundsWaiting: 0,
    },
    signups: { customers: 0, stores: 0, riders: 0 },
    stores: { registered: 4, orderable: 0, unfinished: 4 },
    riders: { registered: 2, ready: 0, online: 0, unfinished: 2 },
    topMissing: [{ label: "At least one menu item", count: 4 }],
    unfinishedAccounts: [],
    requests: { supportLast7Days: 0, kasiLast7Days: 0, townships: [] },
    visitors: null,
    emailSetUp: true,
    ...overrides,
  };
}

test("the brief puts stuck orders first and names what unfinished stores miss", () => {
  const actions = buildBriefActions(
    brief({ orders: { ...brief().orders, stuckNow: 2, openNow: 2, refundsWaiting: 1 } }),
  );
  assert.match(actions[0], /^2 paid orders have been open/);
  assert.match(actions[1], /^1 order is waiting for a refund/);
  assert.ok(actions.some((a) => /No store can take orders yet.*"At least one menu item"/.test(a)));
  assert.ok(actions.some((a) => /No rider is ready/.test(a)));
});

test("the brief flags missing email and kasi requests in plain words", () => {
  const actions = buildBriefActions(
    brief({
      emailSetUp: false,
      requests: {
        supportLast7Days: 1,
        kasiLast7Days: 3,
        townships: [{ name: "Rabie Ridge", count: 2 }],
      },
    }),
  );
  assert.ok(actions.some((a) => /3 people asked for Lethela in their kasi.*Rabie Ridge/.test(a)));
  assert.ok(actions.some((a) => /1 support request came in/.test(a)));
  assert.ok(actions.some((a) => /email is not set up/.test(a)));
  const text = formatBriefText({ ...brief(), actions }, null);
  assert.match(text, /Lethela morning brief for Wed 28 Oct/);
  assert.match(text, /\/admin\/ai/);
});

test("with no AI key the admin AI stays off and returns nothing", async () => {
  const saved = { a: process.env.ANTHROPIC_API_KEY, o: process.env.OPENAI_API_KEY };
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.OPENAI_API_KEY;
  try {
    assert.equal(adminAiProvider(), "none");
    assert.equal(await adminAiComplete("task", "prompt"), null);
  } finally {
    if (saved.a) process.env.ANTHROPIC_API_KEY = saved.a;
    if (saved.o) process.env.OPENAI_API_KEY = saved.o;
  }
});

test("fallback drafts follow Lethela's rules: no prices, open now, right links", () => {
  const store = templateAccountMessage({
    audience: "vendor",
    name: "Thandi Mokoena",
    missing: ["Opening hours", "At least one menu item"],
  });
  assert.match(store, /^Hi Thandi, it's Lethela\./);
  assert.match(store, /Opening hours, At least one menu item/);
  assert.match(store, /lethela\.co\.za\/vendors\/dashboard/);
  assert.match(templateAccountMessage({ audience: "rider", missing: [] }), /rider\/dashboard/);

  const captions = (["customers", "stores", "riders"] as const).map((audience) =>
    templateSocialCaption({ topic: "Friday kota", audience }),
  );
  const description = templateProductDescription({
    name: "Full house kota",
    storeType: "Kota shop",
  });
  for (const text of [...captions, description, store]) {
    assert.doesNotMatch(text, /R\s?\d|launching|coming soon|siyashesha|cash on delivery/i);
  }
  assert.match(captions[1], /vendors\/register/);
  assert.match(captions[2], /lethela\.co\.za\/rider/);
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("AI features are admin-only and the daily agents never call risky endpoints", () => {
  const route = readFileSync("src/app/api/admin/ai/route.ts", "utf8");
  assert.equal((route.match(/requireAdminRequest\(req\)/g) || []).length, 2);
  assert.doesNotMatch(route, /sendResendEmail|sendTwilioWhatsApp|prisma\./);

  const allowed =
    /src\/(app\/admin|app\/api\/admin|app\/api\/cron\/daily-brief|components\/admin|lib)\//;
  for (const file of walk("src").filter((path) => /\.(ts|tsx)$/.test(path))) {
    if (allowed.test(file.replaceAll("\\", "/"))) continue;
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /@\/lib\/(admin-ai|admin-ai-tools|daily-brief)"/, file);
    assert.doesNotMatch(source, /\/admin\/ai\b/, file);
  }

  const workflow = readFileSync(".github/workflows/daily-agents.yml", "utf8");
  assert.match(workflow, /api\/cron\/daily-brief/);
  assert.doesNotMatch(workflow, /api\/(notifications|admin\/operations|orders|cron\/order-sweep)/);
});
