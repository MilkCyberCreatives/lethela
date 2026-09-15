from pathlib import Path
import re


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one match, found {count}")
    return text.replace(old, new, 1)


# Correct paid-only average order value without changing any stored data.
path = "src/app/api/admin/stats/route.ts"
text = read(path)
text = replace_once(
    text,
    """const emptyFinancialAggregate = {
  _sum: {
    subtotalCents: 0,
    totalCents: 0,
    deliveryFeeCents: 0,
    riderTipCents: 0,
    riderPayoutCents: 0,
    vendorPayoutCents: 0,
    platformFeeCents: 0,
  },
};""",
    """const emptyFinancialAggregate = {
  _sum: {
    subtotalCents: 0,
    totalCents: 0,
    deliveryFeeCents: 0,
    riderTipCents: 0,
    riderPayoutCents: 0,
    vendorPayoutCents: 0,
    platformFeeCents: 0,
  },
  _count: { id: 0 },
};""",
    "stats aggregate fallback",
)
text = replace_once(
    text,
    'prisma.order.aggregate({ where: paidOrderWhere(today), _sum: financialSums })',
    '''prisma.order.aggregate({
        where: paidOrderWhere(today),
        _sum: financialSums,
        _count: { id: true },
      })''',
    "today financial count",
)
text = replace_once(
    text,
    'prisma.order.aggregate({ where: paidOrderWhere(month), _sum: financialSums })',
    '''prisma.order.aggregate({
        where: paidOrderWhere(month),
        _sum: financialSums,
        _count: { id: true },
      })''',
    "month financial count",
)
text = replace_once(
    text,
    """averageOrderValueTodayCents:
        ordersToday > 0 ? Math.round((financialsToday._sum.subtotalCents || 0) / ordersToday) : 0,""",
    """averageOrderValueTodayCents:
        financialsToday._count.id > 0
          ? Math.round((financialsToday._sum.subtotalCents || 0) / financialsToday._count.id)
          : 0,""",
    "paid average order value",
)
write(path, text)


