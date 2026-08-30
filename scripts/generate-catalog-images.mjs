// Generates flat category tiles for the demo catalogue so each product image
// matches its township category. Run: node scripts/generate-catalog-images.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUT_DIR = path.resolve(process.cwd(), "public", "catalog");
const W = 800;
const H = 600;

const PRIMARY = "#B5001B";
const INK = "#F4F5F8";
const INK_DIM = "#C9CCDA";
const ACCENT = "#E4002B";

// Each icon is drawn inside a 0 0 200 200 group, centred later.
const ICONS = {
  kota: `
    <rect x="30" y="120" width="140" height="34" rx="10" fill="${INK}"/>
    <rect x="38" y="92" width="124" height="26" rx="9" fill="${ACCENT}"/>
    <rect x="30" y="58" width="140" height="34" rx="12" fill="${INK}"/>
    <circle cx="70" cy="75" r="4" fill="${INK_DIM}"/><circle cx="100" cy="72" r="4" fill="${INK_DIM}"/><circle cx="130" cy="75" r="4" fill="${INK_DIM}"/>`,
  chips: `
    <path d="M62 70 L138 70 L124 178 L76 178 Z" fill="${INK}"/>
    <rect x="72" y="30" width="14" height="60" rx="7" fill="${ACCENT}" transform="rotate(-14 79 60)"/>
    <rect x="94" y="24" width="14" height="66" rx="7" fill="${ACCENT}"/>
    <rect x="116" y="30" width="14" height="60" rx="7" fill="${ACCENT}" transform="rotate(14 123 60)"/>`,
  burger: `
    <path d="M40 78 q60 -52 120 0 Z" fill="${INK}"/>
    <rect x="40" y="86" width="120" height="18" rx="9" fill="${ACCENT}"/>
    <rect x="44" y="108" width="112" height="20" rx="10" fill="${INK}"/>
    <path d="M42 132 q58 40 116 0 l0 6 q-58 42 -116 0 Z" fill="${INK}"/>
    <circle cx="80" cy="60" r="4" fill="${INK_DIM}"/><circle cx="104" cy="52" r="4" fill="${INK_DIM}"/><circle cx="126" cy="62" r="4" fill="${INK_DIM}"/>`,
  mogodu: `
    <ellipse cx="100" cy="86" rx="70" ry="16" fill="${INK}"/>
    <path d="M32 86 q0 78 68 78 q68 0 68 -78 Z" fill="${INK}"/>
    <path d="M56 84 q4 44 44 44 q40 0 44 -44 Z" fill="${PRIMARY}"/>
    <path d="M86 30 q-10 14 0 26" stroke="${INK_DIM}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M114 26 q-10 16 0 30" stroke="${INK_DIM}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  groceries: `
    <path d="M46 74 L154 74 L142 176 L58 176 Z" fill="${INK}"/>
    <path d="M74 74 q0 -34 26 -34 q26 0 26 34" stroke="${ACCENT}" stroke-width="9" fill="none"/>
    <circle cx="88" cy="120" r="16" fill="${ACCENT}"/>
    <rect x="112" y="104" width="24" height="34" rx="5" fill="${INK_DIM}"/>`,
  liquor: `
    <rect x="52" y="70" width="34" height="18" fill="${INK}"/>
    <path d="M46 88 q0 -8 6 -12 l28 0 q6 4 6 12 l0 78 q0 12 -12 12 l-16 0 q-12 0 -12 -12 Z" fill="${INK}"/>
    <rect x="46" y="120" width="52" height="28" fill="${PRIMARY}"/>
    <path d="M118 74 l40 0 l-6 34 q-2 16 -14 16 q-12 0 -14 -16 Z" fill="${INK}"/>
    <rect x="135" y="124" width="6" height="34" fill="${INK}"/>
    <rect x="120" y="158" width="36" height="8" rx="4" fill="${INK}"/>`,
  drinks: `
    <path d="M64 74 L136 74 L128 176 L72 176 Z" fill="${INK}"/>
    <rect x="58" y="62" width="84" height="16" rx="6" fill="${INK_DIM}"/>
    <rect x="122" y="20" width="8" height="54" rx="4" fill="${ACCENT}" transform="rotate(12 126 47)"/>
    <circle cx="92" cy="104" r="5" fill="${ACCENT}"/><circle cx="110" cy="128" r="5" fill="${ACCENT}"/><circle cx="90" cy="150" r="5" fill="${ACCENT}"/>`,
  snacks: `
    <path d="M50 60 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l0 96 l-120 0 Z" fill="${INK}"/>
    <path d="M50 164 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8 l10 -8 l10 8" fill="${INK}"/>
    <circle cx="100" cy="112" r="20" fill="${ACCENT}"/>`,
  wings: `
    <circle cx="72" cy="86" r="28" fill="${INK}"/>
    <rect x="90" y="79" width="46" height="16" rx="8" fill="${INK}" transform="rotate(-20 113 87)"/>
    <circle cx="140" cy="58" r="10" fill="${INK_DIM}"/>
    <circle cx="140" cy="72" r="10" fill="${INK_DIM}"/>
    <circle cx="92" cy="150" r="28" fill="${INK}"/>
    <rect x="110" y="143" width="46" height="16" rx="8" fill="${INK}" transform="rotate(22 133 151)"/>
    <circle cx="162" cy="170" r="10" fill="${INK_DIM}"/>
    <circle cx="162" cy="156" r="10" fill="${INK_DIM}"/>`,
  braai: `
    <path d="M100 26 q26 34 8 58 q-4 6 -12 6 q22 -30 -4 -50 q6 26 -14 40 q-14 10 -14 -8 q0 -26 42 -46 Z" fill="${ACCENT}"/>
    <line x1="44" y1="150" x2="156" y2="150" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <line x1="44" y1="166" x2="156" y2="166" stroke="${INK}" stroke-width="8" stroke-linecap="round"/>
    <line x1="60" y1="140" x2="60" y2="176" stroke="${INK_DIM}" stroke-width="6"/>
    <line x1="140" y1="140" x2="140" y2="176" stroke="${INK_DIM}" stroke-width="6"/>`,
  pizza: `
    <path d="M100 30 L166 160 Q100 186 34 160 Z" fill="${INK}"/>
    <path d="M40 152 Q100 176 160 152" stroke="${PRIMARY}" stroke-width="14" fill="none"/>
    <circle cx="100" cy="92" r="10" fill="${ACCENT}"/>
    <circle cx="78" cy="128" r="9" fill="${ACCENT}"/>
    <circle cx="124" cy="126" r="9" fill="${ACCENT}"/>`,
  chicken: `
    <circle cx="92" cy="96" r="40" fill="${INK}"/>
    <rect x="120" y="86" width="60" height="22" rx="11" fill="${INK}" transform="rotate(-24 150 97)"/>
    <circle cx="176" cy="58" r="12" fill="${INK_DIM}"/>
    <circle cx="168" cy="74" r="12" fill="${INK_DIM}"/>
    <path d="M64 78 q-18 18 0 36" stroke="${INK_DIM}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  breakfast: `
    <path d="M46 118 q-14 -46 30 -50 q22 -2 30 14 q28 -10 40 14 q22 6 8 34 q-8 16 -50 16 q-46 0 -58 -28 Z" fill="${INK}"/>
    <circle cx="92" cy="102" r="20" fill="${ACCENT}"/>
    <rect x="120" y="128" width="46" height="40" rx="8" fill="${INK}"/>
    <path d="M166 136 q18 6 0 22" stroke="${INK}" stroke-width="8" fill="none"/>
    <path d="M132 112 q-6 10 0 18 M148 112 q-6 10 0 18" stroke="${INK_DIM}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
};

