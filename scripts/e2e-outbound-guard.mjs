// Loaded with NODE_OPTIONS="--import ./scripts/e2e-outbound-guard.mjs" into the LOCAL e2e server only.
// Sends Resend (email) and Twilio (WhatsApp) calls to the local catcher instead of the real
// services, and refuses every other request that leaves this machine, so a test run can never
// email, message or call a real service.
const catcher = (process.env.E2E_CATCHER_URL || "http://127.0.0.1:3199").replace(/\/+$/, "");
const realFetch = globalThis.fetch;
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|::1)$/i;

function toUrl(input) {
  if (typeof input === "string") return new URL(input);
  if (input instanceof URL) return input;
  return new URL(input.url);
}

globalThis.fetch = async function guardedFetch(input, init) {
  let url;
  try {
    url = toUrl(input);
  } catch {
    return realFetch(input, init);
  }
  if (LOCAL.test(url.hostname)) return realFetch(input, init);
  const service =
    url.hostname === "api.resend.com"
      ? "resend"
      : url.hostname === "api.twilio.com"
        ? "twilio"
        : null;
  let body = init?.body ?? null;
  if (body == null && typeof input === "object" && !(input instanceof URL) && input.body) {
    body = await input
      .clone()
      .text()
      .catch(() => null);
  }
  if (body != null && typeof body !== "string") body = String(body);
  const record = {
    service: service || "blocked",
    url: url.toString(),
    method: init?.method || "GET",
    body,
  };
  await realFetch(`${catcher}/capture`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(record),
  }).catch(() => {});
  if (service === "resend") {
    return new Response(JSON.stringify({ id: `e2e-${Date.now()}` }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  if (service === "twilio") {
    return new Response(JSON.stringify({ sid: `SM${Date.now()}` }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }
  // Every other outside host (maps, AI, analytics...) is refused, like an offline network.
  throw new TypeError(`e2e outbound guard blocked ${url.hostname}`);
};

realFetch(`${catcher}/guard-loaded`, { method: "POST", body: String(process.pid) }).catch(() => {});