# Make Order Monitoring server-paginated/searchable while keeping Overview/Operations compatible.
path = "src/app/api/admin/operations/route.ts"
text = read(path)
text = replace_once(
    text,
    'import { NextRequest, NextResponse } from "next/server";\n',
    'import { NextRequest, NextResponse } from "next/server";\nimport type { Prisma } from "@prisma/client";\n',
    "operations Prisma type import",
)
get_pattern = re.compile(
    r"export async function GET\(req: NextRequest\) \{.*?\n\}\n\nexport async function POST",
    re.S,
)
new_get = r'''function orderPeriodStart(period: string) {
  const now = new Date();
  if (period === "TODAY") {
    now.setHours(0, 0, 0, 0);
    return now;
  }
  if (period === "MONTH") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return null;
}

async function loadOrderPage(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, Number.parseInt(params.get("pageSize") || "40", 10) || 40),
  );
  const status = (params.get("status") || "ALL").trim().toUpperCase();
  const payment = (params.get("payment") || "ALL").trim().toUpperCase();
  const period = (params.get("period") || "ALL").trim().toUpperCase();
  const sort = params.get("sort") === "oldest" ? "asc" : "desc";
  const q = (params.get("q") || "").trim();
  const periodStart = orderPeriodStart(period);

  const filters: Prisma.OrderWhereInput[] = [];
  if (status !== "ALL") filters.push({ status });
  if (payment !== "ALL") filters.push({ paymentStatus: payment });
  if (periodStart) filters.push({ createdAt: { gte: periodStart } });
  if (q) {
    filters.push({
      OR: [
        { publicId: { contains: q } },
        { ozowReference: { contains: q } },
        { vendor: { is: { name: { contains: q } } } },
        { user: { is: { name: { contains: q } } } },
        { user: { is: { email: { contains: q } } } },
        { assignedRider: { is: { fullName: { contains: q } } } },
      ],
    });
  }

  const where: Prisma.OrderWhereInput = filters.length ? { AND: filters } : {};
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: sort },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        publicId: true,
        ozowReference: true,
        status: true,
        paymentStatus: true,
        subtotalCents: true,
        deliveryFeeCents: true,
        riderTipCents: true,
        riderPayoutCents: true,
        vendorPayoutCents: true,
        platformFeeCents: true,
        totalCents: true,
        itemsJson: true,
        createdAt: true,
        vendor: { select: { name: true, phone: true, etaMins: true } },
        user: { select: { email: true, name: true } },
        assignedRider: { select: { fullName: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  return {
    orders: orders.map((order) => {
      const financials = parseOrderFinancials(order.itemsJson);
      return {
        id: order.id,
        publicId: order.publicId,
        ozowReference: order.ozowReference,
        status: order.status,
        paymentStatus: order.paymentStatus,
        subtotalCents: order.subtotalCents,
        deliveryFeeCents: order.deliveryFeeCents,
        riderTipCents: order.riderTipCents || financials.riderTipCents,
        riderPayoutCents:
          order.riderPayoutCents || financials.riderPayoutCents || order.deliveryFeeCents,
        vendorPayoutCents:
          order.vendorPayoutCents || financials.vendorPayoutCents || order.subtotalCents,
        platformFeeCents: order.platformFeeCents || financials.platformFeeCents,
        deliveryDistanceKm: financials.deliveryDistanceKm,
        containsAlcohol: financials.containsAlcohol,
        etaMins: order.vendor?.etaMins ?? null,
        totalCents: order.totalCents,
        createdAt: order.createdAt,
        vendorName: order.vendor?.name || "Unknown vendor",
        vendorPhone: order.vendor?.phone || null,
        customerName: order.user?.name || null,
        customerEmail: order.user?.email || null,
        riderName: order.assignedRider?.fullName || null,
        itemCount: order._count.items,
      };
    }),
    orderPagination: { page, pageSize, total, pageCount },
  };
}

export async function GET(req: NextRequest) {
  const guard = await requireAdminRequest(req);
  if (!guard.ok)
    return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

  const orderPage = await loadOrderPage(req);
  if (req.nextUrl.searchParams.get("ordersOnly") === "1") {
    return NextResponse.json({ ok: true, ...orderPage });
  }

  const [riders, operations, auditLogs] = await Promise.all([
    prisma.riderApplication.findMany({
      where: { status: "APPROVED" },
      orderBy: { updatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        fullName: true,
        phone: true,
        suburb: true,
        city: true,
        vehicleType: true,
      },
    }),
    listOperationRows(),
    listAdminAuditLogs(),
  ]);

  return NextResponse.json({
    ok: true,
    ...orderPage,
    riders,
    auditLogs,
    ...operations,
  });
}

export async function POST'''
text, count = get_pattern.subn(new_get, text, count=1)
if count != 1:
    raise SystemExit(f"operations GET: expected one match, found {count}")
write(path, text)


