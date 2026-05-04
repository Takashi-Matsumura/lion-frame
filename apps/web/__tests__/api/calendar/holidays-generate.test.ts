/**
 * /api/calendar/holidays/generate のエラーハンドリングテスト
 *
 * Issue #51 関連: AIService が thinking モデル切れ等で詳細なエラーを
 * 投げた場合に、apiHandler の汎用 500 ハンドラで握り潰されず、画面まで
 * メッセージが届くことを検証する。
 */

import { POST } from "@/app/api/calendar/holidays/generate/route";
import { auth } from "@/auth";
import { AIService } from "@/lib/core-modules/ai";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth");
jest.mock("@/lib/core-modules/ai");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    holiday: {
      create: jest.fn(),
    },
  },
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockGenerate = AIService.generate as jest.MockedFunction<
  typeof AIService.generate
>;

const mockAdminSession = {
  user: { id: "admin-1", email: "admin@example.com", role: "ADMIN" },
  expires: "2099-01-01",
};

const createRequest = (body: unknown) =>
  new Request("http://localhost:3000/api/calendar/holidays/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

describe("POST /api/calendar/holidays/generate", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.mockResolvedValue(mockAdminSession as never);
  });

  describe("AIエラーの画面伝達 (Issue #51)", () => {
    it("AIService が thinking モデル切れエラーを投げた場合、400 + 元メッセージを返す", async () => {
      const detailedMessage =
        "lm-studio のモデル「gemma-thinking」は thinking/reasoning モデルのため、" +
        "思考の出力で max_tokens (8000) を使い切り本文が返りませんでした。" +
        "対処: max_tokens を増やすか、thinking なしのモデルに切り替えてください。";
      mockGenerate.mockRejectedValue(new Error(detailedMessage));

      const response = await POST(createRequest({ year: 2026 }));

      expect(response.status).toBe(400);
      const json = await response.json();
      // apiHandler は ApiError.toJSON() で error / errorJa を返す
      expect(json.error).toBe(detailedMessage);
      expect(json.errorJa).toBe(detailedMessage);
    });

    it("AIService が任意の Error を投げた場合も 500 ではなく 400 + 本文を返す", async () => {
      mockGenerate.mockRejectedValue(new Error("connection refused"));

      const response = await POST(createRequest({ year: 2026 }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("connection refused");
    });

    it("AIService が JSON ではない文字列を返した場合、400 + 解析失敗メッセージを返す", async () => {
      mockGenerate.mockResolvedValue({
        output: "ここは JSON ではありません",
        provider: "local",
        model: "lm-studio/test",
      });

      const response = await POST(createRequest({ year: 2026 }));

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toContain("JSON");
    });
  });

  describe("バリデーション", () => {
    it("year 未指定なら 400", async () => {
      const response = await POST(createRequest({}));
      expect(response.status).toBe(400);
    });
  });

  describe("正常系", () => {
    it("AIService が正しい JSON を返したら祝日を作成して返す", async () => {
      mockGenerate.mockResolvedValue({
        output: JSON.stringify([
          {
            date: "2026-01-01",
            name: "元日",
            nameEn: "New Year's Day",
            type: "national",
          },
        ]),
        provider: "local",
        model: "lm-studio/test",
      });
      (prisma.holiday.create as jest.Mock).mockResolvedValue({
        id: "h1",
        date: new Date("2026-01-01"),
        name: "元日",
        nameEn: "New Year's Day",
        type: "national",
      });

      const response = await POST(createRequest({ year: 2026 }));

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.generated).toBe(1);
      expect(json.holidays).toHaveLength(1);
    });
  });
});
