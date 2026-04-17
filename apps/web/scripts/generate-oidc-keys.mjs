#!/usr/bin/env node
// RSA 2048 鍵ペアを生成し、OIDC_SIGNING_KEYS 用 JSON を標準出力に出す。
// 使い方: node apps/web/scripts/generate-oidc-keys.mjs [--status active|next] [--rotate]
//   --status  : 生成鍵の初期状態（デフォルト active）
//   --rotate  : 既存の OIDC_SIGNING_KEYS（引数として pipe で渡す）に新鍵を next として追加
//
// 出力例:
//   OIDC_SIGNING_KEYS='[{"kid":"...","status":"active","privateJwk":{...},"publicJwk":{...}}]'

import { exportJWK, generateKeyPair } from "jose";
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const statusFlag = args.indexOf("--status");
const status = statusFlag >= 0 ? args[statusFlag + 1] : "active";

if (!["active", "next", "retired"].includes(status)) {
  console.error("Invalid --status. Use: active | next | retired");
  process.exit(1);
}

const { publicKey, privateKey } = await generateKeyPair("RS256", {
  modulusLength: 2048,
  extractable: true,
});

const publicJwk = await exportJWK(publicKey);
const privateJwk = await exportJWK(privateKey);
const kid = `k_${randomBytes(6).toString("hex")}`;

publicJwk.kid = kid;
publicJwk.alg = "RS256";
publicJwk.use = "sig";
privateJwk.kid = kid;
privateJwk.alg = "RS256";
privateJwk.use = "sig";

const entry = { kid, status, privateJwk, publicJwk };

console.log();
console.log("# === 生成完了 ===");
console.log(`# kid: ${kid}`);
console.log(`# status: ${status}`);
console.log();
console.log("# 以下を .env の OIDC_SIGNING_KEYS に設定してください:");
console.log();
console.log(`OIDC_SIGNING_KEYS='${JSON.stringify([entry])}'`);
console.log();
console.log(
  "# 既存の鍵をローテーションする場合は、既存 JSON に以下を追加:",
);
console.log(JSON.stringify(entry, null, 2));
