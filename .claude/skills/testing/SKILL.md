---
name: テスト戦略
description: Jest 30によるAPI契約テスト、アクセス制御テスト、TDDワークフロー。テスト作成、テスト設計、品質改善時に使用。
---

# テスト戦略ガイド

## テスト方針

| 対象 | 方針 | 理由 |
|------|------|------|
| バックエンドAPI | 厳密にテスト | 外部モジュールが依存する契約 |
| アクセス制御 | 厳密にテスト | セキュリティリスク |
| サービス層 | 中程度にテスト | ビジネスロジックの正確性 |
| フロントエンド | 手動確認中心 | 柔軟な変更に対応 |

## テスト構成

```
__tests__/
├── api/                    # APIルートテスト
│   └── ai/
│       ├── services/
│       │   ├── generate.test.ts
│       │   ├── summarize.test.ts
│       │   └── extract.test.ts
│       └── translate.test.ts
└── lib/
    ├── modules/
    │   └── access-control.test.ts
    └── core-modules/
        └── ai/
            └── ai-service.test.ts

jest.config.ts              # Jest設定
jest.setup.ts               # グローバルモック
```

## モック戦略

| 依存 | モック方法 | 理由 |
|------|-----------|------|
| Prisma | `jest.mock("@/lib/prisma")` | DB不要でテスト実行 |
| 外部API | `global.fetch = jest.fn()` | ネットワーク不要 |
| 認証 | `jest.mock("@/auth")` | セッション制御 |
| 環境変数 | `process.env` 直接設定 | テスト条件制御 |

### Prismaモック

```typescript
// jest.setup.ts
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    // 必要なモデルを追加
  },
}));

// テスト内
import { prisma } from "@/lib/prisma";
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

mockPrisma.user.findMany.mockResolvedValue([
  { id: "1", name: "Test User", role: "USER" },
]);
```

### 認証モック

```typescript
jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

import { auth } from "@/auth";
const mockAuth = auth as jest.MockedFunction<typeof auth>;

// 認証済みセッション
mockAuth.mockResolvedValue({
  user: { id: "user-1", name: "Test", role: "ADMIN" },
  expires: new Date(Date.now() + 86400000).toISOString(),
});

// 未認証
mockAuth.mockResolvedValue(null);
```

### fetchモック

```typescript
const mockFetch = jest.fn();
global.fetch = mockFetch;

mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({ result: "success" }),
});
```

## TDDワークフロー

### Red-Green-Refactorサイクル

```
1. Red:    失敗するテストを書く
2. Green:  テストを通す最小限の実装
3. Refactor: コードを改善（テストは通したまま）
```

### 実践例: 新しいAPIエンドポイント

#### Step 1: Red（テストを先に書く）

```typescript
// __tests__/api/mymodule/route.test.ts
import { GET, POST } from "@/app/api/mymodule/route";

describe("GET /api/mymodule", () => {
  it("認証済みユーザにデータを返す", async () => {
    mockAuth.mockResolvedValue({
      user: { id: "1", name: "Test", role: "USER" },
      expires: "2099-01-01",
    });

    mockPrisma.myTable.findMany.mockResolvedValue([
      { id: "1", name: "Item 1" },
    ]);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveLength(1);
  });

  it("未認証ユーザに401を返す", async () => {
    mockAuth.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
  });
});
```

#### Step 2: Green（最小限の実装）

```typescript
// app/api/mymodule/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await prisma.myTable.findMany();
  return NextResponse.json(data);
}
```

#### Step 3: Refactor（改善）

テストが通ることを確認しながら、エラーハンドリングやバリデーションを追加。

## テストパターン

### APIルートテスト

```typescript
describe("POST /api/mymodule", () => {
  // 正常系
  it("有効なデータで作成できる", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    mockPrisma.myTable.create.mockResolvedValue({ id: "new-1", name: "New" });

    const request = new Request("http://localhost/api/mymodule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Item" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
  });

  // 認証エラー
  it("未認証で401を返す", async () => {
    mockAuth.mockResolvedValue(null);
    const request = new Request("http://localhost/api/mymodule", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  // 権限エラー
  it("USER権限で403を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "USER" } });
    const request = new Request("http://localhost/api/mymodule", {
      method: "POST",
      body: JSON.stringify({ name: "Test" }),
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
  });

  // バリデーションエラー
  it("不正なデータで400を返す", async () => {
    mockAuth.mockResolvedValue({ user: { id: "1", role: "ADMIN" } });
    const request = new Request("http://localhost/api/mymodule", {
      method: "POST",
      body: JSON.stringify({}), // nameが欠落
    });
    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### アクセス制御テスト

```typescript
import { canAccessMenu, canAccessModule } from "@/lib/modules/access-control";

describe("アクセス制御", () => {
  it("USERはuserメニューにアクセスできる", () => {
    expect(canAccessMenu("USER", { menuGroup: "user", requiredRoles: ["USER"] })).toBe(true);
  });

  it("USERはadminメニューにアクセスできない", () => {
    expect(canAccessMenu("USER", { menuGroup: "admin", requiredRoles: ["ADMIN"] })).toBe(false);
  });

  it("ADMINは全メニューにアクセスできる", () => {
    expect(canAccessMenu("ADMIN", { menuGroup: "admin", requiredRoles: ["ADMIN"] })).toBe(true);
    expect(canAccessMenu("ADMIN", { menuGroup: "user", requiredRoles: ["USER"] })).toBe(true);
  });
});
```

### サービス層テスト

```typescript
describe("AIService", () => {
  it("翻訳リクエストを処理できる", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Hello" } }],
      }),
    });

    const result = await AIService.translate({
      text: "こんにちは",
      sourceLanguage: "ja",
      targetLanguage: "en",
    });

    expect(result.translatedText).toBe("Hello");
  });

  it("APIエラー時に適切なエラーを返す", async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });

    await expect(
      AIService.translate({ text: "test", sourceLanguage: "ja", targetLanguage: "en" })
    ).rejects.toThrow();
  });
});
```

## テスト実行コマンド

```bash
# 全テスト実行
npm run test

# カバレッジ付き
npm run test:coverage

# 特定パターンのテスト
npm run test -- --testPathPatterns="access-control"
npm run test -- --testPathPatterns="api/ai"

# ウォッチモード（開発中）
npm run test -- --watch

# 単一ファイル
npm run test -- __tests__/lib/modules/access-control.test.ts
```

## テスト追加の判断基準

| 変更内容 | テスト追加 | 理由 |
|---------|-----------|------|
| 新しいAPIエンドポイント | 必須 | 契約テスト |
| アクセス制御の変更 | 必須 | セキュリティ |
| サービス層のロジック追加 | 推奨 | ビジネスロジックの正確性 |
| UIコンポーネント | 任意 | 手動確認で十分な場合が多い |
| 翻訳ファイル追加 | 不要 | 静的定義のみ |

## チェックリスト

テスト作成時:

- [ ] テストファイルは `__tests__/` 配下に配置
- [ ] 正常系・異常系（認証エラー、権限エラー、バリデーションエラー）を網羅
- [ ] モックが適切に設定されているか
- [ ] テストが独立している（他のテストに依存しない）
- [ ] `npm run test` が全てパスするか
- [ ] 不要なconsole.logがテストに含まれていないか
