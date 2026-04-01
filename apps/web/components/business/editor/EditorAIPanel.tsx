"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import ProofreadReview, { type ProofreadItem } from "./ProofreadReview";

type EditorAction =
  | "proofread"
  | "rewrite"
  | "to-markdown"
  | "summarize"
  | "continue"
  | "proofread-all"
  | "summarize-all"
  | "suggest-structure"
  | "freeform";

// 選択範囲に対するアクション（インラインDiff表示対象）
const INLINE_DIFF_ACTIONS = new Set<string>([
  "proofread",
  "rewrite",
  "to-markdown",
]);

interface AIRequest {
  action: string;
  selectedText?: string;
  selectionRange?: { from: number; to: number };
}

interface InlineSuggestion {
  from: number;
  to: number;
  original: string;
  suggested: string;
}

interface EditorAIPanelProps {
  expanded: boolean;
  onToggle: () => void;
  content: string;
  onReplaceRange: (from: number, to: number, text: string) => void;
  onShowSuggestion: (suggestion: InlineSuggestion) => void;
  pendingRequest: AIRequest | null;
  onRequestHandled: () => void;
}

export default function EditorAIPanel({
  expanded,
  onToggle,
  content,
  onReplaceRange,
  onShowSuggestion,
  pendingRequest,
  onRequestHandled,
}: EditorAIPanelProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<AIRequest | null>(null);
  const [proofreadItems, setProofreadItems] = useState<ProofreadItem[] | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pendingRequest) {
      executeRequest(pendingRequest);
      onRequestHandled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRequest]);

  useEffect(() => {
    if (expanded && !streaming && !result && !proofreadItems) {
      inputRef.current?.focus();
    }
  }, [expanded, streaming, result, proofreadItems]);

  const executeRequest = useCallback(
    async (req: AIRequest) => {
      if (streaming) {
        abortRef.current?.abort();
      }

      setLastRequest(req);
      setResult("");
      setError(null);
      setProofreadItems(null);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch("/api/editor/ai-assist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: req.action,
            selectedText: req.selectedText,
            documentContent: content,
            userMessage: req.action === "freeform" ? input : undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "AIリクエストに失敗しました");
          setStreaming(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setError("レスポンスの読み取りに失敗しました");
          setStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let accumulated = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                accumulated += data.content;
                setResult(accumulated);
              }
              if (data.error) {
                setError(data.error);
              }
            } catch {
              // ignore parse errors
            }
          }
        }

        // ストリーミング完了後の処理
        if (req.action === "proofread-all" && accumulated) {
          const items = parseProofreadResult(accumulated);
          if (items) {
            setProofreadItems(items);
            setResult("");
          } else {
            setError("校正結果の解析に失敗しました。もう一度お試しください。");
            setResult("");
          }
        } else if (
          INLINE_DIFF_ACTIONS.has(req.action) &&
          req.selectionRange &&
          accumulated
        ) {
          // 選択範囲アクション → インラインDiffとして表示
          onShowSuggestion({
            from: req.selectionRange.from,
            to: req.selectionRange.to,
            original: req.selectedText || "",
            suggested: accumulated,
          });
          setResult("");
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // cancelled
        } else {
          setError("AIリクエストに失敗しました");
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [content, input, streaming, onShowSuggestion],
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!input.trim() || streaming) return;
      executeRequest({ action: "freeform" });
      setInput("");
    },
    [input, streaming, executeRequest],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  }, [result]);

  const handleClear = useCallback(() => {
    setResult("");
    setError(null);
    setLastRequest(null);
    setProofreadItems(null);
    proofreadSnapshotRef.current = null;
  }, []);

  // 校正レビューで最初の「修正する」を押した時にスナップショットを保存
  const proofreadSnapshotRef = useRef<string | null>(null);

  const handleProofreadApply = useCallback(
    (original: string, corrected: string) => {
      if (!proofreadSnapshotRef.current) {
        proofreadSnapshotRef.current = content;
      }
      const idx = content.indexOf(original);
      if (idx === -1) return;
      onReplaceRange(idx, idx + original.length, corrected);
    },
    [content, onReplaceRange],
  );

  // 結果表示中にオートスクロール
  useEffect(() => {
    if (resultRef.current && streaming) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result, streaming]);

  if (!expanded) return null;

  // 校正レビューモード
  if (proofreadItems !== null) {
    return (
      <div className="editor-ai-panel">
        <ProofreadReview
          items={proofreadItems}
          content={content}
          onApply={handleProofreadApply}
          onClose={handleClear}
        />
      </div>
    );
  }

  return (
    <div className="editor-ai-panel">
      {/* 結果表示エリア（要約・構成提案・フリーフォームなど閲覧系のみ） */}
      {(result || error || streaming) && (
        <div className="editor-ai-result" ref={resultRef}>
          {error ? (
            <div className="editor-ai-error">{error}</div>
          ) : (
            <pre className="editor-ai-result-text">{result}{streaming && <span className="editor-ai-cursor" />}</pre>
          )}
        </div>
      )}

      {/* アクションボタン（コピーとクリアのみ。置換ボタンなし） */}
      {result && !streaming && (
        <div className="editor-ai-actions">
          <button
            type="button"
            className="editor-ai-action-btn"
            onClick={handleCopy}
          >
            コピー
          </button>
          <button
            type="button"
            className="editor-ai-action-btn"
            onClick={handleClear}
          >
            クリア
          </button>
        </div>
      )}

      {/* 入力エリア */}
      <form className="editor-ai-input-row" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          className="editor-ai-input"
          placeholder="AIに質問...（例: この文章を箇条書きにして）"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
        />
        {streaming ? (
          <button
            type="button"
            className="editor-ai-send-btn editor-ai-stop-btn"
            onClick={handleStop}
          >
            停止
          </button>
        ) : (
          <button
            type="submit"
            className="editor-ai-send-btn"
            disabled={!input.trim()}
          >
            送信
          </button>
        )}
      </form>
    </div>
  );
}

function parseProofreadResult(text: string): ProofreadItem[] | null {
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed) && parsed.every(isProofreadItem)) {
      return parsed;
    }
  } catch {
    // fall through
  }

  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    const jsonStr = text.slice(start, end + 1);
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.every(isProofreadItem)) {
      return parsed;
    }
  } catch {
    // parse failed
  }

  return null;
}

function isProofreadItem(item: unknown): item is ProofreadItem {
  if (!item || typeof item !== "object") return false;
  const obj = item as Record<string, unknown>;
  return (
    typeof obj.original === "string" &&
    typeof obj.corrected === "string" &&
    typeof obj.reason === "string"
  );
}
