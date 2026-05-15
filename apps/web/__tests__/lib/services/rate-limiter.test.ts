/**
 * rate-limiter の peek / record / reset テスト (Issue #58)
 *
 * ログイン系レート制限の定石「失敗のみカウントし、成功でリセット」を
 * 実現するための関数群を検証する。
 * - peekRateLimit: カウントを増やさず判定のみ（peek）
 * - recordFailedAttempt: 失敗時のみ1件記録
 * - resetRateLimit: 成功時にキーをクリア
 * 既存 checkRateLimit は他ルート互換のため挙動を変えない。
 */

import {
  checkRateLimit,
  peekRateLimit,
  recordFailedAttempt,
  resetRateLimit,
} from "@/lib/services/rate-limiter";

const WINDOW = 15 * 60 * 1000;

describe("rate-limiter: peek/record/reset (Issue #58)", () => {
  let counter = 0;
  // テストごとに一意なキーを使い、モジュールレベル store の干渉を避ける
  const nextKey = () => `test:${Date.now()}:${counter++}`;

  describe("peekRateLimit", () => {
    it("判定だけではカウントを消費しない（何回呼んでも allowed のまま）", () => {
      const key = nextKey();
      for (let i = 0; i < 100; i++) {
        expect(peekRateLimit(key, 10, WINDOW).allowed).toBe(true);
      }
    });

    it("記録された失敗が上限に達すると allowed=false を返す", () => {
      const key = nextKey();
      for (let i = 0; i < 10; i++) {
        recordFailedAttempt(key, WINDOW);
      }
      const r = peekRateLimit(key, 10, WINDOW);
      expect(r.allowed).toBe(false);
      expect(r.remaining).toBe(0);
    });

    it("上限未満なら allowed=true で残り回数を返す", () => {
      const key = nextKey();
      recordFailedAttempt(key, WINDOW);
      recordFailedAttempt(key, WINDOW);
      const r = peekRateLimit(key, 10, WINDOW);
      expect(r.allowed).toBe(true);
      expect(r.remaining).toBe(8);
    });
  });

  describe("recordFailedAttempt", () => {
    it("失敗を記録するたびにカウントが増える", () => {
      const key = nextKey();
      expect(peekRateLimit(key, 3, WINDOW).remaining).toBe(3);
      recordFailedAttempt(key, WINDOW);
      expect(peekRateLimit(key, 3, WINDOW).remaining).toBe(2);
      recordFailedAttempt(key, WINDOW);
      recordFailedAttempt(key, WINDOW);
      expect(peekRateLimit(key, 3, WINDOW).allowed).toBe(false);
    });
  });

  describe("resetRateLimit", () => {
    it("成功時にキーをクリアするとカウントが0に戻る", () => {
      const key = nextKey();
      for (let i = 0; i < 9; i++) recordFailedAttempt(key, WINDOW);
      expect(peekRateLimit(key, 10, WINDOW).remaining).toBe(1);
      resetRateLimit(key);
      expect(peekRateLimit(key, 10, WINDOW).remaining).toBe(10);
      expect(peekRateLimit(key, 10, WINDOW).allowed).toBe(true);
    });
  });

  describe("成功はカウントしない（Issue #58 の本質）", () => {
    it("peekRateLimit を 1000 回呼んでも失敗0件ならブロックされない", () => {
      const key = nextKey();
      for (let i = 0; i < 1000; i++) {
        expect(peekRateLimit(key, 10, WINDOW).allowed).toBe(true);
      }
    });

    it("失敗9回→成功(reset)→以降の判定はブロックされない", () => {
      const key = nextKey();
      for (let i = 0; i < 9; i++) {
        if (!peekRateLimit(key, 10, WINDOW).allowed) break;
        recordFailedAttempt(key, WINDOW);
      }
      resetRateLimit(key);
      for (let i = 0; i < 50; i++) {
        expect(peekRateLimit(key, 10, WINDOW).allowed).toBe(true);
      }
    });
  });

  describe("既存 checkRateLimit の後方互換", () => {
    it("従来どおり呼び出しごとにカウントを消費する", () => {
      const key = nextKey();
      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(key, 5, WINDOW).allowed).toBe(true);
      }
      expect(checkRateLimit(key, 5, WINDOW).allowed).toBe(false);
    });
  });
});
