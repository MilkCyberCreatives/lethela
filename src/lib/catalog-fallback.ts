import { inferProductCategory, type TownshipCategory } from "@/lib/categories";

type VendorBase = {
  id: string;
  slug: string;
  name: string;
  suburb: string;
  city: string;
  province: string;
  cuisine: string[];
  rating: number;
  deliveryFee: number;
  etaMins: number;
  halaal: boolean;
  image: string;
  phone: string;
  address: string;
};

export type CatalogProductRecord = {
  id: string;
  slug: string;
  vendorId: string;
  vendorSlug: string;
  vendorName: string;
  name: string;
  description: string;
  priceCents: number;
  image: string;
  isAlcohol: boolean;
  inStock: boolean;
};

export type CatalogSectionItem = {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  priceCents: number;
  tags: string[];
  image: string | null;
};

export type CatalogSection = {
  id: string;
  title: string;
  sortOrder: number;
  items: CatalogSectionItem[];
};

export type CatalogVendorRecord = VendorBase & {
  isActive: boolean;
  status: "ACTIVE";
  products: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    priceCents: number;
    image: string;
    isAlcohol: boolean;
    inStock: boolean;
  }>;
  specials: Array<{
    id: string;
    title: string;
    discountPct: number;
    startsAt: Date;
    endsAt: Date;
  }>;
  hours: Array<{
    day: number;
    openMin: number;
    closeMin: number;
    closed: boolean;
  }>;
  sections: CatalogSection[];
  items: CatalogSectionItem[];
};

export type FallbackVendorCard = {
  id: string;
  name: string;
  slug: string;
  cover: string;
  badge: string | null;
  rating: number;
  cuisines: string[];
  distanceKm: number;
  baseEtaMin: number;
};

// PRE-LAUNCH DEMO CONTENT: remove demo-* vendors/products before launch.
const vendorIndex: VendorBase[] = [
  {
    id: "vendor-hello-tomato",
    slug: "hello-tomato",
    name: "Hello Tomato",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisine: ["Burgers", "Grill", "Township favourites"],
    rating: 4.7,
    deliveryFee: 1900,
    etaMins: 25,
    halaal: false,
    image: "/vendors/grill.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
  },
  {
    id: "vendor-bento",
    slug: "bento",
    name: "Bento",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisine: ["Sushi", "Asian", "Fresh bowls"],
    rating: 4.6,
    deliveryFee: 1500,
    etaMins: 22,
    halaal: false,
    image: "/vendors/sushi.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
  },
  {
    id: "vendor-spice-route",
    slug: "spice-route",
    name: "Spice Route",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisine: ["Curry", "Indian", "Comfort food"],
    rating: 4.5,
    deliveryFee: 1700,
    etaMins: 30,
    halaal: true,
    image: "/vendors/curry.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
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
    deliveryFee: 1200,
    etaMins: 18,
    halaal: true,
    image: "/vendors/vegan.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
  },
  {
    id: "vendor-mamsies-wings-yard",
    slug: "mamsies-wings-yard",
    name: "Mamsie's Wings Yard",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisine: ["Wings", "Chicken", "Street food"],
    rating: 4.5,
    deliveryFee: 1900,
    etaMins: 24,
    halaal: false,
    image: "/vendors/grill.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
  },
  {
    id: "vendor-ubuntu-braai-spot",
    slug: "ubuntu-braai-spot",
    name: "Ubuntu Braai Spot",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisine: ["Braai", "Chisa nyama", "Wors"],
    rating: 4.6,
    deliveryFee: 2200,
    etaMins: 32,
    halaal: false,
    image: "/vendors/grill.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
  },
  {
    id: "vendor-sunrise-breakfast-corner",
    slug: "sunrise-breakfast-corner",
    name: "Sunrise Breakfast Corner",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisine: ["Breakfast", "Vetkoek", "Coffee"],
    rating: 4.4,
    deliveryFee: 1400,
    etaMins: 20,
    halaal: true,
    image: "/vendors/burgers.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
  },
  {
    id: "vendor-klipfontein-bottle-store",
    slug: "klipfontein-bottle-store",
    name: "Klipfontein Bottle Store",
    suburb: "Klipfontein View",
    city: "Midrand",
    province: "Gauteng",
    cuisine: ["Alcohol", "Cider", "Beer"],
    rating: 4.3,
    deliveryFee: 1900,
    etaMins: 28,
    halaal: false,
    image: "/vendors/vegan.jpg",
    phone: "+27 72 390 8919",
    address: "Klipfontein View, Midrand",
  },
];

