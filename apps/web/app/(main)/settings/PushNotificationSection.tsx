"use client";

import { BellOff, BellRing, ChevronDown, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/lib/hooks/use-push-subscription";

interface PushNotificationTranslations {
  title: string;
  description: string;
  subscribed: string;
  notSubscribed: string;
  subscribe: string;
  unsubscribe: string;
  notSupported: string;
  permissionDenied: string;
  success: string;
  unsubscribeSuccess: string;
  error: string;
  sendTest: string;
  testSent: string;
  testError: string;
  browserGuide: {
    toggleLabel: string;
    commonNote: string;
    macos: {
      title: string;
      systemNote: string;
      chrome: string;
      safari: string;
      edge: string;
      firefox: string;
    };
    windows: {
      title: string;
      systemNote: string;
      chrome: string;
      edge: string;
      firefox: string;
    };
  };
}

interface PushNotificationSectionProps {
  translations: PushNotificationTranslations;
}

export function PushNotificationSection({
  translations: t,
}: PushNotificationSectionProps) {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  } = usePushSubscription();
  const [isSending, setIsSending] = useState(false);

  const sendTestNotification = async () => {
    setIsSending(true);
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      if (!res.ok) throw new Error("Failed");
      toast.success(t.testSent);
    } catch (error) {
      console.error("Test notification failed:", error);
      toast.error(t.testError);
    } finally {
      setIsSending(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium">{t.title}</h3>
            <p className="text-sm text-muted-foreground">{t.description}</p>
          </div>
        </div>
        <Alert>
          <BellOff className="h-4 w-4" />
          <AlertDescription>{t.notSupported}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t.title}</h3>
          <p className="text-sm text-muted-foreground">{t.description}</p>
        </div>
        <Badge variant={isSubscribed ? "default" : "secondary"}>
          {isSubscribed ? t.subscribed : t.notSubscribed}
        </Badge>
      </div>

      {permission === "denied" && (
        <Alert>
          <BellOff className="h-4 w-4" />
          <AlertDescription>{t.permissionDenied}</AlertDescription>
        </Alert>
      )}

      {isSubscribed ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={sendTestNotification}
            disabled={isSending}
          >
            <Send className="h-4 w-4 mr-2" />
            {t.sendTest}
          </Button>
          <Button
            variant="outline"
            onClick={unsubscribe}
            disabled={isLoading}
          >
            <BellOff className="h-4 w-4 mr-2" />
            {t.unsubscribe}
          </Button>
        </div>
      ) : (
        <Button
          onClick={subscribe}
          disabled={isLoading || permission === "denied"}
        >
          <BellRing className="h-4 w-4 mr-2" />
          {t.subscribe}
        </Button>
      )}

      {/* OS・ブラウザごとの設定ガイド（折り畳み） */}
      <details className="group rounded-md border border-border">
        <summary className="flex cursor-pointer items-center justify-between px-4 py-2 text-sm font-medium hover:bg-muted/50 list-none [&::-webkit-details-marker]:hidden">
          <span>{t.browserGuide.toggleLabel}</span>
          <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="border-t border-border px-4 py-3 space-y-4 text-sm">
          <p className="text-muted-foreground">
            {t.browserGuide.commonNote}
          </p>

          <div className="space-y-2">
            <h4 className="font-semibold">{t.browserGuide.macos.title}</h4>
            <p className="text-xs text-muted-foreground">
              {t.browserGuide.macos.systemNote}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              <li>{t.browserGuide.macos.chrome}</li>
              <li>{t.browserGuide.macos.safari}</li>
              <li>{t.browserGuide.macos.edge}</li>
              <li>{t.browserGuide.macos.firefox}</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold">{t.browserGuide.windows.title}</h4>
            <p className="text-xs text-muted-foreground">
              {t.browserGuide.windows.systemNote}
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs">
              <li>{t.browserGuide.windows.chrome}</li>
              <li>{t.browserGuide.windows.edge}</li>
              <li>{t.browserGuide.windows.firefox}</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
}