# Surgical admin-page changes only. No class names/layout structure are redesigned.
path = "src/app/admin/page.tsx"
text = read(path)
text = replace_once(
    text,
    'import Link from "next/link";\nimport { useRouter } from "next/navigation";\n',
    'import Link from "next/link";\nimport { signOut } from "next-auth/react";\nimport { useRouter } from "next/navigation";\n',
    "admin signOut import",
)
text = replace_once(
    text,
    "  containsAlcohol: boolean;\n  totalCents: number;\n",
    "  containsAlcohol: boolean;\n  etaMins: number | null;\n  totalCents: number;\n",
    "order ETA type",
)
text = replace_once(
    text,
    """type AdminOperationsPayload = {
  orders?: OperationsOrder[];
  riders?: OperationsRider[];""",
    """type AdminOperationsPayload = {
  orders?: OperationsOrder[];
  orderPagination?: { page: number; pageSize: number; total: number; pageCount: number };
  riders?: OperationsRider[];""",
    "operations pagination payload type",
)
text = replace_once(
    text,
    "  const [orderPage, setOrderPage] = useState(1);\n",
    '  const [orderPage, setOrderPage] = useState(1);\n  const [financePeriod, setFinancePeriod] = useState<"today" | "month">("month");\n',
    "finance period state",
)
text = replace_once(
    text,
    "  const [operationsOrders, setOperationsOrders] = useState<OperationsOrder[]>([]);\n",
    """  const [operationsOrders, setOperationsOrders] = useState<OperationsOrder[]>([]);
  const [orderMonitorOrders, setOrderMonitorOrders] = useState<OperationsOrder[]>([]);
  const [orderPagination, setOrderPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    pageCount: 1,
  });
""",
    "order monitoring state",
)
text = replace_once(
    text,
    """  const loadLiveData = useCallback(async () => {
    const [statsJson, operationsJson] = await Promise.all([
      fetchAdminJson("/api/admin/stats", "Failed to load owner statistics."),
      fetchAdminJson("/api/admin/operations", "Failed to load operations centre."),
    ]);
    setStats(statsJson.stats ?? null);
    applyOperationsJson(operationsJson);
    setLastRefreshedAt(new Date());
  }, [applyOperationsJson, fetchAdminJson]);
""",
    """  const loadLiveData = useCallback(async () => {
    const [statsJson, operationsJson] = await Promise.all([
      fetchAdminJson("/api/admin/stats", "Failed to load owner statistics."),
      fetchAdminJson("/api/admin/operations", "Failed to load operations centre."),
    ]);
    setStats(statsJson.stats ?? null);
    applyOperationsJson(operationsJson);
    setLastRefreshedAt(new Date());
  }, [applyOperationsJson, fetchAdminJson]);

  const loadOrderMonitoring = useCallback(async () => {
    const params = new URLSearchParams({
      ordersOnly: "1",
      page: String(orderPage),
      pageSize: "10",
      status: orderStatusFilter,
      payment: orderPaymentFilter,
      period: orderPeriodFilter,
      sort: orderSort,
    });
    if (orderSearch.trim()) params.set("q", orderSearch.trim());

    const json = await fetchAdminJson(
      `/api/admin/operations?${params.toString()}`,
      "Failed to load order monitoring.",
    );
    setOrderMonitorOrders(json.orders ?? []);
    setOrderPagination(
      json.orderPagination ?? { page: orderPage, pageSize: 10, total: 0, pageCount: 1 },
    );
  }, [
    fetchAdminJson,
    orderPage,
    orderPaymentFilter,
    orderPeriodFilter,
    orderSearch,
    orderSort,
    orderStatusFilter,
  ]);
""",
    "server order loader",
)
text = replace_once(
    text,
    """      if (nextView === "orders") {
        setOrderPeriodFilter(params.get("period")?.toUpperCase() || "ALL");
        setOrderPaymentFilter(params.get("payment")?.toUpperCase() || "ALL");
        setOrderSearch(params.get("q") || "");
      }
""",
    """      if (nextView === "orders") {
        setOrderPeriodFilter(params.get("period")?.toUpperCase() || "ALL");
        setOrderPaymentFilter(params.get("payment")?.toUpperCase() || "ALL");
        setOrderSearch(params.get("q") || "");
      }
      if (nextView === "finance") {
        setFinancePeriod(params.get("period")?.toLowerCase() === "today" ? "today" : "month");
      }
""",
    "finance URL restore",
)
text = replace_once(
    text,
    """    if (nextView === "orders") {
      setOrderPeriodFilter(params?.period?.toUpperCase() || "ALL");
      setOrderPaymentFilter(params?.payment?.toUpperCase() || "ALL");
      setOrderSearch(params?.q || "");
      setOrderPage(1);
    }

    window.history.pushState""",
    """    if (nextView === "orders") {
      setOrderPeriodFilter(params?.period?.toUpperCase() || "ALL");
      setOrderPaymentFilter(params?.payment?.toUpperCase() || "ALL");
      setOrderSearch(params?.q || "");
      setOrderPage(1);
    }
    if (nextView === "finance") {
      setFinancePeriod(params?.period?.toLowerCase() === "today" ? "today" : "month");
    }

    window.history.pushState""",
    "finance navigate context",
)

