// OIDC 関連の共有型定義。
// keys.ts は `jose` を import するためクライアントコンポーネントから
// 直接 import させたくない。型だけこちらに切り出す。

export type SigningKeyStatusReason = "not_set" | "invalid" | "no_active";

export type SigningKeyStatus =
  | {
      ok: true;
      activeKid: string;
      keyCount: number;
      statusCounts: Record<"active" | "next" | "retired", number>;
    }
  | {
      ok: false;
      reason: SigningKeyStatusReason;
      message: string;
    };
