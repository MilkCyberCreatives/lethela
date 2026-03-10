export const TOWNSHIP_CATEGORIES = [
  "Kota",
  "Chips",
  "Burger",
  "Mogodu",
  "Alcohol",
  "Groceries",
  "Wings",
  "Braai",
  "Pizza",
  "Chicken",
  "Breakfast",
] as const;

export type TownshipCategory = (typeof TOWNSHIP_CATEGORIES)[number];

export function categoryToSlug(category: TownshipCategory | string) {
  return String(category)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function slugToCategory(slug: string): TownshipCategory | null {
  const match = TOWNSHIP_CATEGORIES.find((category) => categoryToSlug(category) === categoryToSlug(slug));
  return match ?? null;
}

export function inferProductCategory(input: {
  name: string;
  description?: string | null;
  isAlcohol?: boolean;
}): TownshipCategory {
  const haystack = `${input.name} ${input.description || ""}`.toLowerCase();

  if (input.isAlcohol) return "Alcohol";
  if (/kota|spatlho|magwinya/.test(haystack)) return "Kota";
  if (/chip|fries|atchar chips/.test(haystack)) return "Chips";
  if (/burger|beef burger|chicken burger/.test(haystack)) return "Burger";
  if (/mogodu|tripe/.test(haystack)) return "Mogodu";
  if (/egg|milk|bread|maize|rice|oil|beans|sugar|salt|flour|grocer/.test(haystack)) return "Groceries";
  if (/wing|drumstick/.test(haystack)) return "Wings";
  if (/braai|nyama|wors|chops/.test(haystack)) return "Braai";
  if (/pizza/.test(haystack)) return "Pizza";
  if (/chicken|bucket/.test(haystack)) return "Chicken";
  if (/breakfast|vetkoek|oats|cereal/.test(haystack)) return "Breakfast";
  return "Burger";
}
