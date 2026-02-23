---
name: プロジェクトアーキテクチャ
description: モジュール・メニュー構造、コア/アドオン分離、新規メニュー追加手順。メニュー追加、モジュール作成、アーキテクチャ設計時に使用。
---

# プロジェクトアーキテクチャ

## 2層構造: モジュール定義とメニュー配置

```
apps/web/lib/modules/              ← ビジネスモジュール定義層
  ├── registry.tsx                 ← 全モジュール登録 + menuGroups定義
  ├── access-control.ts            ← アクセス制御ロジック
  └── {module}/module.tsx          ← 各モジュール定義

apps/web/app/(menus)/              ← メニューページ実装層
  ├── user/               ← menuGroup: user（全社員向け）
  ├── manager/            ← menuGroup: manager（管理職向け）
  ├── admin/              ← menuGroup: admin（システム管理者）
  ├── backoffice/         ← menuGroup: backoffice（バックオフィス業務）
  └── permission/         ← menuGroup: permission（権限ベース追加機能）
```

## 新しいメニュー追加手順

### Step 1: モジュール定義にメニューを追加

```typescript
// apps/web/lib/modules/hr-evaluation/module.tsx
export const hrEvaluationModule: AppModule = {
  id: "hrEvaluation",
  name: "HR Evaluation",
  nameJa: "人事評価",
  icon: <StarIcon />,
  menus: [
    {
      id: "performanceReview",
      moduleId: "hrEvaluation",
      name: "Performance Review",
      nameJa: "パフォーマンスレビュー",
      path: "/manager/performance-review",
      menuGroup: "manager",  // ← menuGroupを指定
      requiredRoles: ["MANAGER", "ADMIN"],
      enabled: true,
      order: 3,
    },
  ],
};
```

### Step 2: ページコンポーネントを作成

```bash
mkdir -p apps/web/app/(menus)/manager/performance-review
```

```typescript
// apps/web/app/(menus)/manager/performance-review/page.tsx
export default async function PerformanceReviewPage() {
  // ページの実装
}
```

## menuGroup一覧

| menuGroup ID | 表示名 | 用途 |
|-------------|--------|------|
| `user` | ユーザー | 全社員向け機能 |
| `manager` | マネージャー | 管理職向け機能 |
| `backoffice` | バックオフィス | バックオフィス業務 |
| `permission` | 追加機能 | 権限ベースの追加機能 |
| `admin` | 管理者 | システム管理者向け機能 |

## サービス定義（画面なしAPI）

モジュールには**メニュー**（画面あり）と**サービス**（画面なし）の2種類があります。

### サービスとは

- 画面（UI）を持たないAPI・ビジネスロジック
- 他のモジュールや機能から呼び出される
- サイドバーには表示されない
- 例: 承認経路取得、ワークフロー管理、通知送信

### サービス定義例

```typescript
// apps/web/lib/core-modules/organization/module.tsx
export const organizationModule: AppModule = {
  id: "organization",
  name: "Organization",
  nameJa: "組織管理",
  enabled: true,
  order: 2,
  menus: [
    // ... 画面ありのメニュー
  ],
  services: [
    {
      id: "approvalRoute",
      moduleId: "organization",
      name: "Approval Route",
      nameJa: "承認経路取得",
      description: "Get approval chain based on organization hierarchy",
      descriptionJa: "組織階層に基づく承認経路を取得します",
      apiEndpoints: ["/api/organization/approval-route"],
      enabled: true,
    },
    {
      id: "workflowService",
      moduleId: "organization",
      name: "Workflow Service",
      nameJa: "ワークフロー管理",
      description: "Create and manage approval requests",
      descriptionJa: "承認リクエストの作成・管理を行います",
      apiEndpoints: [
        "/api/workflow/requests",
        "/api/workflow/requests/[id]",
        "/api/workflow/requests/[id]/approve",
        "/api/workflow/requests/[id]/reject",
      ],
      enabled: true,
    },
  ],
};
```

### サービス追加手順

1. **モジュール定義にサービスを追加**
   - `services` 配列に `AppService` オブジェクトを追加

2. **APIエンドポイントを実装**
   - `apps/web/app/api/{service-path}/route.ts` を作成

