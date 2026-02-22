/**
 * セキュリティ修正の静的検証テスト
 *
 * コード内のセキュリティパターンが正しく適用されていることを
 * ファイル内容の検査で確認する。
 */

import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf-8");
}

describe("セキュリティ静的検証", () => {
  describe("監査ログからのPII除去", () => {
    it("auth.config.ts の監査ログに email が含まれていないこと", () => {
      const source = readSource("auth.config.ts");
      // auditLog.create の details 内に email が存在しないことを確認
      const auditLogMatch = source.match(
        /auditLog[\s\S]*?\.create\([\s\S]*?details:\s*JSON\.stringify\(\{([\s\S]*?)\}\)/
      );
      expect(auditLogMatch).not.toBeNull();
      if (auditLogMatch) {
        expect(auditLogMatch[1]).not.toContain("email");
      }
    });
  });

  describe("セキュリティヘッダー", () => {
    it("next.config.ts に必須セキュリティヘッダーが設定されていること", () => {
      const source = readSource("next.config.ts");
      expect(source).toContain("X-Content-Type-Options");
      expect(source).toContain("nosniff");
      expect(source).toContain("X-Frame-Options");
      expect(source).toContain("DENY");
      expect(source).toContain("Strict-Transport-Security");
    });
  });

  describe("x-forwarded-host 信頼制限", () => {
    it("middleware.ts で AUTH_URL に対する検証があること", () => {
      const source = readSource("middleware.ts");
      expect(source).toContain("AUTH_URL");
      expect(source).toContain("trustedHost");
    });
  });

  describe("ログインレート制限", () => {
    it("auth.ts の authorize 関数にレート制限があること", () => {
      const source = readSource("auth.ts");
      expect(source).toContain("checkRateLimit");
      expect(source).toContain("login:");
    });
  });

  describe("AUTH_SECRET 警告", () => {
    it("auth.config.ts に AUTH_SECRET の長さチェックがあること", () => {
      const source = readSource("auth.config.ts");
      expect(source).toContain("[SECURITY]");
      expect(source).toContain("authSecret.length < 32");
    });
  });

  describe("パストラバーサル防止", () => {
    it("uploads/profiles route で resolve ベースのホワイトリスト検証があること", () => {
      const source = readSource(
        "app/api/uploads/profiles/[...path]/route.ts"
      );
      expect(source).toContain("resolve");
      expect(source).toContain("startsWith(baseDir)");
    });
  });

  describe("プロフィール画像 MIME ベース拡張子", () => {
    it("profile-image route で MIME タイプから拡張子を導出していること", () => {
      const source = readSource("app/api/user/profile-image/route.ts");
      expect(source).toContain("extensionFromMime");
    });
  });

  describe("Cookie セキュリティ", () => {
    it("本番環境でセキュアCookieが有効になること", () => {
      const source = readSource("auth.config.ts");
      expect(source).toContain('process.env.NODE_ENV === "production"');
      expect(source).toContain("useSecureCookies");
    });
  });

  describe("2FA Cookie 署名", () => {
    it("middleware で verifySignedValue が使われていること", () => {
      const source = readSource("middleware.ts");
      expect(source).toContain("verifySignedValue");
    });

    it("verify-totp route で signValue が使われていること", () => {
      const source = readSource("app/api/auth/verify-totp/route.ts");
      expect(source).toContain("signValue");
    });
  });
});