const LABELS = {
  kota: "Kota",
  chips: "Chips",
  burger: "Burgers",
  mogodu: "Mogodu",
  groceries: "Groceries",
  liquor: "Liquor · 18+",
  drinks: "Drinks",
  snacks: "Snacks",
  wings: "Wings",
  braai: "Braai",
  pizza: "Pizza",
  chicken: "Chicken",
  breakfast: "Breakfast",
};

function tile(key) {
  const icon = ICONS[key];
  const label = LABELS[key];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0B0F2E"/>
      <stop offset="1" stop-color="#050713"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0.4" r="0.6">
      <stop offset="0" stop-color="${PRIMARY}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${PRIMARY}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <rect x="24" y="24" width="${W - 48}" height="${H - 48}" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="2"/>
  <g transform="translate(${W / 2 - 100}, ${H / 2 - 150}) scale(1.35)">${icon}</g>
  <text x="${W / 2}" y="${H - 92}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700" fill="${INK}">${label}</text>
  <text x="${W / 2}" y="${H - 56}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" letter-spacing="3" fill="${INK_DIM}">LETHELA · DEMO</text>
</svg>`;
}

fs.mkdirSync(OUT_DIR, { recursive: true });

const keys = Object.keys(ICONS);
for (const key of keys) {
  const svg = Buffer.from(tile(key));
  const outfile = path.join(OUT_DIR, `${key}.png`);
  await sharp(svg).png({ compressionLevel: 9 }).toFile(outfile);
  console.log(`wrote ${path.relative(process.cwd(), outfile)}`);
}
console.log(`\n${keys.length} catalog images generated.`);
