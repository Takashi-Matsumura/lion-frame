"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  Clock,
  Eye,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { pageGuideTranslations } from "./page-guide-translations";

import remarkGfm from "remark-gfm";

const ReactMarkdown = dynamic(() => import("react-markdown"), { ssr: false });

const markdownComponents = {
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
    >
      {children}
    </a>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const isInline = !className;
    return isInline ? (
      <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    ) : (
      <code className={className}>{children}</code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="bg-muted p-3 rounded-lg overflow-x-auto">{children}</pre>
  ),
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto my-2">
      <table className="w-full text-sm border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-muted/50">{children}</thead>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="border border-border px-3 py-1.5 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="border border-border px-3 py-1.5">{children}</td>
  ),
};

const PAGE_GUIDE_WIDTH_KEY = "page-guide-width";
const DEFAULT_PANEL_WIDTH = 448;
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 800;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface RevisionItem {
  id: string;
  content: string;
  version: number;
  editedBy: string | null;
  editedByName: string | null;
  createdAt: string;
}

type ViewMode = "view" | "edit" | "history";

interface PageGuideSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pathname: string;
  pageTitle: string;
  language: "en" | "ja";
}

export function PageGuideSheet({
  open,
  onOpenChange,
  pathname,
  pageTitle,
  language,
}: PageGuideSheetProps) {
  const t = pageGuideTranslations[language];

  const [guideContent, setGuideContent] = useState("");
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [guideVersion, setGuideVersion] = useState(1);
  const [guideEditedBy, setGuideEditedBy] = useState<string | null>(null);
  const [guideEditedByName, setGuideEditedByName] = useState<string | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);

  // モード管理
  const [viewMode, setViewMode] = useState<ViewMode>("view");

  // 編集モード
  const [editContent, setEditContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 履歴モード
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(false);
  const [selectedRevision, setSelectedRevision] =
    useState<RevisionItem | null>(null);
  const [selectedRevisionContent, setSelectedRevisionContent] = useState("");
  const [isReverting, setIsReverting] = useState(false);

  // ミニチャット
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [chatStreamingContent, setChatStreamingContent] = useState("");

  // パネル幅リサイズ
  const [panelWidth, setPanelWidth] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_PANEL_WIDTH;
    const saved = localStorage.getItem(PAGE_GUIDE_WIDTH_KEY);
    if (saved) {
      const w = parseInt(saved, 10);
      if (w >= MIN_PANEL_WIDTH && w <= MAX_PANEL_WIDTH) return w;
    }
    return DEFAULT_PANEL_WIDTH;
  });
  const panelWidthRef = useRef(panelWidth);
  const [isResizing, setIsResizing] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // パスが変わったらリセット
  useEffect(() => {
    setGuideContent("");
    setGeneratedAt(null);
    setGuideVersion(1);
    setGuideEditedBy(null);
    setGuideEditedByName(null);
    setChatMessages([]);
    setChatStreamingContent("");
    setAiUnavailable(false);
    setViewMode("view");
    setRevisions([]);
    setSelectedRevision(null);
  }, [pathname]);

  const fetchCachedGuide = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/page-guide?path=${encodeURIComponent(pathname)}&language=${language}`,
      );
      if (res.ok) {
        const data = await res.json();
        setGuideContent(data.content);
        setGeneratedAt(data.generatedAt);
        setGuideVersion(data.version || 1);
        setGuideEditedBy(data.editedBy || null);
        setGuideEditedByName(data.editedByName || null);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [pathname, language]);

  const streamGenerate = useCallback(async () => {
    setIsStreaming(true);
    setGuideContent("");
    setGeneratedAt(null);

    abortControllerRef.current = new AbortController();

    try {
      const res = await fetch("/api/page-guide/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, language }),
        signal: abortControllerRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "AI is not enabled") {
          setAiUnavailable(true);
          return;
        }
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

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
              setGuideContent(fullContent);
            }
            if (parsed.done) {
              setGeneratedAt(new Date().toISOString());
              // ストリーム完了後に最新データを取得してversion等を同期
              fetchCachedGuide();
            }
            if (parsed.error) {
              console.error("Stream error:", parsed.error);
            }
          } catch {
            // パースエラー無視
          }
        }
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("Failed to generate guide:", error);
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [pathname, language, fetchCachedGuide]);

  // シートが開いた時にガイドを取得/生成
  useEffect(() => {
    if (!open) {
      abortControllerRef.current?.abort();
      return;
    }

    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      const hasCached = await fetchCachedGuide();
      if (!cancelled && !hasCached) {
        await streamGenerate();
      }
      if (!cancelled) {
        setIsLoading(false);
      }
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [open, fetchCachedGuide, streamGenerate]);

  // チャットメッセージ追加時にスクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatStreamingContent]);

  // === 編集操作 ===
  const handleStartEdit = () => {
    setEditContent(guideContent);
    setShowPreview(false);
    setViewMode("edit");
  };

  const handleCancelEdit = () => {
    setViewMode("view");
    setEditContent("");
  };

  const handleSave = async () => {
    if (!editContent.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/page-guide", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: pathname,
          language,
          content: editContent,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const data = await res.json();
      setGuideContent(data.content);
      setGuideVersion(data.version);
      setGuideEditedBy(data.editedBy);
      setGuideEditedByName(data.editedByName);
      setViewMode("view");
      setEditContent("");
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // === 履歴操作 ===
  const handleOpenHistory = async () => {
    setViewMode("history");
    setSelectedRevision(null);
    setSelectedRevisionContent("");
    setIsLoadingRevisions(true);
    try {
      const res = await fetch(
        `/api/page-guide/revisions?path=${encodeURIComponent(pathname)}&language=${language}`,
      );
      if (res.ok) {
        const data = await res.json();
        setRevisions(data.revisions || []);
      }
    } catch (error) {
      console.error("Failed to fetch revisions:", error);
    } finally {
      setIsLoadingRevisions(false);
    }
  };

  const handleSelectRevision = (rev: RevisionItem) => {
    setSelectedRevision(rev);
    setSelectedRevisionContent(rev.content);
  };

  const handleRevert = async (revisionId: string) => {
    if (!confirm(t.revertConfirm)) return;
    setIsReverting(true);
    try {
      const res = await fetch(
        `/api/page-guide/revisions/${revisionId}/revert`,
        { method: "POST" },
      );

      if (!res.ok) throw new Error("Failed to revert");

      const data = await res.json();
      setGuideContent(data.content);
      setGuideVersion(data.version);
      setGuideEditedBy(data.editedBy);
      setGuideEditedByName(data.editedByName);
      setViewMode("view");
    } catch (error) {
      console.error("Revert error:", error);
    } finally {
      setIsReverting(false);
    }
  };

  // === 再生成（リビジョン対応） ===
  const handleRegenerate = async () => {
    // 手動編集がある場合は確認ダイアログ
    if (guideEditedBy) {
      if (!confirm(t.regenerateWarning)) return;
    }
    await streamGenerate();
  };

  const handleChatSend = async () => {
    const message = chatInput.trim();
    if (!message || isChatStreaming) return;

    setChatInput("");
    const newMessages: ChatMessage[] = [
      ...chatMessages,
      { role: "user", content: message },
    ];
    setChatMessages(newMessages);
    setIsChatStreaming(true);
    setChatStreamingContent("");

    try {
      const systemPrompt =
        language === "ja"
          ? `あなたはLionFrameの「${pageTitle}」ページ（${pathname}）に関する質問に答えるアシスタントです。以下はこのページのガイドです:\n\n${guideContent}\n\nユーザーの質問に簡潔に答えてください。`
          : `You are an assistant answering questions about the "${pageTitle}" page (${pathname}) in LionFrame. Here is the page guide:\n\n${guideContent}\n\nAnswer the user's question concisely.`;

      const res = await fetch("/api/ai/chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          systemPrompt,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");

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
              setChatStreamingContent(fullContent);
            }
            if (parsed.done) {
              setChatMessages((prev) => [
                ...prev,
                { role: "assistant", content: fullContent },
              ]);
              setChatStreamingContent("");
            }
          } catch {
            // パースエラー無視
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            language === "ja"
              ? "エラーが発生しました。"
              : "An error occurred.",
        },
      ]);
    } finally {
      setIsChatStreaming(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString(language === "ja" ? "ja-JP" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // パネル幅リサイズハンドル
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (ev: MouseEvent) => {
      const newWidth = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, window.innerWidth - ev.clientX),
      );
      panelWidthRef.current = newWidth;
      setPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      localStorage.setItem(
        PAGE_GUIDE_WIDTH_KEY,
        String(panelWidthRef.current),
      );
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

  // === レンダリング ===
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md flex flex-col p-0"
        style={{ width: `${panelWidth}px`, maxWidth: `${panelWidth}px` }}
      >
        {/* リサイズハンドル */}
        <div
          className="group/resize absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-10"
          onMouseDown={handleResizeStart}
          onDoubleClick={() => {
            setPanelWidth(DEFAULT_PANEL_WIDTH);
            panelWidthRef.current = DEFAULT_PANEL_WIDTH;
            localStorage.setItem(
              PAGE_GUIDE_WIDTH_KEY,
              String(DEFAULT_PANEL_WIDTH),
            );
          }}
        >
          <div
            className={`w-0.5 h-full mx-auto bg-primary transition-opacity duration-200 ${
              isResizing
                ? "opacity-100"
                : "opacity-0 group-hover/resize:opacity-100"
            }`}
          />
        </div>
        {/* ヘッダー */}
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-border">
          <SheetTitle className="text-base">
            {viewMode === "edit"
              ? `${t.title}（${t.editMode}）`
              : viewMode === "history"
                ? `${t.title}（${t.history}）`
                : t.title}
          </SheetTitle>
          <SheetDescription>{pageTitle}</SheetDescription>

          {/* ツールバー */}
          {viewMode === "view" && guideContent && !isStreaming && (
            <div className="flex items-center gap-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="h-7 text-xs gap-1"
              >
                <Pencil className="h-3 w-3" />
                {t.edit}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleOpenHistory}
                className="h-7 text-xs gap-1"
              >
                <Clock className="h-3 w-3" />
                {t.history}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                className="h-7 text-xs gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                {t.regenerate}
              </Button>
            </div>
          )}

          {viewMode === "edit" && (
            <div className="flex items-center gap-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="h-7 text-xs gap-1"
              >
                <Eye className="h-3 w-3" />
                {t.preview}
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEdit}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3 w-3" />
                {t.cancel}
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || !editContent.trim()}
                className="h-7 text-xs gap-1"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : null}
                {isSaving ? t.saving : t.save}
              </Button>
            </div>
          )}

          {viewMode === "history" && (
            <div className="flex items-center gap-1 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setViewMode("view");
                  setSelectedRevision(null);
                }}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3 w-3" />
                {t.cancel}
              </Button>
            </div>
          )}
        </SheetHeader>

        {/* コンテンツエリア */}
        <div ref={contentRef} className="flex-1 overflow-y-auto px-4 py-3">
          {/* === 閲覧モード === */}
          {viewMode === "view" && (
            <>
              {aiUnavailable ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm text-center">
                  {t.aiUnavailable}
                </div>
              ) : isLoading && !guideContent && !isStreaming ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : guideContent ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {guideContent}
                  </ReactMarkdown>
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-32 gap-3 text-muted-foreground">
                  <p className="text-sm">{t.noGuideYet}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={streamGenerate}
                    disabled={isStreaming}
                  >
                    {t.generateButton}
                  </Button>
                </div>
              )}

              {/* フッター情報 */}
              {guideContent && !isStreaming && (
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <span className="text-xs text-muted-foreground">
                    {guideEditedByName
                      ? `${t.editedBy}: ${guideEditedByName}`
                      : t.aiGenerated}{" "}
                    | {t.version}
                    {guideVersion}
                    {generatedAt && ` | ${formatDate(generatedAt)}`}
                  </span>
                </div>
              )}

              {/* ミニチャット履歴 */}
              {chatMessages.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border space-y-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t.chatTitle}
                  </p>
                  {chatMessages.map((msg, i) => (
                    <div
                      key={`chat-${i}-${msg.role}`}
                      className={`text-sm ${
                        msg.role === "user"
                          ? "text-right"
                          : "prose prose-sm dark:prose-invert max-w-none"
                      }`}
                    >
                      {msg.role === "user" ? (
                        <span className="inline-block bg-primary text-primary-foreground rounded-lg px-3 py-1.5 text-sm">
                          {msg.content}
                        </span>
                      ) : (
                        <div className="bg-muted rounded-lg px-3 py-2">
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                            {msg.content}
                          </ReactMarkdown>
                        </div>
                      )}
                    </div>
                  ))}
                  {chatStreamingContent && (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <div className="bg-muted rounded-lg px-3 py-2">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {chatStreamingContent}
                        </ReactMarkdown>
                        <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}
            </>
          )}

          {/* === 編集モード === */}
          {viewMode === "edit" && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{t.markdownHelp}</p>
              {showPreview ? (
                <div className="prose prose-sm dark:prose-invert max-w-none min-h-[200px] rounded-md border border-input bg-background p-3">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {editContent}
                  </ReactMarkdown>
                </div>
              ) : (
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full min-h-[400px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  placeholder="Markdown..."
                />
              )}
            </div>
          )}

          {/* === 履歴モード === */}
          {viewMode === "history" && (
            <div className="space-y-2">
              {isLoadingRevisions ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : revisions.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  {t.noRevisions}
                </div>
              ) : (
                <div className="space-y-1">
                  {revisions.map((rev) => (
                    <div
                      key={rev.id}
                      className={`p-2 rounded-md border text-sm cursor-pointer transition-colors ${
                        selectedRevision?.id === rev.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:bg-muted/50"
                      }`}
                      onClick={() => handleSelectRevision(rev)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">
                            {t.version}
                            {rev.version}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {rev.editedByName || t.aiGenerated} -{" "}
                            {formatDate(rev.createdAt)}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRevert(rev.id);
                          }}
                          disabled={isReverting}
                          className="h-7 text-xs gap-1 shrink-0"
                        >
                          {isReverting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3 w-3" />
                          )}
                          {t.revertTo}
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* 選択リビジョンのプレビュー */}
                  {selectedRevision && selectedRevisionContent && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {t.version}
                        {selectedRevision.version} {t.preview}
                      </p>
                      <div className="prose prose-sm dark:prose-invert max-w-none rounded-md border border-input bg-background p-3 max-h-[300px] overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                          {selectedRevisionContent}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ミニチャット入力（閲覧モードのみ） */}
        {viewMode === "view" && guideContent && !aiUnavailable && (
          <div className="border-t border-border p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleChatSend();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={t.askPlaceholder}
                disabled={isChatStreaming}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!chatInput.trim() || isChatStreaming}
                className="h-9 w-9 shrink-0"
              >
                {isChatStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