const fallbackVendorCards: FallbackVendorCard[] = [
  {
    id: "v1",
    name: "Hello Tomato",
    slug: "hello-tomato",
    cover: "/vendors/grill.jpg",
    badge: "Popular",
    rating: 4.7,
    cuisines: ["Burgers", "Grill"],
    distanceKm: 2.5,
    baseEtaMin: 14,
  },
  {
    id: "v2",
    name: "Bento",
    slug: "bento",
    cover: "/vendors/sushi.jpg",
    badge: null,
    rating: 4.6,
    cuisines: ["Sushi", "Asian"],
    distanceKm: 3.2,
    baseEtaMin: 16,
  },
  {
    id: "v3",
    name: "Spice Route",
    slug: "spice-route",
    cover: "/vendors/curry.jpg",
    badge: "Halaal",
    rating: 4.5,
    cuisines: ["Curry", "Indian"],
    distanceKm: 4.1,
    baseEtaMin: 18,
  },
  {
    id: "v4",
    name: "Kasie Market",
    slug: "kasie-market",
    cover: "/vendors/vegan.jpg",
    badge: "Essentials",
    rating: 4.4,
    cuisines: ["Groceries", "Essentials"],
    distanceKm: 2.8,
    baseEtaMin: 15,
  },
  {
    id: "demo-v5",
    name: "Mamsie's Wings Yard",
    slug: "mamsies-wings-yard",
    cover: "/vendors/grill.jpg",
    badge: "Crispy",
    rating: 4.5,
    cuisines: ["Wings", "Chicken"],
    distanceKm: 2.6,
    baseEtaMin: 16,
  },
  {
    id: "demo-v6",
    name: "Ubuntu Braai Spot",
    slug: "ubuntu-braai-spot",
    cover: "/vendors/grill.jpg",
    badge: "Weekend favourite",
    rating: 4.6,
    cuisines: ["Braai", "Chisa nyama"],
    distanceKm: 3.7,
    baseEtaMin: 20,
  },
  {
    id: "demo-v7",
    name: "Sunrise Breakfast Corner",
    slug: "sunrise-breakfast-corner",
    cover: "/vendors/burgers.jpg",
    badge: "Morning",
    rating: 4.4,
    cuisines: ["Breakfast", "Vetkoek"],
    distanceKm: 1.9,
    baseEtaMin: 13,
  },
  {
    id: "demo-v8",
    name: "Klipfontein Bottle Store",
    slug: "klipfontein-bottle-store",
    cover: "/vendors/vegan.jpg",
    badge: "18+",
    rating: 4.3,
    cuisines: ["Alcohol", "Cider"],
    distanceKm: 2.9,
    baseEtaMin: 17,
  },
];

