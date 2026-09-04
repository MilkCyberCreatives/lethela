import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  getFallbackProducts,
  getFallbackVendorCards,
  getFallbackVendorProfile,
} from "../src/lib/catalog-fallback";

test("every demo product has a unique, product-specific local image", () => {
  const products = getFallbackProducts();
  const images = products.map((product) => product.image);

  assert.equal(products.length, 37);
  assert.equal(new Set(images).size, products.length);
  for (const product of products) {
    assert.match(product.image, /^\/products\/.+\.webp$/);
    assert.equal(fs.existsSync(path.join(process.cwd(), "public", product.image)), true);
  }
});

test("demo vendor menus retain product-specific images", () => {
  const vendor = getFallbackVendorProfile("mamsies-wings-yard");
  assert.ok(vendor);
  const images = vendor.items.map((item) => item.image);
  assert.equal(new Set(images).size, images.length);
  assert.ok(images.every((image) => image.startsWith("/products/")));
});

test("every demo vendor card has a distinct, relevant cover", () => {
  const cards = getFallbackVendorCards();
  assert.equal(new Set(cards.map((card) => card.cover)).size, cards.length);
});