pattern = re.compile(
    r"  const filteredOrders = useMemo\(\(\) => \{.*?\n  const currentViewLabel =",
    re.S,
)
replacement = """  const orderPageCount = Math.max(1, orderPagination.pageCount);
  const visibleOrders = orderMonitorOrders;

  useEffect(() => {
    setOrderPage(1);
  }, [orderPaymentFilter, orderPeriodFilter, orderSearch, orderSort, orderStatusFilter]);

  useEffect(() => {
    if (view !== "orders") return;
    const timer = window.setTimeout(
      () => {
        void loadOrderMonitoring().catch((err: unknown) => {
          setError(getErrorMessage(err, "Failed to load order monitoring."));
        });
      },
      orderSearch.trim() ? 250 : 0,
    );
    return () => window.clearTimeout(timer);
  }, [loadOrderMonitoring, orderSearch, view]);

  const currentViewLabel ="""
text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit(f"order client-filter block: expected one match, found {count}")

old_statuses = """                          {[
                            "PENDING_PAYMENT",
                            "PAID",
                            "NEW",
                            "VENDOR_ACCEPTED",
                            "PREPARING",
                            "READY_FOR_PICKUP",
                            "RIDER_ASSIGNED",
                            "PICKED_UP",
                            "ON_THE_WAY",
                            "DELIVERED",
                            "CANCELLED",
                            "REFUND_REQUESTED",
                            "REFUNDED",
                            "FAILED",
                          ].map((status) => ("""
new_statuses = """                          {[
                            "NEW",
                            "VENDOR_ACCEPTED",
                            "PREPARING",
                            "READY_FOR_PICKUP",
                            "PICKED_UP",
                            "ON_THE_WAY",
                            "DELIVERED",
                            "CANCELLED",
                            "FAILED",
                          ].map((status) => ("""
text = replace_once(text, old_statuses, new_statuses, "editable order statuses")
text = replace_once(
    text,
    "{filteredOrders.length} matching · {operationsOrders.length} recent loaded",
    "{orderPagination.total} matching · page {orderPagination.page} of {orderPageCount}",
    "order monitor result count",
)
text = replace_once(
    text,
    "{filteredOrders.length === 0 ? (",
    "{orderPagination.total === 0 ? (",
    "order monitor empty state",
)
text = replace_once(
    text,
    '''                            <th className="px-3 py-3 text-left">Created</th>
                            <th className="px-3 py-3 text-right">Action</th>''',
    '''                            <th className="px-3 py-3 text-left">Created</th>
                            <th className="px-3 py-3 text-left">ETA</th>
                            <th className="px-3 py-3 text-right">Action</th>''',
    "order ETA heading",
)
text = replace_once(
    text,
    '''                              <td className="border-t border-white/10 px-3 py-3 text-white/60">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right">''',
    '''                              <td className="border-t border-white/10 px-3 py-3 text-white/60">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-white/60">
                                {order.etaMins ? `${order.etaMins} min` : "—"}
                              </td>
                              <td className="border-t border-white/10 px-3 py-3 text-right">''',
    "order ETA cell",
)
text = replace_once(
    text,
    '''              void fetch("/api/admin/access", { method: "DELETE" })
                .catch(() => {})
                .finally(() => {
                  router.push("/owner-access");
                  router.refresh();
                });''',
    '''              void fetch("/api/admin/access", { method: "DELETE" })
                .catch(() => {})
                .finally(() => {
                  void signOut({ callbackUrl: "/owner-access" });
                });''',
    "full admin sign out",
)

