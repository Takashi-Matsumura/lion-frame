# アドオンモジュール作成ガイド

派生プロジェクトでLionFrameに業務機能を追加する手順です。
サンプルとして同梱されている**ワークフロー（申請・承認）モジュール**を例に説明します。

> コアモジュールの仕組みやモジュールシステム全般については [MODULE_GUIDE.md](MODULE_GUIDE.md) を参照してください。

---

## コアモジュール vs アドオンモジュール

| 項目 | コアモジュール | アドオンモジュール |
|------|-------------|-----------------|
| 配置先 | `lib/core-modules/` | `lib/addon-modules/` |
| 用途 | フレーム同梱の基盤機能 | 派生プロジェクト固有の業務機能 |
| 依存 | `dependencies: []` | `dependencies: ["system"]` 等 |
| 管理画面表示 | 「Core」バッジ | 「Addon」バッジ（紫色） |
| 編集方針 | 派生プロジェクトでは編集禁止 | 自由に追加・変更可 |

`dependencies` に1つ以上のモジュールを指定すると、管理画面で自動的にAddon扱いになります。

---

## サンプルモジュール: ワークフロー

同梱のワークフローモジュールは、UIモックのみの最小構成です。
DB・API実装は含まず、アドオン追加のパターンを示すことが目的です。

### ファイル構成

```
lib/addon-modules/workflow/
├── module.tsx          # モジュール定義（メニュー2件 + サービス2件）
└── index.ts            # re-export

app/(menus)/(user)/workflow/
├── page.tsx            # 申請ページ（Server Component）
├── WorkflowClient.tsx  # 申請UI（Client Component）
└── translations.ts     # 翻訳（en/ja）

app/(menus)/(manager)/workflow-approvals/
├── page.tsx            # 承認ページ（Server Component）
├── WorkflowApprovalsClient.tsx  # 承認UI（Client Component）
└── translations.ts     # 翻訳（en/ja）
```

### メニュー配置

| メニュー | サイドバーセクション | パス | 対象ロール |
|---------|-------------------|------|-----------|
| 申請 | ユーザ | `/workflow` | USER, MANAGER, EXECUTIVE, ADMIN |
| 承認 | マネージャー | `/workflow-approvals` | MANAGER, EXECUTIVE, ADMIN |

### 動作確認

1. サイドバーの「ユーザ」セクションに **申請** が表示される
2. サイドバーの「マネージャー」セクションに **承認** が表示される
3. `/admin?tab=modules` で紫色の **Addon** バッジ付きで表示される
4. モジュール管理でトグルを無効にすると、両メニューがサイドバーから消える

---

## ステップバイステップ: 新しいアドオンを作る

ワークフローモジュールをテンプレートに、独自のアドオンを作成する手順です。

### Step 1. モジュール定義

`lib/addon-modules/<module-name>/module.tsx` を作成します。

```typescript
import { getMenuIcon, getModuleIcon } from "@/lib/modules/icons";
import type { AppModule } from "@/types/module";

export const myAddonModule: AppModule = {
  id: "myaddon",
  name: "My Addon",
  nameJa: "マイアドオン",
  description: "Description in English",
  descriptionJa: "日本語の説明",
  icon: getModuleIcon("myaddon"),     // icons.tsx にアイコン追加が必要
  enabled: true,
  order: 30,                           // 表示順（既存モジュールと重複しない値）
  dependencies: ["system"],            // → Addonバッジの判定条件

  menus: [
    {
      id: "myMenu",
      moduleId: "myaddon",            // ← module.id と一致させる
      name: "My Menu",
      nameJa: "マイメニュー",
      path: "/mymenu",
      menuGroup: "user",              // ← URLパスのグループと一致させる
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 25,
      icon: getMenuIcon("myMenu", "myaddon"),
      description: "Menu description",
      descriptionJa: "メニューの説明",
      isImplemented: true,
    },
  ],

  // API宣言（実装は別途 app/api/ に作成）
  services: [
    {
      id: "myService",
      moduleId: "myaddon",
      name: "My Service",
      nameJa: "マイサービス",
      apiEndpoints: ["/api/myaddon"],
      enabled: true,
    },
  ],
};
```

**重要ルール:**
- `menuGroup` と URLパスのグループは一致させる（`"user"` → `app/(menus)/(user)/`）
- `moduleId` はすべてのメニュー・サービスで `module.id` と同じ値にする
- `dependencies` に何か指定するとAddon扱いになる

### Step 2. index.ts

```typescript
export { myAddonModule } from "./module";
```

### Step 3. レジストリに登録

`lib/modules/registry.tsx` を編集します。

```typescript
// アドオンモジュール
import { workflowModule } from "@/lib/addon-modules/workflow";
import { myAddonModule } from "@/lib/addon-modules/myaddon";  // ← 追加

export const moduleRegistry: ModuleRegistry = {
  // コアモジュール
  ai: aiModule,
  system: systemModule,
  organization: organizationModule,
  schedule: scheduleModule,
  // アドオンモジュール
  workflow: workflowModule,
  myaddon: myAddonModule,  // ← 追加
};
```

