// OIDC 署名鍵の管理
// OIDC_SIGNING_KEYS 環境変数から鍵を読み込み、署名・JWKS 公開・kid 解決を提供する。
//
// 運用:
//   - 署名には status="active" の鍵を使う（複数あれば最初の1つ）
//   - JWKS には active + next + retired の全鍵を公開（RP の kid キャッシュ切替に対応）
//   - 検証（token 再利用検知等）は kid で直接 lookup

import { type JWK, importJWK } from "jose";

type SigningKey = CryptoKey | Uint8Array;

type KeyStatus = "active" | "next" | "retired";

interface RawKeyEntry {
  kid: string;
  status: KeyStatus;
  privateJwk: JWK;
  publicJwk: JWK;
}

interface LoadedKey {
  kid: string;
  status: KeyStatus;
  privateKey: SigningKey;
  publicKey: SigningKey;
  publicJwk: JWK;
}

let cachedKeys: LoadedKey[] | null = null;

function parseRawKeys(): RawKeyEntry[] {
  const raw = process.env.OIDC_SIGNING_KEYS;
  if (!raw || raw.trim() === "") {
    throw new Error(
      "OIDC_SIGNING_KEYS is not set. Generate keys with `node apps/web/scripts/generate-oidc-keys.mjs` and add them to .env.",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (cause) {
    throw new Error("OIDC_SIGNING_KEYS is not valid JSON", { cause });
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("OIDC_SIGNING_KEYS must be a non-empty JSON array");
  }
  return parsed as RawKeyEntry[];
}

async function loadKeys(): Promise<LoadedKey[]> {
  if (cachedKeys) return cachedKeys;
  const raws = parseRawKeys();
  const loaded: LoadedKey[] = [];
  for (const entry of raws) {
    if (!entry.kid || !entry.privateJwk || !entry.publicJwk) {
      throw new Error(
        `OIDC_SIGNING_KEYS entry is missing required fields (kid/privateJwk/publicJwk)`,
      );
    }
    // 署名用は privateJwk、検証用は publicJwk から別々に import する。
    // Web Crypto API では CryptoKey に keyUsages が紐づいており、
    // sign 用のキーでは verify できないため両方必要（レビュー指摘）。
    const privateKey = await importJWK(entry.privateJwk, "RS256");
    const publicKey = await importJWK(entry.publicJwk, "RS256");
    loaded.push({
      kid: entry.kid,
      status: entry.status ?? "active",
      privateKey: privateKey as SigningKey,
      publicKey: publicKey as SigningKey,
      publicJwk: { ...entry.publicJwk, kid: entry.kid, alg: "RS256", use: "sig" },
    });
  }
  cachedKeys = loaded;
  return loaded;
}

/** 署名用のアクティブ鍵を 1 つ返す */
export async function getActiveSigningKey(): Promise<LoadedKey> {
  const keys = await loadKeys();
  const active = keys.find((k) => k.status === "active");
  if (!active) {
    throw new Error(
      "No OIDC signing key with status=active. Rotate via generate-oidc-keys.mjs.",
    );
  }
  return active;
}

/** JWKS として公開する全鍵の公開 JWK を返す */
export async function getPublicJwks(): Promise<{ keys: JWK[] }> {
  const keys = await loadKeys();
  return { keys: keys.map((k) => k.publicJwk) };
}

/** kid で鍵を引く（トークン検証用） */
export async function findKeyByKid(kid: string): Promise<LoadedKey | null> {
  const keys = await loadKeys();
  return keys.find((k) => k.kid === kid) ?? null;
}

/** テスト用にキャッシュをクリア */
export function __resetKeyCacheForTest(): void {
  cachedKeys = null;
}
