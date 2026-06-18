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
      "UPDATE User SET name = ?, role = ?, passwordHash = ?, updatedAt = ? WHERE email = ?",
    ).run(user.name, user.role, user.passwordHash, nowIso(), user.email);
    return existing.id;
  }

  db.prepare(
    "INSERT INTO User (id, email, name, passwordHash, role, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(user.id, user.email, user.name, user.passwordHash, user.role, nowIso(), nowIso());
  return user.id;
}

function upsertVendor(db, vendor, ownerId) {
  const existing = db.prepare("SELECT id FROM Vendor WHERE slug = ?").get(vendor.slug);
  const cuisine = JSON.stringify(vendor.cuisine);
  if (existing) {
    db.prepare(
      `UPDATE Vendor
       SET name = ?, suburb = ?, city = ?, province = ?, cuisine = ?, rating = ?,
           deliveryFee = ?, etaMins = ?, halaal = ?, image = ?, ownerId = ?,
           isActive = 1, status = 'ACTIVE', updatedAt = ?
       WHERE slug = ?`,
    ).run(
      vendor.name,
      vendor.suburb,
      vendor.city,
      vendor.province,
      cuisine,
      vendor.rating,
      vendor.deliveryFee,
      vendor.etaMins,
      vendor.halaal ? 1 : 0,
      vendor.image,
      ownerId,
      nowIso(),
      vendor.slug,
    );
    return existing.id;
  }

  db.prepare(
    `INSERT INTO Vendor
     (id, slug, name, suburb, city, province, cuisine, rating, deliveryFee, etaMins,
      halaal, image, ownerId, isActive, status, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'ACTIVE', ?, ?)`,
  ).run(
    vendor.id,
    vendor.slug,
    vendor.name,
    vendor.suburb,
    vendor.city,
    vendor.province,
    cuisine,
    vendor.rating,
    vendor.deliveryFee,
    vendor.etaMins,
    vendor.halaal ? 1 : 0,
    vendor.image,
    ownerId,
    nowIso(),
    nowIso(),
  );
  return vendor.id;
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
           abv = ?, inStock = ?, updatedAt = ?
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
     (id, vendorId, slug, name, description, priceCents, image, isAlcohol, abv, inStock, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

function upsertRider(db) {
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
       SET fullName = ?, email = ?, phone = ?, idNumberLast4 = ?, licenseCode = ?,
           suburb = ?, city = ?, vehicleType = ?, vehicleRegistration = ?,
           availableHours = ?, emergencyContactName = ?, emergencyContactPhone = ?,
           hasSmartphone = ?, hasBankAccount = ?, experience = ?, aiSummary = ?,
           status = ?, updatedAt = ?
       WHERE id = 'rider-demo-approved'`,
    ).run(...values, nowIso());
    return;
  }

  db.prepare(
    `INSERT INTO RiderApplication
     (id, fullName, email, phone, idNumberLast4, licenseCode, suburb, city, vehicleType,
      vehicleRegistration, availableHours, emergencyContactName, emergencyContactPhone,
      hasSmartphone, hasBankAccount, experience, aiSummary, status, createdAt, updatedAt)
     VALUES ('rider-demo-approved', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(...values, nowIso(), nowIso());
}

loadEnv();

const databasePath = sqlitePathFromUrl(process.env.DATABASE_URL);
fs.mkdirSync(path.dirname(databasePath), { recursive: true });

const db = new DatabaseSync(databasePath);
db.exec("PRAGMA busy_timeout = 5000");

const vendorPasswordHash = await hash("DemoVendor123!", 10);
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
    id: "seed-admin-demo",
    email: "admin@lethela.co.za",
    name: "Lethela Admin",
    role: "ADMIN",
    passwordHash: adminPasswordHash,
  });

  // PRE-LAUNCH DEMO CONTENT: remove demo-* vendors/products before launch.
  const vendors = [
    {
      id: "vendor-hello-tomato",
      slug: "hello-tomato",
      name: "Hello Tomato",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Burgers", "Grill"],
      rating: 4.7,
      deliveryFee: 1900,
      etaMins: 25,
      halaal: false,
      image: "/vendors/grill.jpg",
    },
    {
      id: "vendor-bento",
      slug: "bento",
      name: "Bento",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Sushi", "Asian"],
      rating: 4.6,
      deliveryFee: 1500,
      etaMins: 22,
      halaal: false,
      image: "/vendors/sushi.jpg",
    },
    {
      id: "vendor-spice-route",
      slug: "spice-route",
      name: "Spice Route",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Curry", "Indian"],
      rating: 4.5,
      deliveryFee: 1700,
      etaMins: 30,
      halaal: true,
      image: "/vendors/curry.jpg",
    },
    {
      id: "vendor-kasie-market",
      slug: "kasie-market",
      name: "Kasie Market",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Groceries", "Household", "Daily essentials"],
      rating: 4.4,
      deliveryFee: 1900,
      etaMins: 18,
      halaal: true,
      image: "/vendors/vegan.jpg",
    },
    {
      id: "vendor-demo-wings-yard",
      slug: "demo-wings-yard",
      name: "Demo Wings Yard",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Wings", "Chicken", "Street food"],
      rating: 4.5,
      deliveryFee: 1900,
      etaMins: 24,
      halaal: false,
      image: "/vendors/grill.jpg",
    },
    {
      id: "vendor-demo-braai-spot",
      slug: "demo-braai-spot",
      name: "Demo Braai Spot",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Braai", "Chisa nyama", "Wors"],
      rating: 4.6,
      deliveryFee: 2200,
      etaMins: 32,
      halaal: false,
      image: "/vendors/grill.jpg",
    },
    {
      id: "vendor-demo-breakfast-corner",
      slug: "demo-breakfast-corner",
      name: "Demo Breakfast Corner",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Breakfast", "Vetkoek", "Coffee"],
      rating: 4.4,
      deliveryFee: 1400,
      etaMins: 20,
      halaal: true,
      image: "/vendors/burgers.jpg",
    },
    {
      id: "vendor-demo-liquor-locker",
      slug: "demo-liquor-locker",
      name: "Demo Liquor Locker",
      suburb: "Klipfontein View",
      city: "Midrand",
      province: "Gauteng",
      cuisine: ["Alcohol", "Cider", "Beer"],
      rating: 4.3,
      deliveryFee: 1900,
      etaMins: 28,
      halaal: false,
      image: "/vendors/vegan.jpg",
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
      id: "product-hello-burger",
      vendorSlug: "hello-tomato",
      slug: "hello-tomato-burger",
      name: "Hello Tomato Burger",
      description: "Char-grilled burger with fresh toppings.",
      priceCents: 8999,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-township-kota",
      vendorSlug: "hello-tomato",
      slug: "township-kota-special",
      name: "Township Kota Special",
      description: "Loaded kota with chips, polony, egg, atchar and Russian.",
      priceCents: 6999,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-large-chips",
      vendorSlug: "hello-tomato",
      slug: "large-kasie-chips",
      name: "Large Kasie Chips",
      description: "Crispy township-style chips with masala salt.",
      priceCents: 3599,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-mogodu-plate",
      vendorSlug: "hello-tomato",
      slug: "demo-mogodu-plate",
      name: "Demo Mogodu Plate",
      description: "Tender mogodu served with pap, chakalaka and greens.",
      priceCents: 8499,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "product-grocery-starter-pack",
      vendorSlug: "kasie-market",
      slug: "grocery-starter-pack",
      name: "Grocery Starter Pack",
      description: "Bread, milk, eggs, maize meal and cooking oil for the week.",
      priceCents: 18999,
      image: "/vendors/vegan.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-airtime-bread-milk",
      vendorSlug: "kasie-market",
      slug: "demo-airtime-bread-milk",
      name: "Demo Groceries Bread Milk Airtime Pack",
      description: "Groceries pack with bread, milk and prepaid airtime.",
      priceCents: 9999,
      image: "/vendors/vegan.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-wings",
      vendorSlug: "demo-wings-yard",
      slug: "demo-six-piece-wings",
      name: "Demo Six Piece Wings",
      description: "Sticky wings with chips and house chilli dip.",
      priceCents: 7999,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-chicken-bucket",
      vendorSlug: "demo-wings-yard",
      slug: "demo-chicken-bucket",
      name: "Demo Chicken Bucket",
      description: "Crispy chicken pieces for sharing with two sauces.",
      priceCents: 14999,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-braai-plate",
      vendorSlug: "demo-braai-spot",
      slug: "demo-braai-plate",
      name: "Demo Braai Plate",
      description: "Chisa nyama braai plate with wors, pap and chakalaka.",
      priceCents: 11999,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-boerewors-roll",
      vendorSlug: "demo-braai-spot",
      slug: "demo-boerewors-roll",
      name: "Demo Boerewors Roll",
      description: "Flame-grilled wors roll with tomato relish.",
      priceCents: 5499,
      image: "/vendors/grill.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-breakfast-plate",
      vendorSlug: "demo-breakfast-corner",
      slug: "demo-breakfast-vetkoek-plate",
      name: "Demo Breakfast Vetkoek Plate",
      description: "Breakfast plate with vetkoek, egg, cheese and coffee.",
      priceCents: 6499,
      image: "/vendors/burgers.jpg",
      isAlcohol: false,
      inStock: true,
    },
    {
      id: "demo-product-castle-lite",
      vendorSlug: "demo-liquor-locker",
      slug: "demo-castle-lite-6-pack",
      name: "Demo Castle Lite 6-pack",
      description: "Cold beer 6-pack. 18+ only.",
      priceCents: 10999,
      image: "/vendors/vegan.jpg",
      isAlcohol: true,
      abv: 4,
      inStock: true,
    },
    {
      id: "demo-product-savanna-cider",
      vendorSlug: "demo-liquor-locker",
      slug: "demo-savanna-cider-6-pack",
      name: "Demo Savanna Cider 6-pack",
      description: "Crisp cider 6-pack. 18+ only.",
      priceCents: 12999,
      image: "/vendors/vegan.jpg",
      isAlcohol: true,
      abv: 5,
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

  upsertRider(db);

  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}

console.log("SQLite seed complete.");
