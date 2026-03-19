import webpush from "web-push";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

type PushSubscriptionRecord = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

let configured = false;

function getPushConfig() {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ||
    "";
  const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim() || "";
  const subject = process.env.WEB_PUSH_SUBJECT?.trim() || "mailto:support@lethela.com";

  return { publicKey, privateKey, subject };
}

export function hasWebPushConfig() {
  const { publicKey, privateKey } = getPushConfig();
  return Boolean(publicKey && privateKey);
}

function configureWebPush() {
  if (configured) return;
  const { publicKey, privateKey, subject } = getPushConfig();
  if (!publicKey || !privateKey) {
    throw new Error("Web push VAPID keys are not configured.");
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export async function sendPushToSubscription(subscription: PushSubscriptionRecord, payload: PushPayload) {
  configureWebPush();
  return webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload)
  );
}
