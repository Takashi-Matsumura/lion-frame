---
name: 外部モジュール化
description: 内部アドオン/キオスクモジュールを外部npmパッケージ（GitHubリポジトリ）に分離する手順。モジュール外部化、パッケージ分離、npm化時に使用。
---

# 内部モジュールの外部パッケージ化

内部の `addon-modules/` や `kiosk-modules/` を、独立した GitHub リポジトリの npm パッケージとして切り出す手順。

## 前提: 関連ファイルの理解

| ファイル | 役割 |
|---------|------|
| `packages/module-types/src/index.ts` | 外部アドオン用の共有型定義（React/Prisma非依存） |
| `apps/web/addons.ts` | 外部アドオンの登録設定 |
| `apps/web/lib/modules/addon-loader.ts` | `AddonModuleDefinition` → `AppModule` 変換 + `EXTERNAL_MODULE_IDS` |
| `apps/web/lib/modules/registry.tsx` | 内部 + 外部モジュールの統合レジストリ |
| `apps/web/next.config.ts` | `transpilePackages` に外部パッケージを登録 |

## 外部化の全体フロー

```
┌──────────────────────────────────────┐
│ Step 1: 内部モジュールの型を変換      │
│   AppModule → AddonModuleDefinition  │
│   ReactNode → SVGパス文字列          │
│   Prisma Role → LionFrameRole       │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ Step 2: GitHubリポジトリを作成        │
│   gh repo create lionframe-addon-xxx │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ Step 3: パッケージとして構成          │
│   package.json / tsconfig.json       │
│   src/module.ts + src/pages/         │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│ Step 4: LionFrame側を切り替え        │
│   内部モジュール削除                  │
│   addons.ts に登録                   │
│   transpilePackages に追加           │
│   pnpm install                       │
└──────────────────────────────────────┘
```

## Step 1: モジュール定義の型変換

### 内部型（AppModule）→ 外部型（AddonModuleDefinition）の対応

| 内部（AppModule） | 外部（AddonModuleDefinition） | 変換方法 |
|-------------------|-------------------------------|----------|
| `icon?: ReactNode` | `iconPath?: string` | `icons.tsx` からSVGパス文字列をコピー |
| `requiredRoles?: Role[]` | `requiredRoles?: LionFrameRole[]` | 値はそのまま（`"USER"`, `"ADMIN"` 等） |
| `menu.icon?: ReactNode` | `menu.iconPath?: string` | 同上 |
| `import type { AppModule }` | `import type { AddonModuleDefinition }` | 型名変更 |
| `import { getModuleIcon }` | 不要（削除） | iconPath 文字列に置換 |
| `import { getMenuIcon }` | 不要（削除） | iconPath 文字列に置換 |

### アイコンパスの取得方法

`apps/web/lib/modules/icons.tsx` の `iconPaths` から該当モジュール/メニューの SVG パス文字列をコピーする。

```typescript
// 変換前（内部）
import { getModuleIcon, getMenuIcon } from "@/lib/modules/icons";
icon: getModuleIcon("workflow"),
// メニュー
icon: getMenuIcon("requests", "workflow"),

// 変換後（外部）
// icons.tsx の iconPaths.workflow の値をコピー
iconPath: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7...",
// メニュー
iconPath: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11...",
```

## Step 2: GitHub リポジトリの作成

```bash
gh repo create lionframe-addon-<module-name> --public \
  --description "LionFrame addon: <モジュール説明>"
```

命名規則: `lionframe-addon-<module-id>`（例: `lionframe-addon-workflow`）

## Step 3: パッケージ構成

### ディレクトリ構成

```
lionframe-addon-<module-name>/
├── .gitignore              # node_modules/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts            # モジュール定義のエクスポート
    ├── module.ts           # AddonModuleDefinition
    └── pages/
        ├── MyPage.tsx      # ページコンポーネント（"use client"）
        └── translations.ts # 翻訳（必要に応じて）
```

### package.json テンプレート

```json
{
  "name": "@lionframe/addon-<module-name>",
  "version": "0.1.0",
  "description": "<モジュール説明>",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./pages/<PageName>": "./src/pages/<PageName>.tsx"
  },
  "files": ["src"],
  "dependencies": {
    "@lionframe/module-types": "github:Takashi-Matsumura/lionframe-module-types"
  },
  "peerDependencies": {
    "react": "^19"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/react": "^19"
  }
}
```

### tsconfig.json テンプレート

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

### module.ts テンプレート

```typescript
import type { AddonModuleDefinition } from "@lionframe/module-types";

export const myModule: AddonModuleDefinition = {
  id: "<module-id>",
  name: "<Module Name>",
  nameJa: "<モジュール名>",
  description: "<English description>",
  descriptionJa: "<日本語説明>",
  iconPath: "<SVGパス文字列>",
  enabled: true,
  order: 50,
  menus: [
    {
      id: "<menu-id>",
      moduleId: "<module-id>",
      name: "<Menu Name>",
      nameJa: "<メニュー名>",
      path: "/<url-path>",
      menuGroup: "user",
      requiredRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
      enabled: true,
      order: 10,
      isImplemented: true,
    },
  ],
};
```

### index.ts

```typescript
export { myModule } from "./module";
```

### ページコンポーネントの移行

内部ページコンポーネントをコピーする際の注意点:

- **`@/components/ui` 等の LionFrame 内部 import は使用不可** → 自己完結させるか、peerDependency として公開されたUIライブラリを使う
- **`@/lib/prisma` 等のサーバーサイド import は使用不可** → データはプロキシページ（Server Component）で取得し、props で渡す
- **翻訳**: `@/lib/i18n/` のヘルパーは使えないため、コンポーネント内に翻訳を定義する

