import test from "node:test";
import assert from "node:assert/strict";
import { getFallbackCategoryProducts } from "../src/lib/catalog-fallback";
import {
  buildPublicVendorCard,
  isPublicCatalogProduct,
  isPublicCatalogVendor,
} from "../src/lib/public-catalog";

test("buildPublicVendorCard prefers real review averages over fallback vendor rating", () => {
  const card = buildPublicVendorCard({
    id: "vendor-1",
    name: "Vendor One",
    slug: "vendor-one",
    rating: 4.4,
    cuisine: JSON.stringify(["Burgers"]),
    etaMins: 25,
    products: [{ isAlcohol: false }],
    reviews: [{ rating: 5 }, { rating: 4 }, { rating: 5 }],
  });

  assert.equal(card.rating, 4.7);
  assert.equal(card.eta, "25-30 min");
  assert.deepEqual(card.cuisines, ["Burgers"]);
});

test("isPublicCatalogVendor hides the owner demo identity from public catalog surfaces", () => {
  assert.equal(
    isPublicCatalogVendor({ name: "Milk Cyber Creatives", slug: "milk-cyber-creatives" }),
    false,
  );
  assert.equal(
    isPublicCatalogVendor({ name: "Milk Cyber Creatives Owner", slug: "lethela-owner" }),
    false,
  );
  assert.equal(isPublicCatalogVendor({ name: "Demo Wings Yard", slug: "demo-wings-yard" }), false);
  assert.equal(isPublicCatalogVendor({ name: "Hello Tomato", slug: "hello-tomato" }), true);
});

test("isPublicCatalogProduct hides legacy demo product records", () => {
  assert.equal(
    isPublicCatalogProduct({
      id: "demo-product-airtime-bread-milk",
      name: "Demo Groceries Bread Milk Airtime Pack",
      vendorName: "Kasie Market",
      vendorSlug: "kasie-market",
    }),
    false,
  );
  assert.equal(
    isPublicCatalogProduct({
      id: "launch-product-airtime-bread-milk",
      name: "Bread Milk Airtime Pack",
      vendorName: "Kasie Market",
      vendorSlug: "kasie-market",
    }),
    true,
  );
});

test("alcohol launch samples cover key drink categories", () => {
  const names = getFallbackCategoryProducts("Alcohol")
    .map((item) => item.name.toLowerCase())
    .join(" ");

  for (const term of ["castle", "cider", "whiskey", "vodka", "gin", "cognac"]) {
    assert.match(names, new RegExp(term));
  }
});
