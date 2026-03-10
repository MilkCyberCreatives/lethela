// /src/lib/pusher-client.ts
import Pusher from "pusher-js";

let pusherClient: Pusher | null = null;

export function getPusherClient() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "mt1";
  if (!key) return null;

  if (!pusherClient) {
    pusherClient = new Pusher(key, {
      cluster,
      forceTLS: true,
    });
  }

  return pusherClient;
}