3. **サービスロジックを実装**
   - `apps/web/lib/services/{service-name}.ts` にビジネスロジックを実装

### メニュー vs サービス 使い分け

| ケース | 選択 |
|--------|------|
| ユーザーが直接アクセスする画面 | メニュー |
| 他機能から呼び出されるAPI | サービス |
| サイドバーに表示したい | メニュー |
| バックグラウンド処理 | サービス |

## コンテナ依存関係

モジュールがDockerコンテナに依存する場合、`containers`プロパティで定義します。

### コンテナ依存定義例

```typescript
// apps/web/lib/addon-modules/openldap/module.tsx
export const openldapModule: AppModule = {
  id: "openldap",
  name: "OpenLDAP",
  nameJa: "OpenLDAP",
  enabled: true,
  menus: [...],
  containers: [
    {
      id: "openldap",
      name: "OpenLDAP Server",
      nameJa: "OpenLDAPサーバ",
      healthCheckUrl: "/api/admin/openldap/status",
      required: true,
      description: "LDAP authentication server container",
      descriptionJa: "LDAP認証サーバコンテナ",
    },
  ],
};
```

### ContainerDependency型

```typescript
interface ContainerDependency {
  id: string;           // コンテナID
  name: string;         // 表示名（英語）
  nameJa: string;       // 表示名（日本語）
  healthCheckUrl: string; // ヘルスチェックAPI
  required: boolean;    // 必須かどうか
  description?: string;
  descriptionJa?: string;
}
```

### ヘルスチェックAPI要件

`healthCheckUrl`で指定するAPIは以下のレスポンス形式を返す必要があります:

```typescript
// 成功時
{ "isAvailable": true, ... }

// 失敗時
{ "isAvailable": false, ... }
```

### UI表示

モジュール管理画面のカードに以下が表示されます:
- **稼働中**: 緑色インジケーター
- **停止中**: 黄色インジケーター + ⚠️（必須コンテナの場合）

## MCPサーバ定義（外部AI連携）

モジュールが外部の生成AI（Claude Desktop、Claude Code等）からアクセス可能なMCPサーバを提供する場合、`mcpServer`プロパティで定義します。

### MCPサーバとは

- **Model Context Protocol** に準拠したサーバ
- 外部の生成AIからモジュールのデータ・機能にアクセス可能にする
- stdio通信で動作（標準入出力）
- 読み取り専用アクセスを基本とする
- Webアプリとは独立したNode.jsプロセスとして実行

### ディレクトリ構造

```
mcp-servers/
└── {module-name}/
    ├── package.json           # 依存: @modelcontextprotocol/sdk
    ├── tsconfig.json
    ├── README.md              # 環境変数・設定方法
    └── src/
        ├── index.ts           # エントリポイント（Server起動）
        ├── tools.ts           # ツール定義（inputSchema）
        └── {client}.ts        # データアクセス層（DB/LDAP等）
```

### モジュール定義例

```typescript
// apps/web/lib/addon-modules/openldap/module.tsx
export const openldapModule: AppModule = {
  id: "openldap",
  menus: [...],
  mcpServer: {
    id: "openldap-mcp",
    name: "OpenLDAP MCP Server",
    nameJa: "OpenLDAP MCPサーバ",
    description: "Provides read-only access to LDAP user information for external AI",
    descriptionJa: "外部AIからLDAPユーザ情報への読み取り専用アクセスを提供",
    path: "mcp-servers/openldap",
    toolCount: 5,
    readOnly: true,
    tools: [
      { name: "ldap_check_status", descriptionJa: "サーバ接続状態を確認" },
      { name: "ldap_list_users", descriptionJa: "ユーザ一覧を取得" },
      { name: "ldap_get_user", descriptionJa: "ユーザ詳細を取得" },
      { name: "ldap_search_users", descriptionJa: "ユーザを検索" },
      { name: "ldap_user_exists", descriptionJa: "ユーザ存在確認" },
    ],
  },
};
```

### MCPサーバ実装パターン

#### エントリポイント（index.ts）