const catalogProducts: CatalogProductRecord[] = [
  {
    id: "product-hello-burger",
    slug: "hello-tomato-burger",
    vendorId: "vendor-hello-tomato",
    vendorSlug: "hello-tomato",
    vendorName: "Hello Tomato",
    name: "Hello Tomato Burger",
    description: "Char-grilled burger with fresh toppings and house sauce.",
    priceCents: 8999,
    image: "/vendors/burgers.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "product-township-kota",
    slug: "township-kota-special",
    vendorId: "vendor-hello-tomato",
    vendorSlug: "hello-tomato",
    vendorName: "Hello Tomato",
    name: "Township Kota Special",
    description: "Loaded kota with chips, polony, egg, atchar and Russian.",
    priceCents: 6999,
    image: "/vendors/burgers.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "product-large-chips",
    slug: "large-kasie-chips",
    vendorId: "vendor-hello-tomato",
    vendorSlug: "hello-tomato",
    vendorName: "Hello Tomato",
    name: "Large Kasie Chips",
    description: "Crispy township-style chips with masala salt.",
    priceCents: 3599,
    image: "/vendors/grill.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "product-cider-pack",
    slug: "cape-dry-cider-6-pack",
    vendorId: "vendor-kasie-market",
    vendorSlug: "kasie-market",
    vendorName: "Kasie Market",
    name: "Cape Dry Cider 6-pack",
    description: "Cold and crisp local cider. 18+ only.",
    priceCents: 12999,
    image: "/vendors/vegan.jpg",
    isAlcohol: true,
    inStock: true,
  },
  {
    id: "product-grocery-pack",
    slug: "grocery-starter-pack",
    vendorId: "vendor-kasie-market",
    vendorSlug: "kasie-market",
    vendorName: "Kasie Market",
    name: "Grocery Starter Pack",
    description: "Bread, milk, eggs, maize meal and cooking oil for the week.",
    priceCents: 18999,
    image: "/vendors/vegan.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "product-rainbow-sushi",
    slug: "bento-rainbow-sushi",
    vendorId: "vendor-bento",
    vendorSlug: "bento",
    vendorName: "Bento",
    name: "Bento Rainbow Sushi",
    description: "Fresh sushi platter with avo, salmon and cucumber rolls.",
    priceCents: 11999,
    image: "/vendors/sushi.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "product-spice-curry",
    slug: "spice-route-curry",
    vendorId: "vendor-spice-route",
    vendorSlug: "spice-route",
    vendorName: "Spice Route",
    name: "Spice Route Curry",
    description: "Slow-cooked curry served with fragrant rice and sambals.",
    priceCents: 9999,
    image: "/vendors/curry.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-mogodu-plate",
    slug: "mogodu-sunday-plate",
    vendorId: "vendor-hello-tomato",
    vendorSlug: "hello-tomato",
    vendorName: "Hello Tomato",
    name: "Mogodu Sunday Plate",
    description: "Tender mogodu served with pap, chakalaka and greens.",
    priceCents: 8499,
    image: "/vendors/grill.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-wings",
    slug: "six-piece-sticky-wings",
    vendorId: "vendor-mamsies-wings-yard",
    vendorSlug: "mamsies-wings-yard",
    vendorName: "Mamsie's Wings Yard",
    name: "Six Piece Sticky Wings",
    description: "Sticky wings with chips and house chilli dip.",
    priceCents: 7999,
    image: "/vendors/grill.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-chicken-bucket",
    slug: "family-chicken-bucket",
    vendorId: "vendor-mamsies-wings-yard",
    vendorSlug: "mamsies-wings-yard",
    vendorName: "Mamsie's Wings Yard",
    name: "Family Chicken Bucket",
    description: "Crispy chicken pieces for sharing with two sauces.",
    priceCents: 14999,
    image: "/vendors/grill.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-braai-plate",
    slug: "chisa-nyama-braai-plate",
    vendorId: "vendor-ubuntu-braai-spot",
    vendorSlug: "ubuntu-braai-spot",
    vendorName: "Ubuntu Braai Spot",
    name: "Chisa Nyama Braai Plate",
    description: "Chisa nyama braai plate with wors, pap and chakalaka.",
    priceCents: 11999,
    image: "/vendors/grill.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-boerewors-roll",
    slug: "boerewors-relish-roll",
    vendorId: "vendor-ubuntu-braai-spot",
    vendorSlug: "ubuntu-braai-spot",
    vendorName: "Ubuntu Braai Spot",
    name: "Boerewors Relish Roll",
    description: "Flame-grilled wors roll with tomato relish.",
    priceCents: 5499,
    image: "/vendors/grill.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-breakfast-plate",
    slug: "breakfast-vetkoek-plate",
    vendorId: "vendor-sunrise-breakfast-corner",
    vendorSlug: "sunrise-breakfast-corner",
    vendorName: "Sunrise Breakfast Corner",
    name: "Breakfast Vetkoek Plate",
    description: "Breakfast plate with vetkoek, egg, cheese and coffee.",
    priceCents: 6499,
    image: "/vendors/burgers.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-airtime-bread-milk",
    slug: "bread-milk-airtime-pack",
    vendorId: "vendor-kasie-market",
    vendorSlug: "kasie-market",
    vendorName: "Kasie Market",
    name: "Bread Milk Airtime Pack",
    description: "Groceries pack with bread, milk and prepaid airtime.",
    priceCents: 9999,
    image: "/vendors/vegan.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "demo-product-castle-lite",
    slug: "castle-lite-6-pack",
    vendorId: "vendor-klipfontein-bottle-store",
    vendorSlug: "klipfontein-bottle-store",
    vendorName: "Klipfontein Bottle Store",
    name: "Castle Lite 6-pack",
    description: "Cold beer 6-pack. 18+ only.",
    priceCents: 10999,
    image: "/vendors/vegan.jpg",
    isAlcohol: true,
    inStock: true,
  },
  {
    id: "demo-product-savanna-cider",
    slug: "savanna-cider-6-pack",
    vendorId: "vendor-klipfontein-bottle-store",
    vendorSlug: "klipfontein-bottle-store",
    vendorName: "Klipfontein Bottle Store",
    name: "Savanna Cider 6-pack",
    description: "Crisp cider 6-pack. 18+ only.",
    priceCents: 12999,
    image: "/vendors/vegan.jpg",
    isAlcohol: true,
    inStock: true,
  },
  {
    id: "launch-product-chicken-strips",
    slug: "peri-peri-chicken-strips",
    vendorId: "vendor-mamsies-wings-yard",
    vendorSlug: "mamsies-wings-yard",
    vendorName: "Mamsie's Wings Yard",
    name: "Peri-Peri Chicken Strips",
    description: "Tender chicken strips with chips and a creamy peri-peri dip.",
    priceCents: 7499,
    image: "/vendors/grill.jpg",
    isAlcohol: false,
    inStock: true,
  },
  {
    id: "launch-product-kasie-pizza",
    slug: "kasie-chicken-pizza",
    vendorId: "vendor-hello-tomato",
    vendorSlug: "hello-tomato",
    vendorName: "Hello Tomato",
    name: "Kasie Chicken Pizza",
    description: "Thin-base pizza topped with chicken, peppers, onion and mozzarella.",
    priceCents: 10999,
    image: "/vendors/burgers.jpg",
    isAlcohol: false,
    inStock: true,
  },
];