```typescript
// ❌ 外部パッケージでは使えない
import { Button } from "@/components/ui";
import { prisma } from "@/lib/prisma";

// ✅ 自己完結させる or propsで受け取る
export function MyPage({ language, data }: Props) { ... }
```

### GitHubに push

```bash
cd /tmp/lionframe-addon-<module-name>
git init
git add -A
git commit -m "initial: <モジュール名>の外部パッケージ化"
git remote add origin https://github.com/Takashi-Matsumura/lionframe-addon-<module-name>.git
git branch -M main
git push -u origin main
```

## Step 4: LionFrame 側の切り替え

### 4-1. 内部モジュールの削除

```bash
# アドオンモジュールの場合
rm -rf apps/web/lib/addon-modules/<module-name>/

# キオスクモジュールの場合
rm -rf apps/web/lib/kiosk-modules/<module-name>/
```

### 4-2. registry.tsx から内部インポートを削除

```typescript
// 削除: import { myModule } from "@/lib/addon-modules/<module-name>";
// 削除: レジストリオブジェクトから該当行
```

外部アドオンは `addons.ts` → `loadExternalAddons()` 経由で自動登録されるため、
registry.tsx への手動登録は不要。

### 4-3. icons.tsx から該当アイコンを削除

外部モジュールのアイコンは `iconPath` で自己完結するため、
`icons.tsx` の `iconPaths` から該当エントリを削除可能。

### 4-4. apps/web/package.json に依存追加

```json
{
  "dependencies": {
    "@lionframe/addon-<module-name>": "github:Takashi-Matsumura/lionframe-addon-<module-name>"
  }
}
```

### 4-5. addons.ts に登録

```typescript
import { myModule } from "@lionframe/addon-<module-name>";

export const externalAddons: AddonModuleDefinition[] = [
  myModule,  // ← 追加
];
```

### 4-6. next.config.ts の transpilePackages に追加

```typescript
transpilePackages: [
  "@lionframe/addon-<module-name>",  // ← 追加
  "@lionframe/module-types",
],
```

**重要:** 外部パッケージは TypeScript ソースのまま配布されるため、
Next.js に明示的にトランスパイルを指示する必要がある。

### 4-7. プロキシページの確認

既存のページファイル（`app/(menus)/.../<path>/page.tsx`）を
外部パッケージのコンポーネントを読み込むプロキシに書き換える。

```typescript
// app/(main)/(menus)/(user)/<path>/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getLanguage } from "@/lib/i18n/get-language";
import { MyPage } from "@lionframe/addon-<module-name>/pages/MyPage";

export default async function Page() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const language = await getLanguage();
  // サーバーサイドのデータ取得はここで行い、propsで渡す
  return <MyPage language={language} />;
}
```

### 4-8. インストールとビルド確認

```bash
pnpm install
cd apps/web && npx next build
```

## 外部パッケージの更新（アドオン側で変更した場合）

外部リポジトリに変更を push した後、LionFrame 側で最新版を取得する:

```bash
pnpm update @lionframe/addon-<module-name>
```

## チェックリスト

- [ ] `module.ts`: `AddonModuleDefinition` 型に変換
- [ ] `module.ts`: `iconPath` にSVGパス文字列を設定（`icons.tsx` からコピー）
- [ ] `module.ts`: `getModuleIcon` / `getMenuIcon` のインポートを削除
- [ ] ページコンポーネント: `@/` プレフィックスのインポートを排除
- [ ] ページコンポーネント: `"use client"` を付与
- [ ] `package.json`: `exports` にページコンポーネントのパスを追加
- [ ] `.gitignore`: `node_modules/` を記載
- [ ] GitHub リポジトリに push
- [ ] LionFrame: `registry.tsx` から内部インポートを削除
- [ ] LionFrame: `package.json` に GitHub 依存を追加
- [ ] LionFrame: `addons.ts` に登録
- [ ] LionFrame: `next.config.ts` の `transpilePackages` に追加
- [ ] LionFrame: プロキシページを作成/更新
- [ ] LionFrame: `pnpm install` → ビルド確認

## npm 公開する場合（将来）

GitHub 参照から npm パッケージに切り替える場合:

1. npm アカウントで `@lionframe` スコープを取得
2. `npm publish --access public`
3. LionFrame の `package.json` を変更:

```json
// 変更前
"@lionframe/addon-xxx": "github:Takashi-Matsumura/lionframe-addon-xxx"
// 変更後
"@lionframe/addon-xxx": "^0.1.0"
```

## 制約と注意事項

### Next.js App Router の制約
- ルートファイル（`page.tsx`）は LionFrame 本体側に物理ファイルが必要
- 外部パッケージからルートを動的に追加することは不可能
- プロキシページ（薄い re-export ファイル）で対応する

### 外部パッケージで使えないもの
- `@/components/ui/*` — LionFrame の内部UIコンポーネント
- `@/lib/prisma` — データベースアクセス（Server Component のプロキシページで行う）
- `@/lib/services/*` — フレーム基盤サービス（API経由でアクセス）
- `@/lib/i18n/*` — 翻訳ヘルパー（コンポーネント内に翻訳を定義）

### 外部パッケージで使えるもの
- 標準の React / HTML / Tailwind CSS
- peerDependency として宣言したライブラリ
- プロキシページから props で渡されたデータ
- `fetch()` による API 呼び出し
