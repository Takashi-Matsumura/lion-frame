/**
 * generateId のテスト (Issue #49)
 *
 * secure context (HTTPS / localhost) では crypto.randomUUID() を使い、
 * non-secure context (HTTP + LAN IP) では時刻 + ランダムのフォールバックを使う。
 */

import { generateId } from "@/lib/utils";

describe("generateId", () => {
  const realCrypto = globalThis.crypto;

  afterEach(() => {
    // crypto をテストごとに復元
    Object.defineProperty(globalThis, "crypto", {
      value: realCrypto,
      configurable: true,
      writable: true,
    });
  });

  it("crypto.randomUUID が使えればそれを返す", () => {
    const stub = jest.fn(() => "11111111-2222-3333-4444-555555555555");
    Object.defineProperty(globalThis, "crypto", {
      value: { randomUUID: stub },
      configurable: true,
      writable: true,
    });
    expect(generateId()).toBe("11111111-2222-3333-4444-555555555555");
    expect(stub).toHaveBeenCalledTimes(1);
  });

  it("crypto が undefined のときフォールバックを使う", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(id).toMatch(/^[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$/);
  });

  it("crypto.randomUUID が undefined (non-secure context) のときフォールバックを使う", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: { subtle: {} } as Partial<Crypto>,
      configurable: true,
      writable: true,
    });
    const id = generateId();
    expect(id).toMatch(/^[0-9a-f]+-[0-9a-f]+-[0-9a-f]+$/);
  });

  it("フォールバックは呼び出すたびに異なる値を返す", () => {
    Object.defineProperty(globalThis, "crypto", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }
    // 100 回中の重複がほぼ起きないこと（時刻 + 2 つの 12 桁 hex で十分一意）
    expect(ids.size).toBe(100);
  });
});
