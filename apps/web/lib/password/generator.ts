/**
 * パスワードジェネレータ（サーバ・ブラウザ両対応）
 *
 * Web Crypto API（`crypto.getRandomValues`）のみを使用するため、
 * Node.js 20+ とブラウザの両方で動作する。
 */

// 曖昧文字（I / l / 1 / O / 0）を除外して誤読を防ぐ
const LOWER = "abcdefghijkmnopqrstuvwxyz";
const UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const DIGIT = "23456789";
const SYMBOL = "!@#$%^&*-_=+";
const ALL = LOWER + UPPER + DIGIT + SYMBOL;

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0 || maxExclusive > 0xff_ff_ff_ff) {
    throw new Error("randomInt: invalid max");
  }
  // modulo バイアスを避けるため、maxExclusive の倍数に収まるまで再抽選
  const array = new Uint32Array(1);
  const limit = Math.floor(0x1_00_00_00_00 / maxExclusive) * maxExclusive;
  while (true) {
    crypto.getRandomValues(array);
    if (array[0] < limit) return array[0] % maxExclusive;
  }
}

function pick(pool: string): string {
  return pool[randomInt(pool.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * 指定長のパスワードを生成する。
 * 英大小・数字・記号から各 1 文字以上を保証し、残りは全体プールから乱択。
 * 誤読の原因になる文字（I/l/1/O/0）は除外。
 */
export function generatePassword(length = 16): string {
  if (length < 12) {
    throw new Error("generatePassword length must be at least 12");
  }
  // 各文字種から 1 文字ずつ確保
  const required = [pick(LOWER), pick(UPPER), pick(DIGIT), pick(SYMBOL)];

  // 残りを全体プールから乱択
  const remaining: string[] = [];
  for (let i = 0; i < length - required.length; i++) {
    remaining.push(pick(ALL));
  }

  return shuffle([...required, ...remaining]).join("");
}

/**
 * 管理者が発行する仮パスワード（12 文字）。
 * 既存の `crypto.randomBytes(6).toString("base64url").slice(0, 8)` を置き換える。
 */
export function generateTemporaryPassword(length = 12): string {
  return generatePassword(length);
}
