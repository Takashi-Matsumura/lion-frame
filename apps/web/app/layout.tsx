import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { appConfig } from "@/lib/config/app";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `${appConfig.name} - %s`,
  },
  description: appConfig.description,
};

/**
 * ルートレイアウト（最小限）
 *
 * html/body/フォントのみ提供。アプリシェル（認証・サイドバー・ヘッダー）は
 * (main) ルートグループのレイアウトで提供する。
 * これにより、キオスク画面は独立したレイアウトで動作し、HMRも正常に機能する。
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