# Communication health cards now open the relevant management screen.
for label in ["Email", "WhatsApp", "Applicant email", "Applicant WhatsApp"]:
    marker = f'label="{label}"'
    pos = text.find(marker)
    if pos < 0:
        raise SystemExit(f"metric card {label}: not found")
    end = text.find('/>', pos)
    card = text[pos:end]
    if 'onClick=' not in card:
        icon_pos = text.find('icon={', pos, end)
        if icon_pos < 0:
            raise SystemExit(f"metric card {label}: icon not found")
        icon_line_end = text.find('\n', icon_pos, end)
        text = (
            text[: icon_line_end + 1]
            + '                  onClick={() => navigateView("messages")}\n'
            + text[icon_line_end + 1 :]
        )

finance_replacements = [
    (
        '''                    value={stats ? money(stats.grossMerchandiseValueMonthCents) : "—"}
                    note="Product value from paid orders this month."
                    icon={ShoppingBag}
                    onClick={() => navigateView("orders", { period: "month" })}''',
        '''                    value={
                      stats
                        ? money(
                            financePeriod === "today"
                              ? stats.grossMerchandiseValueTodayCents
                              : stats.grossMerchandiseValueMonthCents,
                          )
                        : "—"
                    }
                    note={
                      financePeriod === "today"
                        ? "Product value from paid orders today."
                        : "Product value from paid orders this month."
                    }
                    icon={ShoppingBag}
                    onClick={() => navigateView("orders", { period: financePeriod })}''',
    ),
    (
        '''                    value={stats ? money(stats.revenueMonthCents) : "—"}
                    note="Lethela commission this month."
                    icon={LineChart}
                    onClick={() => navigateView("orders", { period: "month" })}''',
        '''                    value={
                      stats
                        ? money(
                            financePeriod === "today"
                              ? stats.revenueTodayCents
                              : stats.revenueMonthCents,
                          )
                        : "—"
                    }
                    note={financePeriod === "today" ? "Lethela commission today." : "Lethela commission this month."}
                    icon={LineChart}
                    onClick={() => navigateView("orders", { period: financePeriod })}''',
    ),
    (
        '''                    value={stats ? money(stats.vendorSalesMonthCents) : "—"}
                    note="Vendor payout value this month."
                    icon={Store}
                    onClick={() => navigateView("orders", { period: "month" })}''',
        '''                    value={
                      stats
                        ? money(
                            financePeriod === "today"
                              ? stats.vendorSalesTodayCents
                              : stats.vendorSalesMonthCents,
                          )
                        : "—"
                    }
                    note={financePeriod === "today" ? "Vendor payout value today." : "Vendor payout value this month."}
                    icon={Store}
                    onClick={() => navigateView("orders", { period: financePeriod })}''',
    ),
    (
        '''                    value={stats ? money(stats.customerPaymentsMonthCents) : "—"}
                    note="Full paid customer charge for reconciliation."
                    icon={WalletCards}
                    onClick={() => navigateView("orders", { period: "month" })}''',
        '''                    value={
                      stats
                        ? money(
                            financePeriod === "today"
                              ? stats.customerPaymentsTodayCents
                              : stats.customerPaymentsMonthCents,
                          )
                        : "—"
                    }
                    note="Full paid customer charge for reconciliation."
                    icon={WalletCards}
                    onClick={() => navigateView("orders", { period: financePeriod })}''',
    ),
    (
        'value={stats ? money(stats.deliveryFeesMonthCents) : "—"}',
        '''value={
                      stats
                        ? money(
                            financePeriod === "today"
                              ? stats.deliveryFeesTodayCents
                              : stats.deliveryFeesMonthCents,
                          )
                        : "—"
                    }''',
    ),
    (
        'value={stats ? money(stats.riderTipsMonthCents) : "—"}',
        '''value={
                      stats
                        ? money(
                            financePeriod === "today"
                              ? stats.riderTipsTodayCents
                              : stats.riderTipsMonthCents,
                          )
                        : "—"
                    }''',
    ),
    (
        'value={stats ? money(stats.riderEarningsMonthCents) : "—"}',
        '''value={
                      stats
                        ? money(
                            financePeriod === "today"
                              ? stats.riderEarningsTodayCents
                              : stats.riderEarningsMonthCents,
                          )
                        : "—"
                    }''',
    ),
]
for idx, (old, new) in enumerate(finance_replacements, 1):
    text = replace_once(text, old, new, f"finance period card {idx}")

