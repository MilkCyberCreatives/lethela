import { PrismaClient } from "@prisma/client";
import fs from "node:fs";
import path from "node:path";
import { hash } from "bcryptjs";

function loadLocalEnv() {
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

loadLocalEnv();

const prisma = new PrismaClient();

async function seedOperatingHours(vendorId: string) {
  for (let day = 0; day < 7; day += 1) {
    const closed = day === 0;
    await prisma.operatingHour.upsert({
      where: { vendorId_day: { vendorId, day } },
      update: {
        openMin: closed ? 0 : 8 * 60,
        closeMin: closed ? 0 : 20 * 60,
        closed,
      },
      create: {
        vendorId,
        day,
        openMin: closed ? 0 : 8 * 60,
        closeMin: closed ? 0 : 20 * 60,
        closed,
      },
    });
  }
}

async function main() {
  const demoPasswordHash = await hash("DemoVendor123!", 10);
  const adminPasswordHash = await hash("AdminDemo123!", 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@lethela.co.za" },
    update: {
      name: "Demo User",
      role: "VENDOR",
      passwordHash: demoPasswordHash,
    },
    create: {
      email: "demo@lethela.co.za",
      name: "Demo User",
      role: "VENDOR",
      passwordHash: demoPasswordHash,
    },
  });

  await prisma.user.upsert({
    where: { email: "admin@lethela.co.za" },
    update: {
      name: "Lethela Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "admin@lethela.co.za",
      name: "Lethela Admin",
      role: "ADMIN",
      passwordHash: adminPasswordHash,
    },
  });

  // PRE-LAUNCH DEMO CONTENT: remove demo-* vendors/products before launch.
  const vendors = [
    {
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

  for (const v of vendors) {
    const vendor = await prisma.vendor.upsert({
      where: { slug: v.slug },
      update: {
        name: v.name,
        suburb: v.suburb,
        city: v.city,
        province: v.province,
        cuisine: JSON.stringify(v.cuisine),
        rating: v.rating,
        deliveryFee: v.deliveryFee,
        etaMins: v.etaMins,
        halaal: v.halaal,
        image: v.image,
        ownerId: demoUser.id,
      },
      create: {
        slug: v.slug,
        name: v.name,
        suburb: v.suburb,
        city: v.city,
        province: v.province,
        cuisine: JSON.stringify(v.cuisine),
        rating: v.rating,
        deliveryFee: v.deliveryFee,
        etaMins: v.etaMins,
        halaal: v.halaal,
        image: v.image,
        ownerId: demoUser.id,
        isActive: true,
      },
    });
    await seedOperatingHours(vendor.id);
  }

  const helloTomato = await prisma.vendor.findUnique({ where: { slug: "hello-tomato" } });
  if (!helloTomato) return;

  await prisma.vendorMember.upsert({
    where: { vendorId_userId: { vendorId: helloTomato.id, userId: demoUser.id } },
    update: { role: "OWNER" },
    create: { vendorId: helloTomato.id, userId: demoUser.id, role: "OWNER" },
  });

  const burgersSection = await prisma.menuSection.upsert({
    where: { vendorId_title: { vendorId: helloTomato.id, title: "Burgers" } },
    update: { sortOrder: 1 },
    create: {
      vendorId: helloTomato.id,
      title: "Burgers",
      sortOrder: 1,
    },
  });

  const menuItems = [
    {
      vendorId: helloTomato.id,
      sectionId: burgersSection.id,
      name: "Classic Burger",
      description: "200g beef patty, cheddar, tomato, onion, house sauce.",
      priceCents: 7900,
      tags: JSON.stringify(["beef", "burgers"]),
      image: "/vendors/burgers.jpg",
    },
    {
      vendorId: helloTomato.id,
      sectionId: burgersSection.id,
      name: "Chicken Deluxe",
      description: "Grilled chicken breast, lettuce, tomato, mayo.",
      priceCents: 7600,
      tags: JSON.stringify(["chicken", "burgers"]),
      image: "/vendors/burgers.jpg",
    },
  ];

  for (const item of menuItems) {
    const exists = await prisma.item.findFirst({
      where: {
        vendorId: item.vendorId,
        sectionId: item.sectionId,
        name: item.name,
      },
    });
    if (!exists) await prisma.item.create({ data: item });
  }

  const vendorRows = await prisma.vendor.findMany({
    where: { slug: { in: vendors.map((vendor) => vendor.slug) } },
    select: { id: true, slug: true },
  });
  const vendorIdBySlug = new Map(vendorRows.map((vendor) => [vendor.slug, vendor.id]));

  const products = [
    {
      vendorSlug: "hello-tomato",
      name: "Hello Tomato Burger",
      slug: "hello-tomato-burger",
      description: "Char-grilled burger with fresh toppings.",
      priceCents: 8999,
      image: "/vendors/burgers.jpg",
      inStock: true,
    },
    {
      vendorSlug: "hello-tomato",
      name: "Township Kota Special",
      slug: "township-kota-special",
      description: "Loaded kota with chips, polony, egg, atchar and Russian.",
      priceCents: 6999,
      image: "/vendors/burgers.jpg",
      inStock: true,
    },
    {
      vendorSlug: "hello-tomato",
      name: "Large Kasie Chips",
      slug: "large-kasie-chips",
      description: "Crispy township-style chips with masala salt.",
      priceCents: 3599,
      image: "/vendors/grill.jpg",
      inStock: true,
    },
    {
      vendorSlug: "hello-tomato",
      name: "Demo Mogodu Plate",
      slug: "demo-mogodu-plate",
      description: "Tender mogodu served with pap, chakalaka and greens.",
      priceCents: 8499,
      image: "/vendors/grill.jpg",
      inStock: true,
    },
    {
      vendorSlug: "kasie-market",
      name: "Grocery Starter Pack",
      slug: "grocery-starter-pack",
      description: "Bread, milk, eggs, maize meal and cooking oil for the week.",
      priceCents: 18999,
      image: "/vendors/vegan.jpg",
      inStock: true,
    },
    {
      vendorSlug: "kasie-market",
      name: "Demo Groceries Bread Milk Airtime Pack",
      slug: "demo-airtime-bread-milk",
      description: "Groceries pack with bread, milk and prepaid airtime.",
      priceCents: 9999,
      image: "/vendors/vegan.jpg",
      inStock: true,
    },
    {
      vendorSlug: "demo-wings-yard",
      name: "Demo Six Piece Wings",
      slug: "demo-six-piece-wings",
      description: "Sticky wings with chips and house chilli dip.",
      priceCents: 7999,
      image: "/vendors/grill.jpg",
      inStock: true,
    },
    {
      vendorSlug: "demo-wings-yard",
      name: "Demo Chicken Bucket",
      slug: "demo-chicken-bucket",
      description: "Crispy chicken pieces for sharing with two sauces.",
      priceCents: 14999,
      image: "/vendors/grill.jpg",
      inStock: true,
    },
    {
      vendorSlug: "demo-braai-spot",
      name: "Demo Braai Plate",
      slug: "demo-braai-plate",
      description: "Chisa nyama braai plate with wors, pap and chakalaka.",
      priceCents: 11999,
      image: "/vendors/grill.jpg",
      inStock: true,
    },
    {
      vendorSlug: "demo-braai-spot",
      name: "Demo Boerewors Roll",
      slug: "demo-boerewors-roll",
      description: "Flame-grilled wors roll with tomato relish.",
      priceCents: 5499,
      image: "/vendors/grill.jpg",
      inStock: true,
    },
    {
      vendorSlug: "demo-breakfast-corner",
      name: "Demo Breakfast Vetkoek Plate",
      slug: "demo-breakfast-vetkoek-plate",
      description: "Breakfast plate with vetkoek, egg, cheese and coffee.",
      priceCents: 6499,
      image: "/vendors/burgers.jpg",
      inStock: true,
    },
    {
      vendorSlug: "demo-liquor-locker",
      name: "Demo Castle Lite 6-pack",
      slug: "demo-castle-lite-6-pack",
      description: "Cold beer 6-pack. 18+ only.",
      priceCents: 10999,
      image: "/vendors/vegan.jpg",
      isAlcohol: true,
      abv: 4,
      inStock: true,
    },
    {
      vendorSlug: "demo-liquor-locker",
      name: "Demo Savanna Cider 6-pack",
      slug: "demo-savanna-cider-6-pack",
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
    const vendorId = vendorIdBySlug.get(vendorSlug);
    if (!vendorId) continue;
    await prisma.product.upsert({
      where: { vendorId_slug: { vendorId, slug: product.slug } },
      update: { ...productData, vendorId },
      create: { ...productData, vendorId },
    });
  }

  const existingRider = await prisma.riderApplication.findUnique({
    where: { id: "rider-demo-approved" },
  });
  const riderData = {
    fullName: "Demo Rider",
    email: "rider@lethela.co.za",
    phone: "+27 72 390 8919",
    idNumberLast4: "0000",
    licenseCode: "A1",
    suburb: "Klipfontein View",
    city: "Midrand",
    vehicleType: "Scooter",
    vehicleRegistration: "LET 001 GP",
    availableHours: "Weekdays 08:00-18:00",
    emergencyContactName: "Lethela Ops",
    emergencyContactPhone: "+27 72 390 8919",
    hasSmartphone: true,
    hasBankAccount: true,
    experience: "Seed rider for launch-readiness and dashboard verification.",
    aiSummary: "Approved seed rider available for launch smoke tests.",
    status: "APPROVED",
  };

  if (existingRider) {
    await prisma.riderApplication.update({
      where: { id: "rider-demo-approved" },
      data: {
        ...riderData,
      },
    });
  } else {
    await prisma.riderApplication.create({
      data: {
        id: "rider-demo-approved",
        ...riderData,
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
