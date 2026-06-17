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
  ];

  const vendorIds = new Map();
  for (const vendor of vendors) {
    const vendorId = upsertVendor(db, vendor, vendorUserId);
    vendorIds.set(vendor.slug, vendorId);
  }
  ensureMembership(db, vendorIds.get("hello-tomato"), vendorUserId);

  const helloTomatoId = vendorIds.get("hello-tomato");
  upsertProduct(db, {
    id: "product-hello-burger",
    vendorId: helloTomatoId,
    slug: "hello-tomato-burger",
    name: "Hello Tomato Burger",
    description: "Char-grilled burger with fresh toppings.",
    priceCents: 8999,
    image: "/vendors/burgers.jpg",
    isAlcohol: false,
    inStock: true,
  });
  upsertProduct(db, {
    id: "product-cider-pack",
    vendorId: helloTomatoId,
    slug: "cape-dry-cider-6-pack",
    name: "Cape Dry Cider 6-pack",
    description: "Cold and crisp local cider.",
    priceCents: 12999,
    image: "/vendors/vegan.jpg",
    isAlcohol: true,
    abv: 5,
    inStock: true,
  });

  const kasieMarketId = vendorIds.get("kasie-market");
  upsertProduct(db, {
    id: "product-grocery-starter-pack",
    vendorId: kasieMarketId,
    slug: "grocery-starter-pack",
    name: "Grocery Starter Pack",
    description: "Bread, milk, eggs, maize meal and cooking oil for the week.",
    priceCents: 18999,
    image: "/vendors/vegan.jpg",
    isAlcohol: false,
    inStock: true,
  });

  upsertRider(db);

  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}

console.log("SQLite seed complete.");