write(path, text)


Path("tests/admin-data-safety-20260915.test.ts").write_text(r'''import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { REGISTRATION_PASSWORD_MIN_LENGTH } from "../src/lib/registration-policy";

async function source(path: string) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("owner APIs require the signed-in admin and matching verification cookie", async () => {
  const [guard, layout, ownerAccess] = await Promise.all([
    source("src/lib/admin-auth.ts"),
    source("src/app/admin/layout.tsx"),
    source("src/app/owner-access/page.tsx"),
  ]);
  assert.match(guard, /token\?\.sub === session\.user\.id/);
  assert.match(guard, /Admin security verification is required/);
  assert.doesNotMatch(guard, /mode: "session"/);
  assert.match(layout, /readAdminAccessToken/);
  assert.match(layout, /redirect\("\/owner-access"\)/);
  assert.match(ownerAccess, /token\?\.sub === session\.user\.id/);
});

test("registration keeps the approved six-character minimum", () => {
  assert.equal(REGISTRATION_PASSWORD_MIN_LENGTH, 6);
});

test("order monitoring is server-paginated and exposes ETA without changing schema", async () => {
  const [route, admin] = await Promise.all([
    source("src/app/api/admin/operations/route.ts"),
    source("src/app/admin/page.tsx"),
  ]);
  assert.match(route, /ordersOnly/);
  assert.match(route, /skip: \(page - 1\) \* pageSize/);
  assert.match(route, /take: pageSize/);
  assert.match(route, /prisma\.order\.count\(\{ where \}\)/);
  assert.match(route, /etaMins: order\.vendor\?\.etaMins/);
  assert.match(admin, /orderMonitorOrders/);
  assert.match(admin, /orderPagination\.total/);
  assert.match(admin, />ETA</);
});

test("editable admin order statuses cannot mix payment and refund states", async () => {
  const admin = await source("src/app/admin/page.tsx");
  const marker = admin.indexOf('value={operationsForm.status}');
  assert.ok(marker >= 0);
  const block = admin.slice(marker, marker + 1800);
  assert.doesNotMatch(block, /PENDING_PAYMENT|\"PAID\"|REFUND_REQUESTED|REFUNDED|RIDER_ASSIGNED/);
  assert.match(block, /\"NEW\"/);
  assert.match(block, /\"DELIVERED\"/);
  assert.match(block, /\"CANCELLED\"/);
});

test("average order value uses paid-order count and finance honours period deep links", async () => {
  const [stats, admin] = await Promise.all([
    source("src/app/api/admin/stats/route.ts"),
    source("src/app/admin/page.tsx"),
  ]);
  assert.match(stats, /financialsToday\._count\.id/);
  assert.match(admin, /financePeriod/);
  assert.match(admin, /stats\.revenueTodayCents/);
  assert.match(admin, /period: financePeriod/);
});

test("admin sign out ends the auth session after clearing owner verification", async () => {
  const admin = await source("src/app/admin/page.tsx");
  assert.match(admin, /signOut\(\{ callbackUrl: "\/owner-access" \}\)/);
});
''')