const specialsBySlug: Record<string, CatalogVendorRecord["specials"]> = {
  "hello-tomato": [
    {
      id: "special-hello-tomato",
      title: "Burger combo hour",
      discountPct: 15,
      startsAt: new Date("2026-01-01T08:00:00.000Z"),
      endsAt: new Date("2027-01-01T20:00:00.000Z"),
    },
  ],
  "kasie-market": [
    {
      id: "special-kasie-market",
      title: "Weekend grocery saver",
      discountPct: 10,
      startsAt: new Date("2026-01-01T08:00:00.000Z"),
      endsAt: new Date("2027-01-01T20:00:00.000Z"),
    },
  ],
};

const sectionsBySlug: Record<string, CatalogSection[]> = {
  "hello-tomato": [
    {
      id: "section-hello-burgers",
      title: "Burgers and street food",
      sortOrder: 1,
      items: [
        {
          id: "menu-classic-burger",
          vendorId: "vendor-hello-tomato",
          name: "Classic Burger",
          description: "200g beef patty, cheddar, tomato, onion and house sauce.",
          priceCents: 7900,
          tags: ["beef", "burger"],
          image: "/vendors/burgers.jpg",
        },
        {
          id: "menu-kota-special",
          vendorId: "vendor-hello-tomato",
          name: "Kota Special",
          description: "Quarter loaf loaded with chips, egg, Russian and atchar.",
          priceCents: 6900,
          tags: ["kota", "township"],
          image: "/vendors/burgers.jpg",
        },
      ],
    },
  ],
  bento: [
    {
      id: "section-bento-main",
      title: "Sushi",
      sortOrder: 1,
      items: [
        {
          id: "menu-rainbow-roll",
          vendorId: "vendor-bento",
          name: "Rainbow Roll",
          description: "Eight-piece rainbow roll with salmon, avo and cucumber.",
          priceCents: 11900,
          tags: ["sushi", "fresh"],
          image: "/vendors/sushi.jpg",
        },
      ],
    },
  ],
  "spice-route": [
    {
      id: "section-spice-route-main",
      title: "Curries",
      sortOrder: 1,
      items: [
        {
          id: "menu-butter-chicken",
          vendorId: "vendor-spice-route",
          name: "Butter Chicken",
          description: "Creamy butter chicken served with rice.",
          priceCents: 9900,
          tags: ["curry", "chicken"],
          image: "/vendors/curry.jpg",
        },
      ],
    },
  ],
  "kasie-market": [
    {
      id: "section-kasie-market-main",
      title: "Groceries",
      sortOrder: 1,
      items: [
        {
          id: "menu-grocery-pack",
          vendorId: "vendor-kasie-market",
          name: "Starter Grocery Pack",
          description: "Bread, milk, eggs, maize meal and cooking oil.",
          priceCents: 18999,
          tags: ["groceries", "essentials"],
          image: "/vendors/vegan.jpg",
        },
      ],
    },
  ],
  "mamsies-wings-yard": [
    {
      id: "section-mamsies-wings-yard-main",
      title: "Wings and chicken",
      sortOrder: 1,
      items: [
        {
          id: "menu-demo-wings",
          vendorId: "vendor-mamsies-wings-yard",
          name: "Six Piece Sticky Wings",
          description: "Sticky wings with chips and house chilli dip.",
          priceCents: 7999,
          tags: ["wings", "chicken"],
          image: "/vendors/grill.jpg",
        },
        {
          id: "menu-demo-chicken-bucket",
          vendorId: "vendor-mamsies-wings-yard",
          name: "Family Chicken Bucket",
          description: "Crispy chicken pieces for sharing with two sauces.",
          priceCents: 14999,
          tags: ["chicken", "sharing"],
          image: "/vendors/grill.jpg",
        },
      ],
    },
  ],
  "ubuntu-braai-spot": [
    {
      id: "section-ubuntu-braai-spot-main",
      title: "Braai plates",
      sortOrder: 1,
      items: [
        {
          id: "menu-demo-braai-plate",
          vendorId: "vendor-ubuntu-braai-spot",
          name: "Chisa Nyama Braai Plate",
          description: "Chisa nyama braai plate with wors, pap and chakalaka.",
          priceCents: 11999,
          tags: ["braai", "wors"],
          image: "/vendors/grill.jpg",
        },
      ],
    },
  ],
  "sunrise-breakfast-corner": [
    {
      id: "section-sunrise-breakfast-corner-main",
      title: "Breakfast",
      sortOrder: 1,
      items: [
        {
          id: "menu-demo-breakfast-plate",
          vendorId: "vendor-sunrise-breakfast-corner",
          name: "Breakfast Vetkoek Plate",
          description: "Breakfast plate with vetkoek, egg, cheese and coffee.",
          priceCents: 6499,
          tags: ["breakfast", "coffee"],
          image: "/vendors/burgers.jpg",
        },
      ],
    },
  ],
  "klipfontein-bottle-store": [
    {
      id: "section-klipfontein-bottle-store-main",
      title: "Alcohol",
      sortOrder: 1,
      items: [
        {
          id: "menu-demo-castle-lite",
          vendorId: "vendor-klipfontein-bottle-store",
          name: "Castle Lite 6-pack",
          description: "Cold beer 6-pack. 18+ only.",
          priceCents: 10999,
          tags: ["alcohol", "beer"],
          image: "/vendors/vegan.jpg",
        },
        {
          id: "menu-demo-savanna-cider",
          vendorId: "vendor-klipfontein-bottle-store",
          name: "Savanna Cider 6-pack",
          description: "Crisp cider 6-pack. 18+ only.",
          priceCents: 12999,
          tags: ["alcohol", "cider"],
          image: "/vendors/vegan.jpg",
        },
      ],
    },
  ],
};