```typescript
#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { tools } from "./tools.js";

class MyMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      { name: "my-mcp-server", version: "1.0.0" },
      { capabilities: { tools: {} } },
    );
    this.setupHandlers();
  }

  private setupHandlers(): void {
    // ツール一覧
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools,
    }));

    // ツール実行
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      try {
        switch (name) {
          case "my_tool":
            return await this.handleMyTool(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [{
            type: "text" as const,
            text: JSON.stringify({ success: false, error: String(error) }, null, 2),
          }],
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("MCP Server running on stdio");
  }
}

new MyMcpServer().run().catch(console.error);
```

#### ツール定義（tools.ts）

```typescript
import type { Tool } from "@modelcontextprotocol/sdk/types.js";

export const tools: Tool[] = [
  {
    name: "my_list_items",
    description: "アイテム一覧を取得します。ページネーション対応。",
    inputSchema: {
      type: "object" as const,
      properties: {
        limit: { type: "number", description: "最大件数（デフォルト: 100）" },
        offset: { type: "number", description: "スキップ件数（デフォルト: 0）" },
      },
      required: [],
    },
  },
  {
    name: "my_get_item",
    description: "指定IDのアイテム詳細を取得します。",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: { type: "string", description: "アイテムID" },
      },
      required: ["id"],
    },
  },
];
```

#### レスポンス形式

```typescript
// 成功時
return {
  content: [{
    type: "text" as const,
    text: JSON.stringify({ success: true, data: result }, null, 2),
  }],
};

// エラー時
return {
  content: [{
    type: "text" as const,
    text: JSON.stringify({ success: false, error: errorMessage }, null, 2),
  }],
};
```

### package.json

```json
{
  "name": "@lion-frame/mcp-{module}",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^22",
    "typescript": "^5"
  }
}
```

### クライアント設定

#### Claude Desktop（claude_desktop_config.json）

