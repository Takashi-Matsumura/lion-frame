/**
 * APIルート用の認証・ロール階層チェックのテスト
 *
 * 仕様: CLAUDE.md「ロール階層」セクション
 * GUEST (0) → USER (1) → MANAGER (2) → EXECUTIVE (3) → ADMIN (4)
 */

const mockAuth = jest.fn();
jest.mock("@/auth", () => ({
  auth: () => mockAuth(),
}));

import { ApiError } from "@/lib/api/api-error";
import {
  requireAdmin,
  requireAuth,
  requireOneOfRoles,
  requireRole,
} from "@/lib/api/auth-guard";

// テスト用のセッション生成
function createSession(role: string, userId = "user-1") {
  return {
    user: { id: userId, role },
    expires: "2099-01-01T00:00:00.000Z",
  };
}

beforeEach(() => {
  mockAuth.mockReset();
});

describe("auth-guard", () => {
  describe("requireAuth", () => {
    it("セッションがある場合、セッションを返す", async () => {
      const session = createSession("USER");
      mockAuth.mockResolvedValue(session);

      const result = await requireAuth();
      expect(result).toBe(session);
    });

    it("セッションがない場合、ApiError をスローする", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(requireAuth()).rejects.toThrow(ApiError);
      await expect(requireAuth()).rejects.toMatchObject({ status: 401 });
    });

    it("セッションにユーザIDがない場合、ApiError をスローする", async () => {
      mockAuth.mockResolvedValue({ user: {} });

      await expect(requireAuth()).rejects.toThrow(ApiError);
    });
  });

  describe("requireAdmin", () => {
    it("ADMIN ロールの場合、セッションを返す", async () => {
      mockAuth.mockResolvedValue(createSession("ADMIN"));

      const result = await requireAdmin();
      expect(result.user.role).toBe("ADMIN");
    });

    it.each(["GUEST", "USER", "MANAGER", "EXECUTIVE"])(
      "%s ロールの場合、ApiError をスローする",
      async (role) => {
        mockAuth.mockResolvedValue(createSession(role));

        await expect(requireAdmin()).rejects.toThrow(ApiError);
        await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
      },
    );

    it("未認証の場合、ApiError をスローする", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(requireAdmin()).rejects.toThrow(ApiError);
    });

    it("role が undefined の場合、拒否される", async () => {
      mockAuth.mockResolvedValue({
        user: { id: "user-1", role: undefined },
        expires: "2099-01-01T00:00:00.000Z",
      });

      await expect(requireAdmin()).rejects.toThrow(ApiError);
      await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
    });
  });

  describe("requireRole（ロール階層チェック）", () => {
    const ALL_ROLES = ["GUEST", "USER", "MANAGER", "EXECUTIVE", "ADMIN"];

    describe("最小ロール GUEST の場合、全ロールがアクセス可能", () => {
      it.each(ALL_ROLES)("%s はアクセス可能", async (role) => {
        mockAuth.mockResolvedValue(createSession(role));

        const result = await requireRole("GUEST");
        expect(result.user.role).toBe(role);
      });
    });

    describe("最小ロール USER の場合", () => {
      it.each(["USER", "MANAGER", "EXECUTIVE", "ADMIN"])(
        "%s はアクセス可能",
        async (role) => {
          mockAuth.mockResolvedValue(createSession(role));

          const result = await requireRole("USER");
          expect(result.user.role).toBe(role);
        },
      );

      it("GUEST はアクセス不可", async () => {
        mockAuth.mockResolvedValue(createSession("GUEST"));

        await expect(requireRole("USER")).rejects.toThrow(ApiError);
      });
    });

    describe("最小ロール MANAGER の場合", () => {
      it.each(["MANAGER", "EXECUTIVE", "ADMIN"])(
        "%s はアクセス可能",
        async (role) => {
          mockAuth.mockResolvedValue(createSession(role));

          const result = await requireRole("MANAGER");
          expect(result.user.role).toBe(role);
        },
      );

      it.each(["GUEST", "USER"])("%s はアクセス不可", async (role) => {
        mockAuth.mockResolvedValue(createSession(role));

        await expect(requireRole("MANAGER")).rejects.toThrow(ApiError);
      });
    });

    describe("最小ロール EXECUTIVE の場合", () => {
      it.each(["EXECUTIVE", "ADMIN"])(
        "%s はアクセス可能",
        async (role) => {
          mockAuth.mockResolvedValue(createSession(role));

          const result = await requireRole("EXECUTIVE");
          expect(result.user.role).toBe(role);
        },
      );

      it.each(["GUEST", "USER", "MANAGER"])("%s はアクセス不可", async (role) => {
        mockAuth.mockResolvedValue(createSession(role));

        await expect(requireRole("EXECUTIVE")).rejects.toThrow(ApiError);
      });
    });

    describe("最小ロール ADMIN の場合、ADMIN のみアクセス可能", () => {
      it("ADMIN はアクセス可能", async () => {
        mockAuth.mockResolvedValue(createSession("ADMIN"));

        const result = await requireRole("ADMIN");
        expect(result.user.role).toBe("ADMIN");
      });

      it.each(["GUEST", "USER", "MANAGER", "EXECUTIVE"])(
        "%s はアクセス不可",
        async (role) => {
          mockAuth.mockResolvedValue(createSession(role));

          await expect(requireRole("ADMIN")).rejects.toThrow(ApiError);
        },
      );
    });

    it("未認証の場合、ApiError をスローする", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(requireRole("USER")).rejects.toThrow(ApiError);
    });

    describe("ロール情報が不正なセッション", () => {
      it("role が undefined の場合、GUEST扱いせずエラーにする", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "user-1", role: undefined },
          expires: "2099-01-01T00:00:00.000Z",
        });

        await expect(requireRole("GUEST")).rejects.toThrow(ApiError);
      });

      it("role が存在しないロール名の場合、エラーにする", async () => {
        mockAuth.mockResolvedValue({
          user: { id: "user-1", role: "INVALID_ROLE" },
          expires: "2099-01-01T00:00:00.000Z",
        });

        await expect(requireRole("GUEST")).rejects.toThrow(ApiError);
      });
    });
  });

  describe("requireOneOfRoles", () => {
    it("指定ロールに含まれる場合、セッションを返す", async () => {
      mockAuth.mockResolvedValue(createSession("MANAGER"));

      const result = await requireOneOfRoles(["MANAGER", "ADMIN"]);
      expect(result.user.role).toBe("MANAGER");
    });

    it("指定ロールに含まれない場合、ApiError をスローする", async () => {
      mockAuth.mockResolvedValue(createSession("USER"));

      await expect(
        requireOneOfRoles(["MANAGER", "ADMIN"]),
      ).rejects.toThrow(ApiError);
    });

    it("階層チェックではなく完全一致で判定する", async () => {
      // EXECUTIVE は MANAGER より上位だが、リストに含まれなければ拒否
      mockAuth.mockResolvedValue(createSession("EXECUTIVE"));

      await expect(
        requireOneOfRoles(["MANAGER", "ADMIN"]),
      ).rejects.toThrow(ApiError);
    });

    it("未認証の場合、ApiError をスローする", async () => {
      mockAuth.mockResolvedValue(null);

      await expect(requireOneOfRoles(["USER"])).rejects.toThrow(ApiError);
    });

    it("空配列を渡した場合、全ロールが拒否される", async () => {
      mockAuth.mockResolvedValue(createSession("ADMIN"));

      await expect(requireOneOfRoles([])).rejects.toThrow(ApiError);
      await expect(requireOneOfRoles([])).rejects.toMatchObject({ status: 401 });
    });

    it("ロール1つだけ渡した場合、そのロールのみ許可される", async () => {
      mockAuth.mockResolvedValue(createSession("MANAGER"));
      const result = await requireOneOfRoles(["MANAGER"]);
      expect(result.user.role).toBe("MANAGER");

      mockAuth.mockResolvedValue(createSession("ADMIN"));
      await expect(requireOneOfRoles(["MANAGER"])).rejects.toThrow(ApiError);
    });
  });

  describe("エラーステータスの一貫性", () => {
    it("requireAuth の拒否は 401 を返す", async () => {
      mockAuth.mockResolvedValue(null);
      await expect(requireAuth()).rejects.toMatchObject({ status: 401 });
    });

    it("requireAdmin の拒否は 401 を返す", async () => {
      mockAuth.mockResolvedValue(createSession("USER"));
      await expect(requireAdmin()).rejects.toMatchObject({ status: 401 });
    });

    it("requireRole の拒否は 401 を返す", async () => {
      mockAuth.mockResolvedValue(createSession("GUEST"));
      await expect(requireRole("ADMIN")).rejects.toMatchObject({ status: 401 });
    });

    it("requireOneOfRoles の拒否は 401 を返す", async () => {
      mockAuth.mockResolvedValue(createSession("GUEST"));
      await expect(requireOneOfRoles(["ADMIN"])).rejects.toMatchObject({ status: 401 });
    });
  });
});
