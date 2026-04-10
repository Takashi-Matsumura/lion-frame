// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpush = require("web-push") as typeof import("web-push");

export type PushSubscriptionData = {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
};

let initialized = false;

function ensureInitialized() {
  if (initialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (publicKey && privateKey) {
    webpush.setVapidDetails(
      "mailto:admin@lionframe.local",
      publicKey.trim().replace(/=+$/, ""),
      privateKey.trim().replace(/=+$/, ""),
    );
    initialized = true;
  }
}

export function getWebPush() {
  ensureInitialized();
  return webpush;
}
