import Pusher from "pusher";

let cachedPusher: Pusher | null | undefined;

function getPusherServer() {
  if (cachedPusher !== undefined) return cachedPusher;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || "mt1";

  if (!appId || !key || !secret) {
    cachedPusher = null;
    return cachedPusher;
  }

  cachedPusher = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });

  return cachedPusher;
}

export const pusherServer = {
  async trigger(channel: string, event: string, data: unknown) {
    const client = getPusherServer();
    if (!client) return;
    await client.trigger(channel, event, data);
  },
};
