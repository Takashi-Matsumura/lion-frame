import { ApiError, apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";

// デフォルトのシステムプロンプト
const DEFAULT_SYSTEM_PROMPT = `あなたは業務効率化を支援するAIアシスタントです。以下のルールに従ってください：

1. 回答は簡潔かつ具体的にすること
2. 専門用語を使う場合は必要に応じて説明を加えること
3. 箇条書きやリストを活用して読みやすい形式で回答すること
4. 不確実な情報については推測であることを明示すること
5. 日本語で回答すること`;

// システムプロンプトを取得
export const GET = apiHandler(async (_request, session) => {
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { systemPrompt: true },
  });

  return {
    systemPrompt: user?.systemPrompt || DEFAULT_SYSTEM_PROMPT,
    isDefault: !user?.systemPrompt,
  };
});

// システムプロンプトを更新
export const PUT = apiHandler(async (request, session) => {
  const { systemPrompt } = await request.json();

  // 空文字列の場合はnullに設定（デフォルトに戻す）
  const promptValue = systemPrompt?.trim() || null;

  await prisma.user.update({
    where: { email: session.user.email! },
    data: { systemPrompt: promptValue },
  });

  return {
    success: true,
    systemPrompt: promptValue || DEFAULT_SYSTEM_PROMPT,
    isDefault: !promptValue,
  };
});

// デフォルトプロンプトを取得
export const POST = apiHandler(
  async () => {
    return {
      defaultPrompt: DEFAULT_SYSTEM_PROMPT,
    };
  },
  { public: true },
);
