// クライアント側で一意な ID を生成する。
//
// `crypto.randomUUID()` はブラウザでは secure context (HTTPS / localhost) でしか
// 定義されない Web API のため、HTTP + LAN IP (例: http://192.168.1.15:3030) で
// アクセスすると `crypto.randomUUID is not a function` で UI がクラッシュする
// (Issue #49)。利用可能なら native を使い、ダメなら時刻 + ランダム値で代替する。
//
// 外部 npm 化方針を維持するため、apps/web の utils には依存させず addon 内で
// 同等実装を持つ。
export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const rand = () => Math.random().toString(16).slice(2).padStart(12, "0");
  return `${Date.now().toString(16)}-${rand()}-${rand()}`;
}
