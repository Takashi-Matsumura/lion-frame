/**
 * local-provider のテスト (OpenAI 互換ブランチ)
 *
 * Issue #51: thinking モデル (Gemma thinking, gpt-oss, DeepSeek-R1 等) が
 * reasoning_content に思考を出して max_tokens を使い切ると content が空で
 * 返るが、その場合に呼び出し側へ原因が伝わるエラーを投げることを検証する。
 */

import {
  chatWithLocal,
  generateWithLocal,
  translateWithLocal,
} from "@/lib/core-modules/ai/providers/local-provider";
import type { AIConfig } from "@/lib/core-modules/ai/types";

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

const baseConfig: AIConfig = {
  enabled: true,
  provider: "local",
  apiKey: null,
  model: "",
  localProvider: "lm-studio",
  localEndpoint: "http://localhost:1234/v1/chat/completions",
  localModel: "gemma-thinking-test",
};

const okResponse = (body: unknown) => ({
  ok: true,
  status: 200,
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe("local-provider OpenAI 互換ブランチ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("thinking モデルが max_tokens を使い切ったケース", () => {
    const thinkingTruncatedBody = {
      choices: [
        {
          message: {
            content: "",
            reasoning_content: "x".repeat(5000),
          },
          finish_reason: "length",
        },
      ],
      usage: { completion_tokens: 2000 },
    };

    it("generateWithLocal: モデル名・consumed token・対処法を含むエラーを投げる", async () => {
      mockFetch.mockResolvedValueOnce(okResponse(thinkingTruncatedBody));

      await expect(
        generateWithLocal(
          [{ role: "user", content: "hi" }],
          baseConfig,
          0.1,
          2000,
        ),
      ).rejects.toThrow(/gemma-thinking-test/);

      mockFetch.mockResolvedValueOnce(okResponse(thinkingTruncatedBody));
      await expect(
        generateWithLocal(
          [{ role: "user", content: "hi" }],
          baseConfig,
          0.1,
          2000,
        ),
      ).rejects.toThrow(/max_tokens/);
    });

    it("chatWithLocal: thinking 専用エラーを投げる", async () => {
      mockFetch.mockResolvedValueOnce(okResponse(thinkingTruncatedBody));

      await expect(
        chatWithLocal([{ role: "user", content: "hi" }], baseConfig),
      ).rejects.toThrow(/thinking/);
    });

    it("translateWithLocal: thinking 専用エラーを投げる", async () => {
      mockFetch.mockResolvedValueOnce(okResponse(thinkingTruncatedBody));

      await expect(
        translateWithLocal(
          { text: "hello", sourceLanguage: "en", targetLanguage: "ja" },
          baseConfig,
        ),
      ).rejects.toThrow(/thinking/);
    });
  });

  describe("通常モデルが max_tokens を使い切ったケース (reasoning_content なし)", () => {
    it("max_tokens を増やすよう案内するエラーを投げる", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          choices: [
            { message: { content: "" }, finish_reason: "length" },
          ],
          usage: { completion_tokens: 2000 },
        }),
      );

      await expect(
        generateWithLocal(
          [{ role: "user", content: "hi" }],
          baseConfig,
          0.1,
          2000,
        ),
      ).rejects.toThrow(/max_tokens/);
    });
  });

  describe("正常レスポンス", () => {
    it("generateWithLocal: content がそのまま返る", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          choices: [
            { message: { content: "  result text  " }, finish_reason: "stop" },
          ],
          usage: { completion_tokens: 5 },
        }),
      );

      const result = await generateWithLocal(
        [{ role: "user", content: "hi" }],
        baseConfig,
        0.1,
        2000,
      );

      expect(result.output).toBe("result text");
      expect(result.provider).toBe("local");
    });

    it("chatWithLocal: content がそのまま返る", async () => {
      mockFetch.mockResolvedValueOnce(
        okResponse({
          choices: [
            { message: { content: "hello" }, finish_reason: "stop" },
          ],
        }),
      );

      const result = await chatWithLocal(
        [{ role: "user", content: "hi" }],
        baseConfig,
      );

      expect(result.message).toBe("hello");
    });
  });
});