### Step 4. アイコンを追加

`lib/modules/icons.tsx` の `iconPaths` にSVGパスを追加します。

```typescript
export const iconPaths = {
  // ...既存アイコン

  // モジュールアイコン
  myaddon: "M12 6.253v13m0-13C10.832 ...",  // Heroicons等のSVGパス

  // メニュー固有アイコン（省略するとモジュールアイコンにフォールバック）
  myMenu: "M9 5H7a2 2 0 ...",
};
```

[Heroicons](https://heroicons.com/) でアイコンを選び、`<path d="...">` の `d` 属性値を使います。

### Step 5. ページを作成

`menuGroup` に対応するディレクトリにページを配置します。

| menuGroup | ページ配置先 |
|-----------|------------|
| `user` | `app/(menus)/(user)/<path>/` |
| `manager` | `app/(menus)/(manager)/<path>/` |
| `admin` | `app/(menus)/(admin)/<path>/` |

#### Server Component（page.tsx）

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { MyMenuClient } from "./MyMenuClient";
import { myMenuTranslations, type Language } from "./translations";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getLanguage();
  const t = myMenuTranslations[language];
  return { title: t.title };
}

export default async function MyMenuPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const language = (await getLanguage()) as Language;
  return <MyMenuClient language={language} />;
}
```

#### Client Component（MyMenuClient.tsx）

```typescript
"use client";

import { useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { myMenuTranslations, type Language } from "./translations";

interface MyMenuClientProps {
  language: Language;
}

export function MyMenuClient({ language }: MyMenuClientProps) {
  const t = myMenuTranslations[language];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{t.description}</p>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 翻訳ファイル（translations.ts）

```typescript
export const myMenuTranslations = {
  en: {
    title: "My Menu",
    description: "This is my addon page.",
  },
  ja: {
    title: "マイメニュー",
    description: "アドオンページです。",
  },
} as const;

export type Language = keyof typeof myMenuTranslations;
```

### Step 6. ビルド確認

```bash
pnpm build
```

---

## 複数メニューグループにまたがるモジュール

ワークフローモジュールのように、1つのモジュールが複数のメニューグループにメニューを持つことができます。

```typescript
menus: [
  {
    id: "requests",
    path: "/workflow",
    menuGroup: "user",        // ← ユーザセクション
    // ...
  },
  {
    id: "approvals",
    path: "/workflow-approvals",
    menuGroup: "manager",     // ← マネージャーセクション
    // ...
  },
],
```

この場合、ページは各グループのディレクトリに配置します。

```
app/(menus)/(user)/workflow/           # menuGroup: "user"
app/(menus)/(manager)/workflow-approvals/  # menuGroup: "manager"
```

モジュールを無効化すると、すべてのメニューグループから一括で非表示になります。

---

## DB・APIを追加する場合

サンプルのワークフローモジュールはUIモックのみですが、
実際の業務モジュールではDB・APIが必要になります。

### Prismaスキーマ

```prisma
// prisma/schema.prisma に追加

model WorkflowRequest {
  id          String   @id @default(cuid())
  title       String
  type        String
  status      String   @default("draft")
  requesterId String
  approverId  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  requester   User     @relation("WorkflowRequester", fields: [requesterId], references: [id])
  approver    User?    @relation("WorkflowApprover", fields: [approverId], references: [id])
}
```

```bash
cd apps/web && npx prisma db push
```

### APIルート

```
app/api/workflow/
├── requests/
│   └── route.ts       # GET（一覧）, POST（新規作成）
└── approvals/
    └── route.ts       # GET（承認待ち一覧）, PATCH（承認/却下）
```

APIルートのパスは、モジュール定義の `services[].apiEndpoints` と一致させます。

---

## チェックリスト

- [ ] `lib/addon-modules/<name>/module.tsx` — モジュール定義
- [ ] `lib/addon-modules/<name>/index.ts` — re-export
- [ ] `lib/modules/registry.tsx` — レジストリに登録
- [ ] `lib/modules/icons.tsx` — アイコン追加（既存アイコンを使う場合は不要）
- [ ] `app/(menus)/(<group>)/<path>/page.tsx` — Server Component
- [ ] `app/(menus)/(<group>)/<path>/<Name>Client.tsx` — Client Component
- [ ] `app/(menus)/(<group>)/<path>/translations.ts` — 翻訳（en/ja）
- [ ] `menuGroup` とURLパスのグループが一致している
- [ ] `moduleId` がすべてのメニュー・サービスで統一されている
- [ ] `pnpm build` が成功する
- [ ] サイドバーにメニューが表示される
- [ ] 管理画面でAddonバッジが表示される
- [ ] トグル無効化でメニューが非表示になる

---

## 参考

- [モジュール作成ガイド（全般）](MODULE_GUIDE.md)
- [ワークフローモジュール（サンプル実装）](../apps/web/lib/addon-modules/workflow/)
- [学習パス](LEARNING_PATH.md)
