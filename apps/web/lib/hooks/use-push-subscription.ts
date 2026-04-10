"use client";

import { useCallback, useEffect, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface UsePushSubscriptionReturn {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  permission: NotificationPermission | "unsupported";
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

export function usePushSubscription(): UsePushSubscriptionReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const [registration, setRegistration] =
    useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);

      navigator.serviceWorker.register("/sw.js").then((reg) => {
        setRegistration(reg);
        reg.pushManager.getSubscription().then((sub) => {
          setIsSubscribed(!!sub);
        });
      });
    }
  }, []);

  const subscribe = useCallback(async () => {
    setIsLoading(true);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        throw new Error(
          "VAPID public key not configured. Check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env and restart the dev server.",
        );
      }

      // 先に通知権限を明示的にリクエスト（Chromeでsubscribe前に必要）
      const currentPermission = await Notification.requestPermission();
      setPermission(currentPermission);
      if (currentPermission !== "granted") {
        throw new Error(
          `Notification permission was not granted: ${currentPermission}`,
        );
      }

      // Service Workerがactiveになるのを待つ
      const activeRegistration = await navigator.serviceWorker.ready;

      const subscription = await activeRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription }),
      });

      if (!res.ok) {
        throw new Error(`Subscribe API failed: ${res.status}`);
      }

      setIsSubscribed(true);
    } catch (error) {
      console.error("[usePushSubscription] Subscribe failed:", error);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.error(
            "AbortError の主な原因:\n" +
              "1. macOSのシステム設定 > 通知 > ブラウザ(Chrome/Safari) が「オフ」または通知を許可していない\n" +
              "2. ブラウザのサイト設定で localhost の通知が「ブロック」になっている\n" +
              "3. ネットワークがプッシュサービス(FCM等)をブロックしている",
          );
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!registration) return;
    setIsLoading(true);
    try {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      setIsSubscribed(false);
    } catch (error) {
      console.error("Push unsubscribe failed:", error);
    } finally {
      setIsLoading(false);
    }
  }, [registration]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}
