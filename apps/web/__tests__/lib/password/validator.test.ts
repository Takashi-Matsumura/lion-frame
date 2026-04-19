import {
  MIN_PASSWORD_LENGTH,
  validatePassword,
} from "@/lib/password/validator";

describe("validatePassword", () => {
  describe("長さ境界", () => {
    it("11 文字は TOO_SHORT を返す", () => {
      const r = validatePassword("Abcdefg1234"); // 11 chars
      expect(r.valid).toBe(false);
      expect(r.errors).toContain("TOO_SHORT");
    });

    it(`${MIN_PASSWORD_LENGTH} 文字なら長さ要件を満たす`, () => {
      const r = validatePassword("Abcdefg12345"); // 12 chars
      expect(r.errors).not.toContain("TOO_SHORT");
      expect(r.valid).toBe(true);
    });
  });

  describe("ブラックリスト", () => {
    it.each([
      "password123",
      "QWERTY123",
      "Admin123",
      "letmein",
    ])("'%s' は BLACKLISTED として拒否", (pw) => {
      const longEnough = pw.length >= MIN_PASSWORD_LENGTH ? pw : pw + "xxxxxx";
      // ブラックリスト判定自体は完全一致なので、埋め込みは行わずそのまま検査
      const r = validatePassword(pw);
      if (pw.length >= MIN_PASSWORD_LENGTH) {
        expect(r.errors).toContain("BLACKLISTED");
      } else {
        // 12 文字未満なら TOO_SHORT も併発
        expect(r.errors).toEqual(
          expect.arrayContaining(["TOO_SHORT", "BLACKLISTED"]),
        );
      }
      void longEnough;
    });

    it("ブラックリストに無いパスワードは BLACKLISTED を返さない", () => {
      const r = validatePassword("Zr7!fK2pQn9sW");
      expect(r.errors).not.toContain("BLACKLISTED");
    });
  });

  describe("ユーザ情報包含", () => {
    it("email ローカル部を含むと CONTAINS_USER_INFO", () => {
      const r = validatePassword("myadminSecret123", {
        email: "admin@lionframe.local",
      });
      expect(r.errors).toContain("CONTAINS_USER_INFO");
    });

    it("name を含むと CONTAINS_USER_INFO", () => {
      const r = validatePassword("TanakaHidden!9x", { name: "Tanaka Taro" });
      expect(r.errors).toContain("CONTAINS_USER_INFO");
    });

    it("email ローカル部が短すぎる場合は検査対象外", () => {
      // 2 文字以下の email ローカル部はチェックしない
      const r = validatePassword("Zr7!fK2pQn9sW", { email: "ab@example.com" });
      expect(r.errors).not.toContain("CONTAINS_USER_INFO");
    });

    it("ユーザ情報無しなら CONTAINS_USER_INFO を返さない", () => {
      const r = validatePassword("Zr7!fK2pQn9sW");
      expect(r.errors).not.toContain("CONTAINS_USER_INFO");
    });
  });

  describe("連続文字", () => {
    it("同一文字が 4 回連続すると REPEATED_CHARS", () => {
      const r = validatePassword("Zr7!fK2pQaaaa");
      expect(r.errors).toContain("REPEATED_CHARS");
    });

    it("3 回連続は許容", () => {
      const r = validatePassword("Zr7!fK2pQaaa9");
      expect(r.errors).not.toContain("REPEATED_CHARS");
    });
  });

  describe("強度スコア", () => {
    it("エラーありは weak", () => {
      const r = validatePassword("password");
      expect(r.strength).toBe("weak");
    });

    it("12 文字で文字種少なめは medium", () => {
      const r = validatePassword("Zr7fK2pQn9sW"); // 12 chars
      expect(r.strength).toBe("medium");
    });

    it("16 文字以上 + 文字種 3 種類以上は strong", () => {
      const r = validatePassword("Zr7!fK2pQn9sW3x@");
      expect(r.strength).toBe("strong");
    });

    it("valid=false のときは必ず weak", () => {
      const r = validatePassword("admin123"); // 短い+blacklisted
      expect(r.valid).toBe(false);
      expect(r.strength).toBe("weak");
    });
  });
});
