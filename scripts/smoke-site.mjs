const baseUrl = (process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");

const checks = [
  { method: "GET", path: "/" },
  { method: "GET", path: "/search" },
  { method: "GET", path: "/track" },
  { method: "GET", path: "/vendors/register" },
  { method: "GET", path: "/rider" },
  { method: "GET", path: "/robots.txt" },
  { method: "GET", path: "/sitemap.xml" },
  { method: "GET", path: "/api/vendors" },
  { method: "GET", path: "/api/products" },
  { method: "POST", path: "/api/ai/recommend", body: {} },
];

let failed = false;

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, {
    method: check.method,
    headers: check.body ? { "content-type": "application/json" } : undefined,
    body: check.body ? JSON.stringify(check.body) : undefined,
  }).catch((error) => ({ ok: false, status: 0, error }));

  if (!response || !("ok" in response) || !response.ok) {
    failed = true;
    const status = response && "status" in response ? response.status : 0;
    console.error(`[FAIL] ${check.method} ${check.path} -> ${status}`);
    continue;
  }

  console.log(`[OK] ${check.method} ${check.path} -> ${response.status}`);
}

if (failed) {
  process.exitCode = 1;
}
