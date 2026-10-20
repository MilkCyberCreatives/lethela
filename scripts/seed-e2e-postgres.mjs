// Seeds a THROWAWAY local Postgres database for scripts/order-journey-test.mjs.
// It wipes every table first, so it refuses any DATABASE_URL that is not on this machine
// or whose database name does not contain "e2e" or "test".
//
//   DATABASE_URL=postgresql://e2e:e2e@127.0.0.1:5432/lethela_e2e node scripts/seed-e2e-postgres.mjs
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

export const E2E_STORE = {
  id: "vendor-e2e-kasi-kitchen",
  slug: "e2e-kasi-kitchen",
  name: "E2E Kasi Kitchen",
  phone: "0720000100",
  address: "Stand 12, Main Road",
  // Same point as the "Klipfontein View" fallback area, so a Klipfontein View delivery is 0 km
  // (R10 minimum) and a "Midrand" delivery is several km (R10 per km).
  latitude: -25.9581,
  longitude: 28.1452,
};

export const E2E_ACCOUNTS = {
  customer: {
    email: "demo.customer@lethela.test",
    password: "DemoBuyer2026",
    name: "Demo Customer",
  },
  vendor: { email: "demo@lethela.co.za", password: "DemoVendor123!", name: "Demo Vendor" },
  rider: { email: "demo.rider@lethela.test", password: "DemoRider2026", name: "Demo Rider" },
  rider2: { email: "second.rider@lethela.test", password: "SecondRider2026", name: "Second Rider" },
  admin: { email: "admin@lethela.co.za", password: "AdminDemo123!", name: "Lethela Admin" },
};

export const E2E_PRODUCTS = [
  { id: "product-e2e-kota", slug: "e2e-kota", name: "E2E Loaded Kota", priceCents: 4500 },
  { id: "product-e2e-chips", slug: "e2e-chips", name: "E2E Slap Chips", priceCents: 3000 },
  { id: "product-e2e-platter", slug: "e2e-platter", name: "E2E Party Platter", priceCents: 65000 },
];

export function assertLocalDatabase(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL is not a valid postgres URL.");
  }
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname);
  const dbName = parsed.pathname.replace(/^\//, "");
  if (!/^postgres(ql)?:$/.test(parsed.protocol) || !local || !/(e2e|test)/i.test(dbName)) {
    throw new Error(
      `Refusing to touch ${parsed.protocol}//${parsed.hostname}/${dbName}: only a local Postgres database named *e2e* or *test* is allowed.`,
    );
  }
}

