import fs from "node:fs";

const file = "src/app/admin/page.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceOnce(needle, replacement, label) {
  if (!source.includes(needle)) {
    throw new Error(`Admin patch failed: expected ${label} pattern was not found.`);
  }
  source = source.replace(needle, replacement);
}

const dashboardType = `type DashboardView =
  | "overview"
  | "vendors"
  | "products"
  | "riders"
  | "users"
  | "orders"
  | "messages"
  | "operations";
`;

replaceOnce(
  dashboardType,
  `${dashboardType}
const DASHBOARD_VIEWS: DashboardView[] = [
  "overview",
  "vendors",
  "products",
  "riders",
  "users",
  "orders",
  "messages",
  "operations",
];

function isDashboardView(value: string | null): value is DashboardView {
  return Boolean(value && DASHBOARD_VIEWS.includes(value as DashboardView));
}
`,
  "dashboard view type",
);

const pushPermissionEffect = `  useEffect(() => {
    setPushPermission(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "unsupported",
    );
  }, []);

`;

replaceOnce(
  pushPermissionEffect,
  `${pushPermissionEffect}  useEffect(() => {
    const syncViewFromUrl = () => {
      const candidate = new URL(window.location.href).searchParams.get("view");
      setView(isDashboardView(candidate) ? candidate : "overview");
    };

    syncViewFromUrl();
    window.addEventListener("popstate", syncViewFromUrl);
    return () => window.removeEventListener("popstate", syncViewFromUrl);
  }, []);

  const navigateView = useCallback((nextView: DashboardView) => {
    setView(nextView);
    const url = new URL(window.location.href);
    if (nextView === "overview") url.searchParams.delete("view");
    else url.searchParams.set("view", nextView);
    window.history.pushState({}, "", \`${"${url.pathname}${url.search}${url.hash}"}\`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

`,
  "push permission effect",
);

const attentionRows = `  const attentionRows = useMemo<AttentionRow[]>(() => {
    const rows: AttentionRow[] = [];

    operationsOrders
      .filter((order) =>
        ["NEW", "ACCEPTED", "PREPARING", "READY", "PICKED_UP", "OUT_FOR_DELIVERY", "FAILED"].includes(
          order.status,
        ),
      )
      .slice(0, 4)
      .forEach((order) => {
        const reference = order.ozowReference || order.publicId;
        const failed = order.status === "FAILED" || order.paymentStatus === "FAILED";
        rows.push({
          type: "Order",
          issue: \`${"${reference}: ${order.status.replaceAll(\"_\", \" \")}"}\`,
          area: order.vendorName || "Live order",
          assignedTo: order.status === "NEW" ? "Vendor / Admin" : "Operations",
          priority: failed ? "High" : "Medium",
          status: order.paymentStatus,
          action: "Open order",
          target: "operations",
        });
      });

    vendors
      .filter((vendor) =>
        ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(vendor.status),
      )
      .slice(0, 3)
      .forEach((vendor) => {
        rows.push({
          type: "Vendor",
          issue: \`${"${vendor.name}: ${vendor.status.replaceAll(\"_\", \" \")}"}\`,
          area: [vendor.suburb, vendor.city].filter(Boolean).join(", ") || "Location incomplete",
          assignedTo: vendor.status === "CHANGES_REQUESTED" ? "Vendor" : "Admin",
          priority: vendor.status === "SUBMITTED" ? "Medium" : "Low",
          status: vendor.status.replaceAll("_", " "),
          action: "Review vendor",
          target: "vendors",
        });
      });

    products
      .filter((product) =>
        ["SUBMITTED", "CHANGES_REQUESTED"].includes(product.status),
      )
      .slice(0, 3)
      .forEach((product) => {
        rows.push({
          type: "Product",
          issue: \`${"${product.name}${product.image ? \"\" : \": image required\"}"}\`,
          area: product.vendor.name,
          assignedTo: product.status === "CHANGES_REQUESTED" ? "Vendor" : "Admin",
          priority: product.image ? "Low" : "Medium",
          status: product.status.replaceAll("_", " "),
          action: "Review product",
          target: "products",
        });
      });

    riders
      .filter((rider) => ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"].includes(rider.status))
      .slice(0, 3)
      .forEach((rider) => {
        rows.push({
          type: "Rider",
          issue: \`${"${rider.fullName || rider.email}: ${rider.status.replaceAll(\"_\", \" \")}"}\`,
          area: [rider.suburb, rider.city].filter(Boolean).join(", ") || "Location incomplete",
          assignedTo: rider.status === "CHANGES_REQUESTED" ? "Rider" : "Admin",
          priority: rider.status === "SUBMITTED" ? "Medium" : "Low",
          status: rider.status.replaceAll("_", " "),
          action: "Review rider",
          target: "riders",
        });
      });

    operationsRefunds
      .filter(
        (refund) =>
          !["COMPLETED", "PAID", "REJECTED", "CANCELLED", "CLOSED"].includes(refund.status),
      )
      .slice(0, 3)
      .forEach((refund) => {
        rows.push({
          type: "Refund",
          issue: \`${"${refund.publicId}: ${refund.reason}"}\`,
          area: "Support",
          assignedTo: "Finance / Support",
          priority: "High",
          status: refund.status.replaceAll("_", " "),
          action: "Review refund",
          target: "operations",
        });
      });

    return rows;
  }, [operationsOrders, operationsRefunds, products, riders, vendors]);

`;

replaceOnce(
  "  const orderMonitoring = [\n",
  `${attentionRows}  const orderMonitoring = [\n`,
  "order monitoring section",
);

const directReplacements = [
  ["onClick={() => setView(item.id)}", "onClick={() => navigateView(item.id)}"],
  ["onClick={() => setView(\"orders\")}", "onClick={() => navigateView(\"orders\")}"],
  ["onClick={() => setView(\"operations\")}", "onClick={() => navigateView(\"operations\")}"],
  ["onClick={() => setView(\"vendors\")}", "onClick={() => navigateView(\"vendors\")}"],
  ["onClick={() => setView(\"riders\")}", "onClick={() => navigateView(\"riders\")}"],
];

for (const [needle, replacement] of directReplacements) {
  if (!source.includes(needle)) {
    throw new Error(`Admin patch failed: missing navigation pattern ${needle}`);
  }
  source = source.replaceAll(needle, replacement);
}

const tableStart = `                <NeedsAttentionTable
                  rows={[
`;
const tableEnd = `                  onNavigate={setView}
                />`;
const startIndex = source.indexOf(tableStart);
const endIndex = source.indexOf(tableEnd, startIndex);
if (startIndex < 0 || endIndex < 0) {
  throw new Error("Admin patch failed: static needs-attention table was not found.");
}
source =
  source.slice(0, startIndex) +
  "                <NeedsAttentionTable rows={attentionRows} onNavigate={navigateView} />" +
  source.slice(endIndex + tableEnd.length);

fs.writeFileSync(file, source);
console.log("Applied bookmarkable admin navigation and real operations queue patch.");
