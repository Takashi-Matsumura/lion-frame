---
name: 多言語対応（i18n）
description: 翻訳ファイル作成、Server/Client Component での多言語実装。翻訳追加、新規ページ作成時に使用。
---

# 多言語対応（i18n）実装ガイド

## アーキテクチャ

```
apps/web/lib/i18n/
  ├── get-language.ts        # ユーザーの言語設定取得
  └── page-titles.ts         # ページタイトルの翻訳（共通）

apps/web/app/[module]/
  ├── page.tsx              # モジュールページ
  └── translations.ts       # モジュール固有の翻訳ファイル
```

## 翻訳ファイルの作成

```typescript
// apps/web/app/profile/translations.ts
export const profileTranslations = {
  en: {
    title: "Profile",
    personalInfo: "Personal Information",
    email: "Email",
    role: "Role",
  },
  ja: {
    title: "プロフィール",
    personalInfo: "個人情報",
    email: "メールアドレス",
    role: "ロール",
  },
} as const;  // ← 必須: 型安全性のため

export type ProfileTranslationKey = keyof typeof profileTranslations.en;
```

## Server Componentでの使用

```typescript
// apps/web/app/profile/page.tsx
import { getLanguage } from "@/lib/i18n/get-language";
import { profileTranslations } from "./translations";

export default async function ProfilePage() {
  const language = await getLanguage();
  const t = profileTranslations[language];

  return (
    <div>
      <h1>{t.title}</h1>
      <p>{t.personalInfo}</p>
    </div>
  );
}
```

## Client Componentでの使用

```typescript
// apps/web/components/ProfileCard.tsx
"use client";

interface ProfileCardProps {
  language?: string;
}

export function ProfileCard({ language = "en" }: ProfileCardProps) {
  // 小規模な翻訳には関数を使用
  const t = (en: string, ja: string) => language === "ja" ? ja : en;

  return (
    <div>
      <button>{t("Edit", "編集")}</button>
      <button>{t("Save", "保存")}</button>
    </div>
  );
}
```

## ページタイトルの追加

```typescript
// apps/web/lib/i18n/page-titles.ts
export const pageTitles = {
  en: {
    "/new-page": "New Page Title",
  },
  ja: {
    "/new-page": "新しいページタイトル",
  },
} as const;
```

## 日本語専用アドオンモジュール（jaOnly パターン）

アドオンモジュールは `jaOnly: true` を設定すると、翻訳を日本語のみで定義できます。

```typescript
// lib/addon-modules/mymodule/module.tsx
export const myModule: AppModule = {
  id: "mymodule",
  jaOnly: true,  // ← 日本語専用
  // ...
};
```

```typescript
// translations.ts
import { jaOnly } from "@/lib/i18n/ja-only";

export const translations = jaOnly({
  title: "マイページ",
  save: "保存",
  cancel: "キャンセル",
});

export type Language = keyof typeof translations;
```

`jaOnly()` ヘルパーは `{ en: T, ja: T }` を返すため、コンポーネントの
`translations[language]` パターンはそのまま動作します。

**注意:**
- コアモジュール（`lib/core-modules/`）では使用不可
- モジュール定義の `name`/`nameJa` はサイドバー表示で使われるため両方必要
- コンポーネント内の `language === "ja"` 分岐は不要（常にjaと同じ結果）
- ただし、ユーザーデータ（`titleJa || title`）の表示切替パターンは残してよい

## ベストプラクティス

### ✅ 推奨

```typescript
// 翻訳ファイルを使用
<h1>{t.title}</h1>

// as const を使用
const translations = { ... } as const;

// 意味のあるキー名
welcomeMessage: "Welcome to Your Dashboard"
```

### ❌ 避ける

```typescript
// ハードコーディング
<h1>Dashboard</h1>

// as const なし
const translations = { ... }  // 型チェックが効かない

// 意味のないキー名
text1: "Dashboard"
```

## 新機能開発チェックリスト

- [ ] 翻訳ファイル（`translations.ts`）を作成
- [ ] ページタイトルを `page-titles.ts` に追加
- [ ] UI要素（ボタン、ラベル）を翻訳
- [ ] 英語と日本語の両方をテスト
- [ ] `as const` を使用
