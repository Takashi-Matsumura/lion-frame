---
name: React Hooks・Next.js パターン
description: useCallback/useEffect無限ループ防止、Server Actions、Zustandストア連携、Suspense。Client Component作成、Biomeチェック後の修正時に使用。
---

# React Hooks・Next.js パターンガイド

## 無限ループ防止（最重要）

### 問題: Biomeチェック後の無限ループ

Biomeの `useExhaustiveDependencies` ルールで関数を依存配列に追加すると、`useCallback` でメモ化されていない場合**無限ループが発生**します。

### パターン: useCallback + useEffect

```typescript
import { useCallback, useEffect, useState } from "react";

// 1. useCallback で関数をメモ化（useEffect の前に定義）
const fetchData = useCallback(async () => {
  const response = await fetch("/api/data");
  setData(await response.json());
}, []); // 依存配列が空 = 関数の参照が変わらない

// 2. useEffect で呼び出し
useEffect(() => {
  fetchData();
}, [fetchData]); // 安全
```

### useCallback の依存配列パターン

```typescript
// パターン1: 外部変数に依存しない
const fetchData = useCallback(async () => {
  const response = await fetch("/api/data");
  setData(await response.json());
}, []); // 空

// パターン2: propsやstateに依存
const fetchData = useCallback(async () => {
  const response = await fetch(`/api/data?id=${userId}`);
  setData(await response.json());
}, [userId]); // userIdが変わったら再作成

// パターン3: 翻訳オブジェクトに依存
const fetchData = useCallback(async () => {
  try {
    const response = await fetch("/api/data");
    setData(await response.json());
  } catch {
    alert(t.loadError);
  }
}, [t.loadError]); // 該当キーのみ
```

### よくある間違い

```typescript
// ❌ useEffect の後に関数を定義
useEffect(() => { fetchData(); }, [fetchData]);
const fetchData = useCallback(...); // エラー！

// ❌ 不要な変数を依存配列に含める
const fetchData = useCallback(async () => {
  setData(await response.json());
}, [data, setData]); // data と setData は不要
// setData はReactが保証する安定した参照
```

## Server Actions

### 基本パターン

```typescript
// app/mypage/actions.ts
"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createItem(formData: FormData) {
  // 1. 認証チェック（必須）
  const session = await auth();
  if (!session?.user) redirect("/login");

  // 2. バリデーション
  const name = formData.get("name") as string;
  if (!name?.trim()) {
    return { error: "名前は必須です" };
  }

  // 3. DB操作
  await prisma.item.create({
    data: { name, userId: session.user.id },
  });

  // 4. キャッシュ更新
  revalidatePath("/mypage");
}
```

### フォームでの使用

```typescript
"use client";

import { useActionState } from "react";
import { createItem } from "./actions";

export function CreateForm() {
  const [state, formAction, isPending] = useActionState(createItem, null);

  return (
    <form action={formAction}>
      <input name="name" required />
      {state?.error && <p className="text-red-500">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? "作成中..." : "作成"}
      </button>
    </form>
  );
}
```

### useActionState vs useTransition

```typescript
// useActionState: フォーム送信 + 状態管理
const [state, formAction, isPending] = useActionState(serverAction, initialState);

// useTransition: プログラムからのServer Action呼び出し
const [isPending, startTransition] = useTransition();
const handleClick = () => {
  startTransition(async () => {
    await serverAction();
  });
};
```

## useOptimistic

楽観的更新でUIの応答性を向上させます。

```typescript
"use client";

import { useOptimistic } from "react";

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  );

  async function handleAdd(formData: FormData) {
    const name = formData.get("name") as string;

    // 即座にUIに反映（楽観的更新）
    addOptimisticTodo({ id: "temp", name, completed: false });

    // Server Actionで実際に保存
    await createTodo(formData);
  }

  return (
    <form action={handleAdd}>
      <input name="name" />
      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id}>{todo.name}</li>
        ))}
      </ul>
    </form>
  );
}
```

## Zustandストア連携

### ストア定義

```typescript
// lib/stores/my-store.ts
import { create } from "zustand";

interface MyStore {
  items: Item[];
  isLoading: boolean;
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  setLoading: (loading: boolean) => void;
}

export const useMyStore = create<MyStore>((set) => ({
  items: [],
  isLoading: false,
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

### 選択的サブスクリプション（再レンダリング最適化）

```typescript
// ✅ 必要なプロパティのみ購読
const items = useMyStore((state) => state.items);
const isLoading = useMyStore((state) => state.isLoading);

// ❌ ストア全体を購読（不要な再レンダリング）
const store = useMyStore();
```

### Server ComponentからClient Componentへの受け渡し

```typescript
// page.tsx (Server Component)
export default async function Page() {
  const data = await prisma.item.findMany();
  return <PageClient initialItems={data} />;
}

// PageClient.tsx (Client Component)
"use client";

export function PageClient({ initialItems }: { initialItems: Item[] }) {
  const { items, setItems } = useMyStore();

  // 初期データをストアに設定（1回のみ）
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems, setItems]);

  return <ItemList items={items} />;
}
```

## Suspenseとローディング

### Server ComponentでのSuspense

```typescript
// page.tsx
import { Suspense } from "react";

export default function Page() {
  return (
    <div>
      <h1>ダッシュボード</h1>
      <Suspense fallback={<LoadingSkeleton />}>
        <AsyncDataComponent />
      </Suspense>
    </div>
  );
}

// AsyncDataComponent.tsx (Server Component)
async function AsyncDataComponent() {
  const data = await prisma.item.findMany(); // awaitでもUIはブロックされない
  return <DataTable data={data} />;
}
```

### loading.tsx（ルートレベル）

```typescript
// app/(menus)/(user)/mypage/loading.tsx
export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto animate-pulse">
      <div className="h-8 bg-muted rounded w-1/4 mb-6" />
      <div className="h-64 bg-muted rounded" />
    </div>
  );
}
```

## カスタムフック

### useFetch（データ取得の共通化）

```typescript
"use client";

import { useCallback, useEffect, useState } from "react";

export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      setData(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
```

### useDebounce（検索入力の最適化）

```typescript
"use client";

import { useEffect, useState } from "react";

export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// 使用例
const [search, setSearch] = useState("");
const debouncedSearch = useDebounce(search, 300);

useEffect(() => {
  if (debouncedSearch) fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

## チェックリスト

Client Component作成時:

- [ ] `useCallback` をインポートしているか
- [ ] useEffectで使用する関数は `useCallback` でラップされているか
- [ ] 関数定義は useEffect の**前**に配置されているか
- [ ] 依存配列に適切な変数のみが含まれているか
- [ ] Zustandストアは選択的サブスクリプションを使用しているか
- [ ] Server Actionに認証チェックがあるか
- [ ] `"use client"` / `"use server"` ディレクティブは正しいか
- [ ] ローディング状態を適切に表示しているか
