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

// ─── Types ───

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CampaignStats {
  total: number;
  notBooked: number;
  booked: number;
  completed: number;
  exempt: number;
  completionRate: number;
}

interface DepartmentStat {
  departmentName: string;
  total: number;
  notBooked: number;
  booked: number;
  completed: number;
}

interface Props {
  campaignTitle: string;
  stats: CampaignStats | null;
  departments: DepartmentStat[];
}

// ─── Preset prompts ───

const PRESETS = [
  { label: "予約状況の分析", prompt: "健康診断の予約状況を分析して、注目すべき傾向や改善ポイントを教えてください。" },
  { label: "未予約者への催促メール", prompt: "まだ健康診断を予約していない社員に送る催促メール文を作成してください。丁寧かつ簡潔に、早期予約の重要性を伝える内容でお願いします。" },
  { label: "経営報告用サマリー", prompt: "現在の健康診断予約状況を、経営層に報告するための簡潔なサマリーにまとめてください。" },
  { label: "部署別の改善提案", prompt: "部署別の予約率を比較して、予約率が低い部署への具体的な改善提案をしてください。" },
];

// ─── Component ───

export function HealthCheckupAIAnalysis({ campaignTitle, stats, departments }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  const buildSystemPrompt = useCallback(() => {
    if (!stats) return "";

    let prompt = `あなたは社員健康管理の分析アシスタントです。以下の健康診断キャンペーンデータに基づいて質問に回答してください。日本語で回答してください。

## キャンペーン: ${campaignTitle}

## 全体状況
- 対象社員: ${stats.total}名
- 予約済: ${stats.booked}名
- 受診済: ${stats.completed}名
- 未予約: ${stats.notBooked}名
- 対象外: ${stats.exempt}名
- 進捗率: ${stats.completionRate}%

## 部署別状況
`;
    for (const d of departments) {
      const rate = d.total > 0 ? Math.round(((d.booked + d.completed) / d.total) * 100) : 0;
      prompt += `- ${d.departmentName}: 対象${d.total}名 / 予約済${d.booked}名 / 受診済${d.completed}名 / 未予約${d.notBooked}名 (${rate}%)\n`;
    }

    return prompt;
  }, [campaignTitle, stats, departments]);

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
          toast.error("AI分析中にエラーが発生しました");
          setMessages((prev) => prev.slice(0, -1));
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [messages, streaming, buildSystemPrompt],
  );

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AI分析
          </CardTitle>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 h-7 text-xs">
              <RotateCcw className="h-3 w-3" />
              リセット
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 min-h-0 overflow-y-auto pr-1 mb-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground mb-1">
                健康診断データをAIが分析します。質問を入力するか、プリセットを選択してください。
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
            placeholder="データについて質問..."
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
