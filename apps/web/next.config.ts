import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

// Read build ID generated during Docker build (used for session invalidation on redeploy)
let buildId = "dev";
try {
  buildId = readFileSync("build-id", "utf-8").trim();
} catch {
  // File doesn't exist in development - use "dev" as default
}

const nextConfig: NextConfig = {
  // 外部アドオンパッケージのTypeScriptをトランスパイル
  transpilePackages: [
    "@lionframe/module-types",
  ],
  env: {
    NEXT_BUILD_ID: buildId,
  },
  // Docker用のstandaloneビルド出力
  output: "standalone",

  // セキュリティヘッダー
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "geolocation=(), microphone=(), camera=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      {
        // チュートリアルPDF: 同一オリジンのiframe表示を許可
        source: "/uploads/tutorials/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },

  outputFileTracingRoot: path.join(__dirname, "../../"),
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
  // リライト設定
  async rewrites() {
    const ragBackendUrl =
      process.env.RAG_BACKEND_URL || "http://localhost:8000";

    return [
      // /uploads/profiles/* を /api/uploads/profiles/* にリライト
      {
        source: "/uploads/profiles/:path*",
        destination: "/api/uploads/profiles/:path*",
      },
      // RAG Backend APIプロキシ
      {
        source: "/api/rag-backend/:path*",
        destination: `${ragBackendUrl}/api/:path*`,
      },
      // RAG Backend ヘルスチェック
      {
        source: "/api/rag-backend-health",
        destination: `${ragBackendUrl}/health`,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    config.externals.push("@node-rs/argon2", "@node-rs/bcrypt");

    // Docker開発環境でのホットリロード対応
    if (process.env.NODE_ENV === "development" && !isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    return config;
  },
};

export default nextConfig;
