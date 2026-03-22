"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Send, Square, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { Input } from "@/components/ui/input";
import { formatFormValue } from "@/lib/addon-modules/forms/format-utils";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";

// ─── Types ───

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface FormResponseData {
  formId: string;
  formTitle: string;
  totalEmployees: number;
  totalResponded: number;
  departments: {
    name: string;
    respondedCount: number;
    notRespondedCount: number;
  }[];
  answers: {
    respondent: string;
    submittedAt: string;
    fields: Record<string, string>;
  }[];
}

// ─── Preset prompts ───

const PRESETS = [
  { label: "回答傾向を分析", prompt: "フォームの回答データを分析して、主な傾向やパターンを教えてください。" },
  { label: "未回答者への催促メール", prompt: "まだ回答していない社員に送る催促メール文を作成してください。丁寧かつ簡潔に、回答の重要性を伝える内容でお願いします。" },
  { label: "回答状況サマリー", prompt: "現在の回答状況を、経営層に報告するための簡潔なサマリーにまとめてください。" },
];

// ─── Component ───

export function FormAIAnalysis({
  formId,
  language,
}: {
  formId: string;
  language: Language;
}) {
  const t = formBuilderTranslations[language];
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [contextData, setContextData] = useState<FormResponseData | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // フォームの回答データをコンテキストとして取得
  useEffect(() => {
    (async () => {
      try {
        const [statusRes, responsesRes] = await Promise.all([
          fetch(`/api/forms/${formId}/responses/status`),
          fetch(`/api/forms/${formId}/responses`),
        ]);
        if (!statusRes.ok || !responsesRes.ok) throw new Error();

        const status = await statusRes.json();
        const { responses } = await responsesRes.json();

        // フィールド順を取得
        const fieldOrder = responses[0]?.answers?.map(
          (a: { field: { id: string; labelJa: string; label: string } }) => a.field,
        ) ?? [];

        const answers = responses.map(
          (sub: {
            submitter: { name: string; email: string };
            submittedAt: string;
            answers: { field: { id: string; labelJa: string; label: string; type: string }; value: unknown }[];
          }) => {
            const fields: Record<string, string> = {};
            const answerMap = new Map(sub.answers.map((a) => [a.field.id, a.value]));
            for (const f of fieldOrder) {
              const val = answerMap.get(f.id);
              fields[f.labelJa || f.label] = formatFormValue(val, undefined, { emptyValue: "-" });
            }
            return {
              respondent: sub.submitter.name ?? sub.submitter.email ?? "-",
              submittedAt: sub.submittedAt
                ? new Date(sub.submittedAt).toLocaleDateString("ja-JP")
                : "-",
              fields,
            };
          },
        );

        setContextData({
          formId,
          formTitle: status.departments ? status.formTitle ?? "" : "",
          totalEmployees: status.totalEmployees,
          totalResponded: status.totalResponded,
          departments: status.departments.map(
            (d: { name: string; responded: unknown[]; notResponded: unknown[] }) => ({
              name: d.name,
              respondedCount: d.responded.length,
              notRespondedCount: d.notResponded.length,
            }),
          ),
          answers,
        });
      } catch {
        // コンテキスト取得失敗でもUI自体は表示
      } finally {
        setLoadingContext(false);
      }
    })();
  }, [formId]);

  // 自動スクロール
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const buildSystemPrompt = useCallback(() => {
    if (!contextData) return "";
    const { totalEmployees, totalResponded, departments, answers } = contextData;
    const rate = totalEmployees > 0 ? Math.round((totalResponded / totalEmployees) * 100) : 0;

    let prompt = `あなたはフォーム回答データの分析アシスタントです。以下のデータに基づいて質問に回答してください。日本語で回答してください。

## フォーム回答状況
- 対象社員: ${totalEmployees}名
- 回答済み: ${totalResponded}名
- 未回答: ${totalEmployees - totalResponded}名
- 回答率: ${rate}%

## 部署別状況
${departments.map((d) => `- ${d.name}: 回答${d.respondedCount}名 / 未回答${d.notRespondedCount}名`).join("\n")}
`;

    if (answers.length > 0) {
      prompt += `\n## 回答データ (${answers.length}件)\n`;
      for (const a of answers) {
        prompt += `\n### ${a.respondent} (${a.submittedAt})\n`;
        for (const [key, val] of Object.entries(a.fields)) {
          prompt += `- ${key}: ${val}\n`;
        }
      }
    }

    return prompt;
  }, [contextData]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || streaming) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setStreaming(true);

      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages([...newMessages, assistantMsg]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/ai/chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
            systemPrompt: buildSystemPrompt(),
            useOrgContext: false,
            useRagContext: false,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) throw new Error();

        const reader = res.body?.getReader();
        if (!reader) throw new Error();

        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.content) {
                fullContent += parsed.content;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                  };
                  return updated;
                });
              }
              if (parsed.done) break;
              if (parsed.error) throw new Error(parsed.error);
            } catch {}
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          toast.error(t.loadError);
          setMessages((prev) => prev.slice(0, -1));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, buildSystemPrompt, t.loadError],
  );

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  if (loadingContext) return null;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {t.aiAnalysis}
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 h-7 text-xs">
              <RotateCcw className="h-3 w-3" />
              {t.aiReset}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0">
        {/* 中央エリア（flex-1で残りスペースを使い切る） */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mb-3" ref={scrollRef}>
          {/* プリセットボタン（会話がまだない場合） */}
          {messages.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground mb-1">
                回答データをAIが分析します。質問を入力するか、プリセットを選択してください。
              </p>
              {PRESETS.map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => sendMessage(p.prompt)}
                  disabled={streaming}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`text-sm ${
                    msg.role === "user"
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div className="bg-muted rounded-lg px-3 py-2">{msg.content}</div>
                  ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown>{msg.content || "..."}</ReactMarkdown>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 入力エリア */}
        <div className="flex gap-2 shrink-0">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                sendMessage(input);
              }
            }}
            placeholder={t.aiPlaceholder}
            disabled={streaming}
            className="text-sm"
          />
          {streaming ? (
            <Button variant="outline" size="icon" onClick={handleStop} className="shrink-0">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim()}
              className="shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

