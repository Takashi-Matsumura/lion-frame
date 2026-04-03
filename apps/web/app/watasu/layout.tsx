/**
 * Watasu 送信者レイアウト
 *
 * 認証不要、サイドバーなし、モバイル最適化のミニマルレイアウト。
 */

import type { ReactNode } from "react";

export const metadata = {
  title: "Mobile Transfer",
};

export const dynamic = "force-dynamic";

export default function WatasuSenderLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased flex flex-col">
      {children}
    </div>
  );
}