export async function seedE2eDatabase(databaseUrl = process.env.DATABASE_URL) {
  assertLocalDatabase(databaseUrl);
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  try {
    const tables = await prisma.$queryRawUnsafe(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const names = tables
      .map((row) => `"${row.tablename}"`)
      .filter((name) => name !== '"_prisma_migrations"');
    if (names.length) await prisma.$executeRawUnsafe(`TRUNCATE ${names.join(", ")} CASCADE`);

    const users = {};
    for (const [key, account] of Object.entries(E2E_ACCOUNTS)) {
      const role = key === "rider2" ? "RIDER" : key.toUpperCase();
      users[key] = await prisma.user.create({
        data: {
          id: `seed-${key}`,
          email: account.email,
          name: account.name,
          phone: key === "customer" ? "0721112222" : null,
          role,
          passwordHash: await hash(account.password, 10),
          emailVerifiedAt: new Date(),
        },
      });
    }

    await prisma.vendor.create({
      data: {
        ...E2E_STORE,
        email: "e2e-kasi-kitchen@vendors.lethela.test",
        suburb: "Klipfontein View",
        city: "Midrand",
        province: "Gauteng",
        municipality: "City of Johannesburg",
        township: "Klipfontein View",
        sectionArea: "Section A",
        storeType: "Local food vendor",
        isActive: true,
        status: "APPROVED",
        ownerId: users.vendor.id,
        description: "Seeded store for the local order journey test.",
        coverImage: "/vendors/grill.jpg",
        image: "/vendors/grill.jpg",
        preparationMinutes: 20,
        etaMins: 25,
        cuisine: JSON.stringify(["Kota", "Street food"]),
        kycIdUrl: "seed://kyc/id.pdf",
        kycProofUrl: "seed://kyc/proof.pdf",
        bankName: "FNB",
        bankAccountName: "E2E Kasi Kitchen",
        bankAccountNumber: "seed-not-a-real-account",
        bankBranchCode: "250655",
        bankAccountType: "Cheque",
        bankVerificationStatus: "VERIFIED",
        deliveryFee: 1000,
        members: { create: { userId: users.vendor.id, role: "OWNER" } },
        // Open all day, every day, so the test never depends on the clock.
        hours: {
          create: Array.from({ length: 7 }, (_, day) => ({ day, openMin: 0, closeMin: 1440 })),
        },
        products: {
          create: E2E_PRODUCTS.map((product) => ({
            ...product,
            description: `${product.name} for the order journey test.`,
            image: "/vendors/burgers.jpg",
            status: "APPROVED",
            inStock: true,
          })),
        },
      },
    });

    // Products customers must NOT find: one waiting for review, one out of stock.
    await prisma.product.createMany({
      data: [
        {
          id: "product-e2e-unreviewed",
          vendorId: E2E_STORE.id,
          slug: "e2e-unreviewed-pie",
          name: "E2E Unreviewed Pie",
          priceCents: 2000,
          status: "SUBMITTED",
          inStock: true,
        },
        {
          id: "product-e2e-soldout",
          vendorId: E2E_STORE.id,
          slug: "e2e-soldout-pie",
          name: "E2E Soldout Pie",
          priceCents: 2000,
          status: "APPROVED",
          inStock: false,
        },
      ],
    });

    const riderBase = {
      idNumberLast4: "0000",
      licenseCode: "A1",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      municipality: "City of Johannesburg",
      township: "Klipfontein View",
      preferredZones: JSON.stringify(["Klipfontein View"]),
      vehicleType: "Scooter",
      vehicleRegistration: "E2E 001 GP",
      availableHours: "Every day",
      emergencyContactName: "E2E Ops",
      emergencyContactPhone: "0720000999",
      hasSmartphone: true,
      hasBankAccount: true,
      lawfulWorkDeclared: true,
      conductAccepted: true,
      liquorIdCheckAccepted: true,
      status: "APPROVED",
      submittedAt: new Date(),
    };
    // The demo rider starts offline; the test taps "Go online" in the rider dashboard.
    await prisma.riderApplication.create({
      data: {
        ...riderBase,
        id: "rider-e2e-demo",
        userId: users.rider.id,
        fullName: "Demo Rider",
        email: E2E_ACCOUNTS.rider.email,
        phone: "0720000201",
        availableNow: false,
      },
    });
    // A second approved rider is already online next to the store, so the request goes to
    // both and the test can check that only the first to accept gets it.
    await prisma.riderApplication.create({
      data: {
        ...riderBase,
        id: "rider-e2e-second",
        userId: users.rider2.id,
        fullName: "Second Rider",
        email: E2E_ACCOUNTS.rider2.email,
        phone: "0720000202",
        availableNow: true,
      },
    });
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS app_rider_locations (
        rider_id TEXT PRIMARY KEY,
        lat DOUBLE PRECISION NOT NULL,
        lng DOUBLE PRECISION NOT NULL,
        located_at TEXT NOT NULL
      )`);
    await prisma.$executeRawUnsafe(
      `INSERT INTO app_rider_locations (rider_id, lat, lng, located_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT (rider_id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, located_at = excluded.located_at`,
      "rider-e2e-second",
      E2E_STORE.latitude + 0.003,
      E2E_STORE.longitude + 0.003,
      new Date().toISOString(),
    );
    // Clear any app-created side tables that survived (rate limits, events, offers).
    for (const table of [
      "app_rate_limits",
      "app_order_notification_logs",
      "app_dispatch_offers",
      "app_order_events",
      "app_dispatch_assignments",
    ]) {
      await prisma.$executeRawUnsafe(`DELETE FROM ${table}`).catch(() => {});
    }
    return { users };
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await seedE2eDatabase();
  console.log("Seeded local e2e database.");
}
