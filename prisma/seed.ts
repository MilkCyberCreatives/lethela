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
  ];

  for (const v of vendors) {
    await prisma.vendor.upsert({
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

  const products = [
    {
      vendorId: helloTomato.id,
      name: "Hello Tomato Burger",
      slug: "hello-tomato-burger",
      description: "Char-grilled burger with fresh toppings.",
      priceCents: 8999,
      image: "/vendors/burgers.jpg",
      inStock: true,
    },
    {
      vendorId: helloTomato.id,
      name: "Cape Dry Cider 6-pack",
      slug: "cape-dry-cider-6-pack",
      description: "Cold and crisp local cider.",
      priceCents: 12999,
      image: "/vendors/vegan.jpg",
      isAlcohol: true,
      abv: 5,
      inStock: true,
    },
  ];

  for (const product of products) {
    await prisma.product.upsert({
      where: { vendorId_slug: { vendorId: product.vendorId, slug: product.slug } },
      update: product,
      create: product,
    });
  }

  const kasieMarket = await prisma.vendor.findUnique({ where: { slug: "kasie-market" } });
  if (kasieMarket) {
    await prisma.product.upsert({
      where: { vendorId_slug: { vendorId: kasieMarket.id, slug: "grocery-starter-pack" } },
      update: {
        vendorId: kasieMarket.id,
        name: "Grocery Starter Pack",
        slug: "grocery-starter-pack",
        description: "Bread, milk, eggs, maize meal and cooking oil for the week.",
        priceCents: 18999,
        image: "/vendors/vegan.jpg",
        inStock: true,
      },
      create: {
        vendorId: kasieMarket.id,
        name: "Grocery Starter Pack",
        slug: "grocery-starter-pack",
        description: "Bread, milk, eggs, maize meal and cooking oil for the week.",
        priceCents: 18999,
        image: "/vendors/vegan.jpg",
        inStock: true,
      },
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
