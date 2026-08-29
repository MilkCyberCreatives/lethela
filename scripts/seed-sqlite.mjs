import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { hash } from "bcryptjs";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const filePath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(filePath)) continue;

    for (const rawLine of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const separatorIndex = line.indexOf("=");
      if (separatorIndex <= 0) continue;
      const key = line.slice(0, separatorIndex).trim();
      if (process.env[key]) continue;
      let value = line.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  }
}

function sqlitePathFromUrl(value) {
  const url = String(value || "file:./dev.db").trim();
  if (!url.startsWith("file:")) {
    throw new Error("scripts/seed-sqlite.mjs only supports SQLite DATABASE_URL values.");
  }

  const body = url.slice("file:".length);
  if (path.isAbsolute(body)) return body;
  return path.resolve(process.cwd(), "prisma", body);
}

function nowIso() {
  return new Date().toISOString();
}

function upsertUser(db, user) {
  const existing = db.prepare("SELECT id FROM User WHERE email = ?").get(user.email);
  if (existing) {
    db.prepare(
      "UPDATE User SET name = ?, role = ?, passwordHash = ?, failedLoginAttempts = 0, lockedUntil = NULL, sessionVersion = sessionVersion + 1, updatedAt = ? WHERE email = ?",
    ).run(user.name, user.role, user.passwordHash, nowIso(), user.email);
    return existing.id;
  }

  db.prepare(
    "INSERT INTO User (id, email, name, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(user.id, user.email, user.name, user.passwordHash, user.role, nowIso(), nowIso());
  return user.id;
}

// Build the full column set an approved marketplace vendor needs to clear the
// public-catalog readiness gate (store details, trading address, banking, KYC,
// operating hours, and liquor licence fields for 18+ vendors). Values are
// obvious non-secret placeholders because the seed refuses to run in production.
function vendorColumns(vendor, ownerId) {
  const suburb = vendor.suburb ?? "Klipfontein View";
  const city = vendor.city ?? "Midrand";
  const province = vendor.province ?? "Gauteng";
  const image = vendor.image ?? "/vendors/grill.jpg";
  const isLiquor = Boolean(vendor.liquor);
  const licenceExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  return {
    slug: vendor.slug,
    name: vendor.name,
    email: vendor.email ?? `${vendor.slug}@vendors.lethela.test`,
    phone: vendor.phone ?? "0720000100",
    address: vendor.address ?? `Stand 100, ${suburb}`,
    suburb,
    city,
    province,
    municipality: vendor.municipality ?? "City of Johannesburg",
    township: vendor.township ?? suburb,
    sectionArea: vendor.sectionArea ?? "Section A",
    storeType: vendor.storeType ?? "Local food vendor",
    latitude: vendor.latitude ?? -25.9992,
    longitude: vendor.longitude ?? 28.1367,
    isActive: 1,
    status: "ACTIVE",
    ownerId,
    description:
      vendor.description ?? `${vendor.name} delivers fresh local orders around ${suburb}.`,
    coverImage: image,
    temporaryClosed: 0,
    preparationMinutes: vendor.etaMins ?? 25,
    kycIdUrl: "seed://kyc/id-document.pdf",
    kycProofUrl: "seed://kyc/proof-of-address.pdf",
    bankName: "FNB",
    bankAccountName: vendor.name,
    bankAccountNumber: "seed-not-a-real-account",
    bankBranchCode: "250655",
    bankAccountType: "Cheque",
    bankVerificationStatus: "VERIFIED",
    liquorLicenceUrl: isLiquor ? "seed://liquor/licence.pdf" : null,
    liquorLicenceNumber: isLiquor ? "GLA-SEED-0001" : null,
    liquorLicenceHolder: isLiquor ? vendor.name : null,
    liquorLicencePremises: isLiquor ? `Stand 100, ${suburb}` : null,
    liquorLicenceProvince: isLiquor ? province : null,
    liquorLicenceType: isLiquor ? "Off-consumption" : null,
    liquorLicenceExpiry: isLiquor ? licenceExpiry : null,
    liquorVerificationStatus: isLiquor ? "APPROVED" : "NOT_APPLICABLE",
    cuisine: JSON.stringify(vendor.cuisine ?? ["Township food"]),
    rating: vendor.rating ?? 4.5,
    deliveryFee: vendor.deliveryFee ?? 1900,
    etaMins: vendor.etaMins ?? 25,
    halaal: vendor.halaal ? 1 : 0,
    image,
    updatedAt: nowIso(),
  };
}

function upsertVendor(db, vendor, ownerId) {
  const existing = db.prepare("SELECT id FROM Vendor WHERE slug = ?").get(vendor.slug);
  const cols = vendorColumns(vendor, ownerId);
  const keys = Object.keys(cols);
  const values = keys.map((key) => cols[key]);

  if (existing) {
    const assignments = keys.map((key) => `${key} = ?`).join(", ");
    db.prepare(`UPDATE Vendor SET ${assignments} WHERE slug = ?`).run(...values, vendor.slug);
    return existing.id;
  }

  const id = vendor.id ?? `vendor-${vendor.slug}`;
  const insertKeys = ["id", ...keys, "createdAt"];
  const placeholders = insertKeys.map(() => "?").join(", ");
  db.prepare(`INSERT INTO Vendor (${insertKeys.join(", ")}) VALUES (${placeholders})`).run(
    id,
    ...values,
    nowIso(),
  );
  return id;
}

function ensureMembership(db, vendorId, userId) {
  const existing = db
    .prepare("SELECT id FROM VendorMember WHERE vendorId = ? AND userId = ?")
    .get(vendorId, userId);
  if (existing) return;
  db.prepare(
    "INSERT INTO VendorMember (id, vendorId, userId, role, createdAt) VALUES (?, ?, ?, ?, ?)",
  ).run(`member-${vendorId}-${userId}`, vendorId, userId, "OWNER", nowIso());
}

function upsertProduct(db, product) {
  const existing = db
    .prepare("SELECT id FROM Product WHERE vendorId = ? AND slug = ?")
    .get(product.vendorId, product.slug);
  if (existing) {
    db.prepare(
      `UPDATE Product
       SET name = ?, description = ?, priceCents = ?, image = ?, isAlcohol = ?,
           abv = ?, inStock = ?, status = 'APPROVED', updatedAt = ?
       WHERE vendorId = ? AND slug = ?`,
    ).run(
      product.name,
      product.description,
      product.priceCents,
      product.image,
      product.isAlcohol ? 1 : 0,
      product.abv ?? null,
      product.inStock ? 1 : 0,
      nowIso(),
      product.vendorId,
      product.slug,
    );
    return existing.id;
  }

  db.prepare(
    `INSERT INTO Product
     (id, vendorId, slug, name, description, priceCents, image, isAlcohol, abv, inStock, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?)`,
  ).run(
    product.id,
    product.vendorId,
    product.slug,
    product.name,
    product.description,
    product.priceCents,
    product.image,
    product.isAlcohol ? 1 : 0,
    product.abv ?? null,
    product.inStock ? 1 : 0,
    nowIso(),
    nowIso(),
  );
  return product.id;
}

function upsertOperatingHours(db, vendorId) {
  for (let day = 0; day < 7; day += 1) {
    const closed = day === 0 ? 1 : 0;
    const openMin = day === 0 ? 0 : 8 * 60;
    const closeMin = day === 0 ? 0 : 20 * 60;
    const existing = db
      .prepare("SELECT id FROM OperatingHour WHERE vendorId = ? AND day = ?")
      .get(vendorId, day);

    if (existing) {
      db.prepare(
        "UPDATE OperatingHour SET openMin = ?, closeMin = ?, closed = ? WHERE vendorId = ? AND day = ?",
      ).run(openMin, closeMin, closed, vendorId, day);
      continue;
    }

    db.prepare(
      "INSERT INTO OperatingHour (id, vendorId, day, openMin, closeMin, closed) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(`hours-${vendorId}-${day}`, vendorId, day, openMin, closeMin, closed);
  }
}

function upsertRider(db, userId) {
  const existing = db
    .prepare("SELECT id FROM RiderApplication WHERE id = ?")
    .get("rider-demo-approved");
  const values = [
    "Demo Rider",
    "rider@lethela.co.za",
    "+27 72 390 8919",
    "0000",
    "A1",
    "Klipfontein View",
    "Midrand",
    "Scooter",
    "LET 001 GP",
    "Weekdays 08:00-18:00",
    "Lethela Ops",
    "+27 72 390 8919",
    1,
    1,
    "Seed rider for launch-readiness and dashboard verification.",
    "Approved seed rider available for launch smoke tests.",
    "APPROVED",
  ];

  if (existing) {
    db.prepare(
      `UPDATE RiderApplication
       SET userId = ?, fullName = ?, email = ?, phone = ?, idNumberLast4 = ?, licenseCode = ?,
           suburb = ?, city = ?, vehicleType = ?, vehicleRegistration = ?,
           availableHours = ?, emergencyContactName = ?, emergencyContactPhone = ?,
           hasSmartphone = ?, hasBankAccount = ?, experience = ?, aiSummary = ?,
           status = ?, updatedAt = ?
       WHERE id = 'rider-demo-approved'`,
    ).run(userId, ...values, nowIso());
    return;
  }

  db.prepare(
    `INSERT INTO RiderApplication
     (id, userId, fullName, email, phone, idNumberLast4, licenseCode, suburb, city, vehicleType,
      vehicleRegistration, availableHours, emergencyContactName, emergencyContactPhone,
      hasSmartphone, hasBankAccount, experience, aiSummary, status, createdAt, updatedAt)
     VALUES ('rider-demo-approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(userId, ...values, nowIso(), nowIso());
}

loadEnv();

const databasePath = sqlitePathFromUrl(process.env.DATABASE_URL);
const workspacePath = path.resolve(process.cwd());
const relativeDatabasePath = path.relative(workspacePath, databasePath);
if (process.env.NODE_ENV === "production") {
  throw new Error("Refusing to seed demo accounts while NODE_ENV=production.");
}
if (relativeDatabasePath.startsWith("..") || path.isAbsolute(relativeDatabasePath)) {
  throw new Error("Refusing to seed a SQLite database outside the current workspace.");
}
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec("PRAGMA busy_timeout = 5000");

const vendorPasswordHash = await hash("DemoVendor123!", 10);
const customerPasswordHash = await hash("DemoBuyer2026", 10);
const riderPasswordHash = await hash("DemoRider2026", 10);
const adminPasswordHash = await hash("AdminDemo123!", 10);

db.exec("BEGIN");
try {
  const vendorUserId = upsertUser(db, {
    id: "seed-vendor-demo",
    email: "demo@lethela.co.za",
    name: "Demo Vendor",
    role: "VENDOR",
    passwordHash: vendorPasswordHash,
  });

  upsertUser(db, {
    id: "seed-customer-demo",
    email: "demo.customer@lethela.test",
    name: "DEMO - Customer",
    role: "CUSTOMER",
    passwordHash: customerPasswordHash,
  });

  const riderUserId = upsertUser(db, {
    id: "seed-rider-demo",
    email: "demo.rider@lethela.test",
    name: "DEMO - Rider",
    role: "RIDER",
    passwordHash: riderPasswordHash,
  });

  upsertUser(db, {
    id: "seed-admin-demo",
    email: "admin@lethela.co.za",
    name: "Lethela Admin",
    role: "ADMIN",
    passwordHash: adminPasswordHash,
  });

  // Marketplace demo content: an approved vendor for every township category so
  // category, search and homepage surfaces are populated in local development.
  const vendors = [
    {
      id: "vendor-hello-tomato",
      slug: "hello-tomato",
      name: "Hello Tomato",
      cuisine: ["Burgers", "Grill"],
      rating: 4.7,
      deliveryFee: 1900,
      etaMins: 25,
      image: "/vendors/grill.jpg",
    },
    {
      slug: "kasie-kota-king",
      name: "Kasie Kota King",
      cuisine: ["Kota", "Street food"],
      rating: 4.6,
      deliveryFee: 1600,
      etaMins: 20,
      image: "/vendors/burgers.jpg",
    },
    {
      slug: "crispy-chip-corner",
      name: "Crispy Chip Corner",
      cuisine: ["Chips", "Sides"],
      rating: 4.5,
      deliveryFee: 1500,
      etaMins: 18,
      image: "/vendors/grill.jpg",
    },
    {
      slug: "mogodu-house",
      name: "Mogodu House",
      cuisine: ["Mogodu", "Home cooking"],
      rating: 4.6,
      deliveryFee: 2000,
      etaMins: 32,
      halaal: true,
      image: "/vendors/grill.jpg",
    },
    {
      slug: "daily-grocer-spaza",
      name: "Daily Grocer Spaza",
      cuisine: ["Groceries", "Household", "Daily essentials"],
      storeType: "Spaza shop",
      rating: 4.4,
      deliveryFee: 1900,
      etaMins: 18,
      halaal: true,
      image: "/vendors/vegan.jpg",
    },
    {
      slug: "licensed-liquor-loft",
      name: "Licensed Liquor Loft",
      cuisine: ["Liquor", "Beer", "Cider"],
      storeType: "Grocery store",
      liquor: true,
      rating: 4.3,
      deliveryFee: 2100,
      etaMins: 30,
      image: "/vendors/vegan.jpg",
    },
    {
      slug: "cold-drinks-depot",
      name: "Cold Drinks Depot",
      cuisine: ["Drinks", "Refreshments"],
      storeType: "Spaza shop",
      rating: 4.4,
      deliveryFee: 1400,
      etaMins: 15,
      halaal: true,
      image: "/vendors/vegan.jpg",
    },
    {
      slug: "snack-shack",
      name: "Snack Shack",
      cuisine: ["Snacks", "Sweets"],
      storeType: "Spaza shop",
      rating: 4.5,
      deliveryFee: 1400,
      etaMins: 16,
      halaal: true,
      image: "/vendors/burgers.jpg",
    },
    {
      slug: "wing-yard",
      name: "Wing Yard",
      cuisine: ["Wings", "Chicken", "Street food"],
      rating: 4.5,
      deliveryFee: 1900,
      etaMins: 24,
      image: "/vendors/grill.jpg",
    },
    {
      slug: "chisa-nyama-braai",
      name: "Chisa Nyama Braai",
      cuisine: ["Braai", "Chisa nyama", "Wors"],
      rating: 4.6,
      deliveryFee: 2200,
      etaMins: 32,
      image: "/vendors/grill.jpg",
    },
    {
      slug: "pizza-plug",
      name: "Pizza Plug",
      cuisine: ["Pizza", "Sharing"],
      storeType: "Restaurant",
      rating: 4.5,
      deliveryFee: 2000,
      etaMins: 28,
      image: "/vendors/burgers.jpg",
    },
    {
      slug: "chicken-spot",
      name: "Chicken Spot",
      cuisine: ["Chicken", "Grill"],
      rating: 4.5,
      deliveryFee: 1800,
      etaMins: 22,
      image: "/vendors/grill.jpg",
    },
    {
      slug: "morning-vetkoek-cafe",
      name: "Morning Vetkoek Cafe",
      cuisine: ["Breakfast", "Vetkoek", "Coffee"],
      rating: 4.4,
      deliveryFee: 1400,
      etaMins: 20,
      halaal: true,
      image: "/vendors/burgers.jpg",
    },
  ];
  const vendorIds = new Map();
  for (const vendor of vendors) {
    const vendorId = upsertVendor(db, vendor, vendorUserId);
    vendorIds.set(vendor.slug, vendorId);
    upsertOperatingHours(db, vendorId);
  }
  ensureMembership(db, vendorIds.get("hello-tomato"), vendorUserId);

  const products = [
    {
      id: "product-hello-tomato-beef-burger",
      vendorSlug: "hello-tomato",
      slug: "hello-tomato-beef-burger",
      name: "Hello Tomato Beef Burger Combo",
      description: "Char-grilled beef burger with fresh toppings, slap fries and a cold drink.",
      priceCents: 8999,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-hello-tomato-chicken-burger",
      vendorSlug: "hello-tomato",
      slug: "hello-tomato-chicken-burger",
      name: "Hello Tomato Chicken Burger",
      description: "Crumbed chicken burger with lettuce, cheese and house burger sauce.",
      priceCents: 7999,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-loaded-kota-special",
      vendorSlug: "kasie-kota-king",
      slug: "loaded-kota-special",
      name: "Loaded Kota Special",
      description: "Quarter-bread kota with chips, polony, Russian, egg, cheese and atchar.",
      priceCents: 6999,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-large-slap-fries",
      vendorSlug: "crispy-chip-corner",
      slug: "large-slap-fries",
      name: "Large Slap Fries Portion",
      description: "Golden slap fries tossed with salt, vinegar and peri-peri dust.",
      priceCents: 3599,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-mogodu-tripe-plate",
      vendorSlug: "mogodu-house",
      slug: "mogodu-tripe-plate",
      name: "Mogodu Tripe Plate with Pap",
      description: "Slow-cooked mogodu tripe served with pap, chakalaka and morogo.",
      priceCents: 8499,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-bread-milk-eggs-pack",
      vendorSlug: "daily-grocer-spaza",
      slug: "bread-milk-eggs-pack",
      name: "Bread Milk and Eggs Essentials Pack",
      description: "Loaf of bread, 2L milk, a tray of eggs, maize meal and cooking oil.",
      priceCents: 18999,
      image: "/vendors/vegan.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-castle-lite-six-pack",
      vendorSlug: "licensed-liquor-loft",
      slug: "castle-lite-six-pack",
      name: "Castle Lite 6-Pack",
      description: "Ice-cold lager six pack. Adults 18+ only, valid ID required on delivery.",
      priceCents: 10999,
      image: "/vendors/vegan.jpg",
      isAlcohol: true,
      abv: 4,
      inStock: true,
    },
    {
      id: "product-coca-cola-2l",
      vendorSlug: "cold-drinks-depot",
      slug: "coca-cola-2l",
      name: "Coca-Cola 2L Cold Drink",
      description: "Chilled 2 litre Coca-Cola soft drink for the table.",
      priceCents: 2999,
      image: "/vendors/vegan.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-sweets-biscuit-pack",
      vendorSlug: "snack-shack",
      slug: "sweets-biscuit-snack-pack",
      name: "Sweets and Biscuit Snack Pack",
      description: "Mixed sweets, a chocolate bar and biscuits for movie night.",
      priceCents: 4999,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-peri-peri-wings-box",
      vendorSlug: "wing-yard",
      slug: "peri-peri-wings-box",
      name: "Peri-Peri Wings Six Piece Box",
      description: "Six flame-grilled wings with peri-peri baste, slap fries and a dip.",
      priceCents: 7999,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-braai-wors-roll",
      vendorSlug: "chisa-nyama-braai",
      slug: "braai-wors-roll",
      name: "Braai Wors Roll with Chakalaka",
      description: "Flame-grilled boerewors roll with tomato relish and spicy chakalaka.",
      priceCents: 5499,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-family-pizza-box",
      vendorSlug: "pizza-plug",
      slug: "family-pizza-box",
      name: "Family Pizza Sharing Box",
      description: "Large hand-stretched pizza with three toppings, cut for sharing.",
      priceCents: 12999,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-grilled-chicken-bucket",
      vendorSlug: "chicken-spot",
      slug: "grilled-chicken-bucket",
      name: "Grilled Chicken Bucket Meal",
      description: "Eight piece grilled chicken bucket with pap, gravy and a salad.",
      priceCents: 14999,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-vetkoek-breakfast-plate",
      vendorSlug: "morning-vetkoek-cafe",
      slug: "vetkoek-breakfast-plate",
      name: "Vetkoek Breakfast Plate with Egg",
      description: "Two vetkoek with savoury mince, fried egg and cheese plus a coffee.",
      priceCents: 6499,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
  ];
  for (const product of products) {
    const { vendorSlug, ...productData } = product;
    upsertProduct(db, {
      ...productData,
      vendorId: vendorIds.get(vendorSlug),
    });
  }

  // Drop stale catalogue rows from earlier seed runs so each seeded vendor only
  // carries its current demo products (keeps category inference predictable).
  const seededSlugsByVendor = new Map();
  for (const product of products) {
    const vendorId = vendorIds.get(product.vendorSlug);
    if (!vendorId) continue;
    if (!seededSlugsByVendor.has(vendorId)) seededSlugsByVendor.set(vendorId, []);
    seededSlugsByVendor.get(vendorId).push(product.slug);
  }
  for (const [vendorId, slugs] of seededSlugsByVendor) {
    const placeholders = slugs.map(() => "?").join(", ");
    try {
      db.prepare(`DELETE FROM Product WHERE vendorId = ? AND slug NOT IN (${placeholders})`).run(
        vendorId,
        ...slugs,
      );
    } catch {
      // A stale product still referenced by an order stays put; it is harmless.
    }
  }

  upsertRider(db, riderUserId);

  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}

console.log("SQLite seed complete.");