```json
{
  "mcpServers": {
    "my-module": {
      "command": "node",
      "args": ["mcp-servers/{module}/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

#### Claude Code（.mcp.json）

```json
{
  "mcpServers": {
    "my-module": {
      "command": "node",
      "args": ["mcp-servers/{module}/dist/index.js"],
      "env": {
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

### MCPサーバ追加手順

1. **`mcp-servers/{module}/` ディレクトリを作成**
2. **`package.json`、`tsconfig.json` を作成**（上記テンプレート参照）
3. **`src/tools.ts`** にツール定義を記述
4. **`src/{client}.ts`** にデータアクセス層を実装（環境変数から設定を読み込み）
5. **`src/index.ts`** にサーバ本体を実装（ツール実行のswitch/case）
6. **モジュール定義に `mcpServer` を追加**（`apps/web/lib/{core,addon}-modules/{module}/module.tsx`）
7. **`README.md`** に環境変数と設定方法を記載

### ツール命名規則

```
{module}_{action}

例:
  ldap_check_status      # OpenLDAP: 状態確認
  ldap_list_users        # OpenLDAP: ユーザ一覧
  org_get_structure      # Organization: 組織階層取得
  org_search_employees   # Organization: 社員検索
```

### 設計原則

| 原則 | 説明 |
|------|------|
| **読み取り専用** | 基本的にデータの取得・検索のみ。書き込みは慎重に |
| **環境変数で設定** | DB接続先、認証情報は環境変数から読み込み |
| **エラーハンドリング** | 全ツールでtry/catchし、`{ success: false, error }` 形式で返す |
| **ページネーション** | 一覧取得には `limit`/`offset` パラメータを提供 |
| **独立プロセス** | Webアプリとは別プロセスで動作、直接importしない |

### UI表示

モジュール管理画面に以下が表示されます:
- MCPサーバ名、ツール数バッジ、読み取り専用バッジ
- 折りたたみ可能なツール一覧（ツール名 + 説明）
- サーバパス

## コア/アドオンモジュール分離

```
apps/web/lib/
├── core-modules/        # コアモジュール（常に有効）
│   ├── organization/    # 組織管理
│   ├── system/          # システム設定
│   └── schedule/        # スケジュール管理
└── addon-modules/       # アドオンモジュール（選択的に有効化）
    ├── hr-evaluation/   # 人事評価
    ├── backoffice/      # バックオフィス
    └── business-intelligence/  # BI
```

### モジュール有効化/無効化

```env
# .env
NEXT_PUBLIC_ENABLE_HR_EVALUATION=true
NEXT_PUBLIC_ENABLE_BACKOFFICE=false
NEXT_PUBLIC_ENABLE_BI=false
```

## フレームヘッダー設定

### ページタイトルの表示

フレームヘッダーには**メニュー名（ページタイトル）**を表示する。説明文は表示しない。

```typescript
// apps/web/lib/i18n/page-titles.ts にページタイトルを追加
export const pageTitles = {
  en: {
    "/backoffice/ticket-sales": "Internal Ticket Sales",
    // ...
  },
  ja: {
    "/backoffice/ticket-sales": "社内チケット販売",
    // ...
  },
};

// ページ説明（情報モーダル用）も同様に追加
export const pageDescriptions = {
  en: {
    "/backoffice/ticket-sales": "Manage internal ticket sales, customers, and products",
  },
  ja: {
    "/backoffice/ticket-sales": "社内チケット販売、顧客、商品を管理します",
  },
};
```

### サブタブをフレームヘッダーに追加

メニュー内のタブ切り替えは**フレームヘッダー内**にサブタブとして表示する。コンテンツ領域にタブを置かない。

```typescript
// apps/web/components/Header.tsx に追加

// 1. ページ判定を追加
const isTicketSales = pathname === "/backoffice/ticket-sales";

// 2. タブ定義を追加（URLパラメータで制御）
const ticketSalesTab = searchParams.get("tab") || "customers";
const ticketSalesTabs = [
  {
    name: language === "ja" ? "顧客管理" : "Customers",
    icon: <FaUsers className="w-5 h-5" />,
    path: "/backoffice/ticket-sales?tab=customers",
    active: ticketSalesTab === "customers",
  },
  {
    name: language === "ja" ? "商品管理" : "Products",
    icon: <FaStickyNote className="w-5 h-5" />,
    path: "/backoffice/ticket-sales?tab=products",
    active: ticketSalesTab === "products",
  },
  {
    name: language === "ja" ? "販売記録" : "Sales",
    icon: <FaChartLine className="w-5 h-5" />,
    path: "/backoffice/ticket-sales?tab=sales",
    active: ticketSalesTab === "sales",
  },
];

// 3. JSXにタブナビゲーションを追加
{isTicketSales && (
  <div className="border-t border-gray-700 bg-gray-600">
    <nav className="flex gap-1 px-6" aria-label="Ticket Sales Tabs">
      {ticketSalesTabs.map((tab) => (
        <Link
          key={tab.path}
          href={tab.path}
          className={`
            flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors
            ${tab.active
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-white hover:text-gray-200 hover:border-gray-600"
            }
          `}
        >
          {tab.icon}
          {tab.name}
        </Link>
      ))}
    </nav>
  </div>
)}
```

### クライアントコンポーネントでのタブ切り替え

```typescript
// タブはURLパラメータで制御
"use client";

import { useSearchParams } from "next/navigation";

export default function PageClient({ language }: { language: "en" | "ja" }) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "default";

  return (
    <div className="pt-12">  {/* ヘッダータブ分の余白 */}
      {activeTab === "tab1" && <Tab1Component language={language} />}
      {activeTab === "tab2" && <Tab2Component language={language} />}
    </div>
  );
}
```

**重要**: ヘッダーにサブタブがある場合、コンテンツに `pt-12` の余白が必要。

### ❌ 避けるパターン

```tsx
// コンテンツ領域に説明文を表示しない
<div>
  <p className="text-gray-600">{t.description}</p>  // ← 不要
</div>

// コンテンツ領域にタブナビゲーションを置かない
<div className="border-b border-gray-200">
  <nav className="-mb-px flex space-x-8">  // ← フレームヘッダーに移動
    {tabs.map((tab) => ...)}
  </nav>
</div>
```

## ベストプラクティス

### ✅ 推奨

```typescript
// menuGroupとURLパスの一致
path: "/manager/hr-evaluation"
menuGroup: "manager"
```

### ❌ 避ける

```typescript
// URLとmenuGroupの不一致
path: "/admin/dashboard"
menuGroup: "user"  // NG
```