const fallbackHours = Array.from({ length: 7 }, (_, day) => ({
  day,
  openMin: day === 0 ? 0 : 8 * 60,
  closeMin: day === 0 ? 0 : 20 * 60,
  closed: day === 0,
}));

export function getFallbackSearchSources() {
  return {
    vendors: vendorIndex.map((vendor) => ({
      id: vendor.id,
      slug: vendor.slug,
      name: vendor.name,
      suburb: vendor.suburb,
      city: vendor.city,
      cuisine: vendor.cuisine,
    })),
    products: catalogProducts.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      image: product.image,
      priceCents: product.priceCents,
      isAlcohol: product.isAlcohol,
      vendor: {
        name: product.vendorName,
        slug: product.vendorSlug,
      },
    })),
  };
}

export function getFallbackVendorCards() {
  return fallbackVendorCards;
}

export function getFallbackCategoryProducts(category: TownshipCategory) {
  return catalogProducts
    .filter((product) => {
      return (
        product.inStock &&
        inferProductCategory({
          name: product.name,
          description: product.description,
          isAlcohol: product.isAlcohol,
        }) === category
      );
    })
    .map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      image: product.image,
      isAlcohol: product.isAlcohol,
      vendor: {
        id: product.vendorId,
        name: product.vendorName,
        slug: product.vendorSlug,
      },
    }));
}

export function getFallbackProducts() {
  return catalogProducts.map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    priceCents: product.priceCents,
    image: product.image,
    isAlcohol: product.isAlcohol,
    vendor: {
      id: product.vendorId,
      name: product.vendorName,
      slug: product.vendorSlug,
    },
    category: inferProductCategory({
      name: product.name,
      description: product.description,
      isAlcohol: product.isAlcohol,
    }),
  }));
}

export function getFallbackVendorProfile(slug: string): CatalogVendorRecord | null {
  const vendor = vendorIndex.find((entry) => entry.slug === slug);
  if (!vendor) return null;

  const products = catalogProducts
    .filter((product) => product.vendorSlug === slug && product.inStock)
    .map((product) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      image: product.image,
      isAlcohol: product.isAlcohol,
      inStock: product.inStock,
    }));

  const sections = sectionsBySlug[slug] ?? [];

  return {
    ...vendor,
    isActive: true,
    status: "ACTIVE",
    products,
    specials: specialsBySlug[slug] ?? [],
    hours: fallbackHours,
    sections,
    items: sections.flatMap((section) => section.items),
  };
}
