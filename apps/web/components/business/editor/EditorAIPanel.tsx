"use client";

import { useState, useRef, useCallback, useEffect } from "react";

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

interface AIRequest {
  action: EditorAction;
  selectedText?: string;
  selectionRange?: { from: number; to: number };
}

interface EditorAIPanelProps {
  expanded: boolean;
  onToggle: () => void;
  content: string;
  onReplaceAll: (text: string) => void;
  onReplaceRange: (from: number, to: number, text: string) => void;
  pendingRequest: AIRequest | null;
  onRequestHandled: () => void;
}

export default function EditorAIPanel({
  expanded,
  onToggle,
  content,
  onReplaceAll,
  onReplaceRange,
  pendingRequest,
  onRequestHandled,
}: EditorAIPanelProps) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<AIRequest | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 外部からのリクエスト（選択アクション、ツールバーメニュー）を処理
  useEffect(() => {
    if (pendingRequest) {
      executeRequest(pendingRequest);
      onRequestHandled();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRequest]);

  // パネル展開時に入力にフォーカス
  useEffect(() => {
    if (expanded && !streaming && !result) {
      inputRef.current?.focus();
    }
  }, [expanded, streaming, result]);

  const executeRequest = useCallback(
    async (req: AIRequest) => {
      if (streaming) {
        abortRef.current?.abort();
      }

      setLastRequest(req);
      setResult("");
      setError(null);
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
              if (data.done) {
                // streaming complete
              }
            } catch {
              // ignore parse errors
            }
          }
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
    [content, input, streaming],
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

  const handleReplace = useCallback(() => {
    if (!result) return;
    if (
      lastRequest?.selectionRange &&
      lastRequest.action !== "proofread-all" &&
      lastRequest.action !== "summarize-all" &&
      lastRequest.action !== "suggest-structure" &&
      lastRequest.action !== "freeform"
    ) {
      onReplaceRange(
        lastRequest.selectionRange.from,
        lastRequest.selectionRange.to,
        result,
      );
    } else {
      onReplaceAll(result);
    }
    setResult("");
    setLastRequest(null);
  }, [result, lastRequest, onReplaceAll, onReplaceRange]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  }, [result]);

  const handleClear = useCallback(() => {
    setResult("");
    setError(null);
    setLastRequest(null);
  }, []);

  // 結果表示中にオートスクロール
  useEffect(() => {
    if (resultRef.current && streaming) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result, streaming]);

  if (!expanded) return null;

  const isSelectionAction =
    lastRequest?.selectionRange &&
    lastRequest.action !== "proofread-all" &&
    lastRequest.action !== "summarize-all" &&
    lastRequest.action !== "suggest-structure" &&
    lastRequest.action !== "freeform";

  return (
    <div className="editor-ai-panel">
      {/* 結果表示エリア */}
      {(result || error || streaming) && (
        <div className="editor-ai-result" ref={resultRef}>
          {error ? (
            <div className="editor-ai-error">{error}</div>
          ) : (
            <pre className="editor-ai-result-text">{result}{streaming && <span className="editor-ai-cursor" />}</pre>
          )}
        </div>
      )}

      {/* アクションボタン */}
      {result && !streaming && (
        <div className="editor-ai-actions">
          <button
            type="button"
            className="editor-ai-action-btn editor-ai-action-primary"
            onClick={handleReplace}
          >
            {isSelectionAction ? "選択範囲を置換" : "全体を置換"}
          </button>
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
