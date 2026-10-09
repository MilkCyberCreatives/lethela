// /src/lib/format.ts
// Prices are built by hand so the server and every browser print exactly the same text. ICU
// data for en-ZA differs between Node and browsers ("R 45,5" against "R 45.5"), which showed
// half-written prices and made React redraw the page. Whole rands stay short ("R 45"); prices
// with cents always show two digits ("R 45.50"), like the product cards.
export function formatZAR(cents: number) {
  const total = Math.round(Math.abs(Number(cents) || 0));
  const rands = Math.floor(total / 100);
  const rest = total % 100;
  const whole = String(rands).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const amount = rest ? `${whole}.${String(rest).padStart(2, "0")}` : whole;
  return `${cents < 0 && total > 0 ? "-" : ""}R ${amount}`;
}
