const ICON = "/lethelaicon.svg?v=official-20260904";

// Take control of open pages as soon as a new worker version ships.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Lethela";
  const options = {
    body: payload.body || "There is a new update waiting for you.",
    icon: ICON,
    badge: ICON,
    data: { url: payload.url || "/" },
    tag: payload.tag || "lethela-update",
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const targetUrl = new URL(target, self.location.origin);
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Reuse an open tab on the same origin instead of stacking new ones.
      for (const client of windows) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === targetUrl.origin && "focus" in client) {
          await client.focus();
          if (client.url !== targetUrl.href && "navigate" in client) {
            await client.navigate(targetUrl.href).catch(() => {});
          }
          return;
        }
      }
      await self.clients.openWindow(targetUrl.href);
    })(),
  );
});

// When the browser rotates the push subscription, the old endpoint stops
// working. Re-subscribe and hand the fresh subscription back to the server so
// delivery is not silently lost.
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      try {
        let subscription = event.newSubscription;
        if (!subscription) {
          const res = await fetch("/api/push/vapid", { cache: "no-store" });
          const { publicKey } = await res.json();
          if (!publicKey) return;
          subscription = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ subscription }),
        });
      } catch {
        // Nothing to do — the next successful subscribe will resync.
      }
    })(),
  );
});

function urlBase64ToUint8Array(value) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const normalized = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(normalized);
  return Uint8Array.from(decoded, (char) => char.charCodeAt(0));
}
