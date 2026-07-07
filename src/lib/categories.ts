export const TOWNSHIP_CATEGORIES = [
  "Kota",
  "Chips",
  "Burger",
  "Mogodu",
  "Groceries",
  "Liquor",
  "Drinks",
  "Snacks",
  "Wings",
  "Braai",
  "Pizza",
  "Chicken",
  "Breakfast",
] as const;

export type TownshipCategory = (typeof TOWNSHIP_CATEGORIES)[number];

export const CATEGORY_CONTENT: Record<
  TownshipCategory,
  { headline: string; intro: string; guidance: string }
> = {
  Kota: {
    headline: "Loaded kota delivery for local cravings",
    intro:
      "Find township-style kotas with chips, atchar, egg, Russian, cheese and house sauces from approved local kitchens.",
    guidance:
      "Kotas travel best when sauces are packed properly, so vendors may adjust packaging or preparation notes for delivery quality.",
  },
  Chips: {
    headline: "Fresh chips, slap chips and sides",
    intro:
      "Browse crispy chips, masala chips, large sharing portions and quick sides for lunch, dinner or late-afternoon cravings.",
    guidance:
      "For best results, order chips with notes about salt, vinegar, atchar or sauce preferences before checkout.",
  },
  Burger: {
    headline: "Burgers from nearby kitchens",
    intro:
      "Order beef, chicken and township-style burgers with fresh toppings, sauces and delivery-ready packaging.",
    guidance: "Availability depends on each vendor's operating hours, stock and preparation queue.",
  },
  Mogodu: {
    headline: "Mogodu plates and comfort meals",
    intro:
      "Discover slow-cooked mogodu, pap, chakalaka and homestyle plates prepared by local food vendors.",
    guidance:
      "Traditional meals can sell out quickly, especially on weekends, so live stock may change during busy periods.",
  },
  Groceries: {
    headline: "Groceries",
    intro:
      "Shop bread, milk, eggs, maize meal, rice, cooking oil, toiletries, cleaning products and daily essentials from nearby grocery sellers.",
    guidance:
      "Lethela supports simple grocery baskets, stock lists and customer-approved substitutions before dispatch where an item is unavailable.",
  },
  Liquor: {
    headline: "Liquor",
    intro:
      "For adults 18+ only. Liquor is sold by approved licensed vendors. Valid ID may be required on delivery.",
    guidance:
      "You must be 18 years or older to view liquor products. Liquor stays separate from groceries and is only available from licensed vendors.",
  },
  Drinks: {
    headline: "Drinks",
    intro: "Browse cold drinks, juice, water and everyday refreshments from nearby vendors.",
    guidance: "Drinks excludes liquor and other restricted 18+ products.",
  },
  Snacks: {
    headline: "Snacks",
    intro: "Browse chips, sweets, biscuits and quick snack items from nearby vendors.",
    guidance: "Snack availability depends on live vendor stock and delivery coverage.",
  },
  Wings: {
    headline: "Wings, dips and sharing boxes",
    intro:
      "Order sticky wings, peri-peri wings, crispy chicken portions and sharing boxes with chips or sides.",
    guidance:
      "Choose mild, hot or house sauce options where available and check vendor notes for spice levels.",
  },
  Braai: {
    headline: "Braai plates and chisa nyama favourites",
    intro:
      "Find wors rolls, braai plates, pap, chakalaka and flame-grilled meals from local vendors.",
    guidance:
      "Braai orders may have longer preparation times during peak meal periods because items are grilled fresh.",
  },
  Pizza: {
    headline: "Pizza for quick group orders",
    intro: "Browse local pizza options for family dinners, office lunches and quick sharing meals.",
    guidance:
      "Check toppings and delivery distance before checkout so the order arrives hot and intact.",
  },
  Chicken: {
    headline: "Chicken meals and buckets",
    intro:
      "Order grilled chicken, crispy chicken, strips, buckets and quick chicken meals from nearby kitchens.",
    guidance:
      "Chicken vendors may update stock during rush periods to keep preparation times realistic.",
  },
  Breakfast: {
    headline: "Breakfast and morning delivery",
    intro:
      "Start the day with vetkoek, breakfast plates, coffee and quick morning meals from local vendors.",
    guidance: "Morning availability depends on each vendor's opening hours and delivery coverage.",
  },
};

export function categoryToSlug(category: TownshipCategory | string) {
  return String(category)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToCategory(slug: string): TownshipCategory | null {
  const normalizedSlug = categoryToSlug(slug);
  if (["liquor", "alcohol", "beer", "wine", "cider"].includes(normalizedSlug)) {
    return "Liquor";
  }
  if (
    ["groceries", "grocery", "spaza", "spaza-groceries", "spaza-shop-delivery"].includes(
      normalizedSlug,
    )
  ) {
    return "Groceries";
  }
  const match = TOWNSHIP_CATEGORIES.find((category) => categoryToSlug(category) === normalizedSlug);
  return match ?? null;
}

export function inferProductCategory(input: {
  name: string;
  description?: string | null;
  isAlcohol?: boolean;
}): TownshipCategory {
  const haystack = `${input.name} ${input.description || ""}`.toLowerCase();

  if (input.isAlcohol) return "Liquor";
  if (/kota|spatlho|magwinya/.test(haystack)) return "Kota";
  if (/wing|drumstick/.test(haystack)) return "Wings";
  if (/breakfast|vetkoek|oats|cereal/.test(haystack)) return "Breakfast";
  if (/braai|nyama|wors|chops/.test(haystack)) return "Braai";
  if (/cold drink|cooldrink|juice|water|soda|drink/.test(haystack)) return "Drinks";
  if (/snack|chips|crisps|biscuit|sweet|chocolate/.test(haystack)) return "Snacks";
  if (/chip|fries|atchar chips/.test(haystack)) return "Chips";
  if (/burger|beef burger|chicken burger/.test(haystack)) return "Burger";
  if (/mogodu|tripe/.test(haystack)) return "Mogodu";
  if (
    /egg|milk|bread|maize|rice|pasta|oil|beans|sugar|tea|snack|cold drink|cleaning|toiletr|baby|household|spaza|grocer/.test(
      haystack,
    )
  )
    return "Groceries";
  if (/pizza/.test(haystack)) return "Pizza";
  if (/chicken|bucket/.test(haystack)) return "Chicken";
  return "Burger";
}
