/**
 * キオスクレイアウト
 *
 * ダークテーマ、フルスクリーン、NextAuth/サイドバーなし。
 * 独立したキオスクアプリケーション用レイアウト。
 */

import type { ReactNode } from "react";

export const metadata = {
  title: "Kiosk - LionFrame",
};

export default function KioskLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-gray-950 text-white min-h-screen antialiased">
      {children}
    </div>
  );
}
