self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "Lethela";
  const options = {
    body: payload.body || "There is a new update waiting for you.",
    icon: "/favicon.svg",
    badge: "/favicon.svg",
    data: {
      url: payload.url || "/",
    },
    tag: payload.tag || "lethela-update",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(clients.openWindow(url));
});
