"use client";

import { BookOpen, ChevronDown, ChevronRight, ClipboardPaste, Database, FileText, Loader2, Scissors, Search, Trash2, Upload, Waypoints } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { aiChatTranslations } from "../translations";

interface RagDocument {
  filename: string;
  file_type: string;
  chunk_count: number;
  upload_timestamp: string;
  total_chars: number;
  user_id: string;
}

interface ChunkData {
  chunk_index: number;
  content: string;
  char_count: number;
}

interface RagDocumentManagerProps {
  language: "en" | "ja";
  onDocumentCountChange?: (count: number) => void;
}

function formatFileSize(chars: number): string {
  if (chars < 1024) return `${chars} chars`;
  if (chars < 1024 * 1024) return `${(chars / 1024).toFixed(1)}K chars`;
  return `${(chars / (1024 * 1024)).toFixed(1)}M chars`;
}

// --- Browse Tab Component ---
function BrowseTab({
  documents,
  loading,
  language,
}: {
  documents: RagDocument[];
  loading: boolean;
  language: "en" | "ja";
}) {
  const t = aiChatTranslations[language];
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ChunkData[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  const fetchChunks = useCallback(async (filename: string) => {
    try {
      setLoadingChunks(true);
      const response = await fetch(
        `/api/ai/rag-documents/content/${encodeURIComponent(filename)}`,
      );
      if (!response.ok) {
        setChunks([]);
        return;
      }
      const data = await response.json();
      setChunks(data.chunks || []);
    } catch {
      setChunks([]);
    } finally {
      setLoadingChunks(false);
    }
  }, []);

  const toggleDoc = useCallback(
    (filename: string) => {
      if (expandedDoc === filename) {
        setExpandedDoc(null);
        setChunks([]);
      } else {
        setExpandedDoc(filename);
        fetchChunks(filename);
      }
    },
    [expandedDoc, fetchChunks],
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">{t.ragDialog.noDocuments}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pipeline diagram */}
      <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {t.ragDialog.pipelineTitle}
        </p>
        <div className="flex items-center gap-1 text-xs">
          <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
            <FileText className="w-3 h-3" />
            {t.ragDialog.pipelineStep1}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="flex items-center gap-1 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-1 rounded">
            <Scissors className="w-3 h-3" />
            {t.ragDialog.pipelineStep2}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded">
            <Waypoints className="w-3 h-3" />
            {t.ragDialog.pipelineStep3}
          </span>
          <span className="text-muted-foreground">→</span>
          <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-1 rounded">
            <Search className="w-3 h-3" />
            {t.ragDialog.pipelineStep4}
          </span>
        </div>
      </div>

      {/* Document list with expandable chunks */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {documents.map((doc) => {
          const isExpanded = expandedDoc === doc.filename;
          const isShared = doc.user_id === "shared";
          return (
            <div key={`${doc.user_id}:${doc.filename}`}>
              {/* Document header - clickable */}
              <button
                type="button"
                onClick={() => toggleDoc(doc.filename)}
                className="w-full p-2.5 bg-muted rounded-lg flex items-center gap-2.5 hover:bg-muted/80 transition-colors text-left"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
                <div className="w-7 h-7 rounded bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                  <Database className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm truncate">
                      {doc.filename}
                    </span>
                    {isShared && (
                      <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
                        {t.ragDialog.sharedBadge}
                      </Badge>
                    )}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {doc.chunk_count} {t.ragDialog.chunkLabel} / {formatFileSize(doc.total_chars)}
                  </div>
                </div>
              </button>

              {/* Expanded chunk view */}
              {isExpanded && (
                <div className="ml-6 mt-1.5 space-y-0">
                  {loadingChunks ? (
                    <div className="flex items-center gap-2 py-4 justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {t.ragDialog.loadingChunks}
                      </span>
                    </div>
                  ) : chunks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-4 text-center">
                      {t.ragDialog.noChunks}
                    </p>
                  ) : (
                    <>
                      {chunks.map((chunk, idx) => (
                        <div key={chunk.chunk_index}>
                          {/* Overlap connector */}
                          {idx > 0 && (
                            <div className="flex items-center gap-1.5 py-1 pl-2">
                              <div className="w-px h-3 bg-orange-300 dark:bg-orange-700" />
                              <span className="text-[10px] text-orange-500 dark:text-orange-400">
                                ↕ 128 {t.ragDialog.overlapLabel}
                              </span>
                            </div>
                          )}
                          {/* Chunk card */}
                          <div className="border border-border/60 rounded-md p-2.5 bg-background">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[11px] font-medium text-muted-foreground">
                                {t.ragDialog.chunkLabel} {chunk.chunk_index + 1}/{chunks.length}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {chunk.char_count.toLocaleString()} {t.ragDialog.chunkChars}
                              </span>
                            </div>
                            <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-words max-h-[120px] overflow-y-auto font-mono leading-relaxed">
                              {chunk.content}
                            </pre>
                          </div>
                        </div>
                      ))}

                      {/* Learning hint */}
                      <div className="flex items-start gap-2 mt-2 p-2 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200/50 dark:border-blue-800/30">
                        <span className="text-sm leading-none mt-0.5">💡</span>
                        <p className="text-[11px] text-blue-700 dark:text-blue-300 leading-relaxed">
                          {t.ragDialog.browseHint}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Select hint when nothing expanded */}
      {!expandedDoc && (
        <p className="text-xs text-muted-foreground text-center">
          {t.ragDialog.selectDocument}
        </p>
      )}
    </div>
  );
}

// --- Manage Tab Component (existing content) ---
function ManageTab({
  documents,
  loading,
  language,
  onUpload,
  onDelete,
  uploading,
  deleting,
  onTextSubmit,
  pasteFilename,
  setPasteFilename,
  pasteText,
  setPasteText,
  submittingText,
  fileInputRef,
}: {
  documents: RagDocument[];
  loading: boolean;
  language: "en" | "ja";
  onUpload: (file: File) => void;
  onDelete: (filename: string) => void;
  uploading: boolean;
  deleting: string | null;
  onTextSubmit: () => void;
  pasteFilename: string;
  setPasteFilename: (v: string) => void;
  pasteText: string;
  setPasteText: (v: string) => void;
  submittingText: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const t = aiChatTranslations[language];
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        if (!file.name.toLowerCase().endsWith(".md") && !file.name.toLowerCase().endsWith(".markdown")) {
          alert(t.ragDialog.invalidFileType);
          return;
        }
        onUpload(file);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, onUpload],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const compact = documents.length > 0;

  return (
    <div className="space-y-4">
      {/* Upload zones side-by-side */}
      <div className="grid grid-cols-2 gap-3">
        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg text-center transition-colors flex flex-col items-center justify-center ${
            compact ? "p-4" : "p-6"
          } ${uploading ? "pointer-events-none opacity-70" : "cursor-pointer"} ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/50"
          }`}
        >
          {uploading ? (
            <Loader2 className={`text-primary animate-spin mb-2 ${compact ? "w-5 h-5" : "w-7 h-7"}`} />
          ) : (
            <Upload className={`text-muted-foreground/50 mb-2 ${compact ? "w-5 h-5" : "w-7 h-7"}`} />
          )}
          <p className={`font-medium text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
            {uploading
              ? t.ragDialog.uploading
              : isDragOver
                ? t.ragDialog.dropActive
                : t.ragDialog.noDocumentsHint}
          </p>
          {!uploading && (
            <p className={`text-muted-foreground/70 mt-1 ${compact ? "text-[10px]" : "text-xs"}`}>
              {t.ragDialog.dropHere}
            </p>
          )}
        </div>

        {/* Paste zone */}
        <div className={`border-2 border-dashed border-border rounded-lg ${compact ? "p-3" : "p-4"} flex flex-col`}>
          <div className="flex items-center gap-1.5 mb-2">
            <ClipboardPaste className={`text-muted-foreground/50 ${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
            <span className={`font-medium text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
              {t.ragDialog.pasteText}
            </span>
          </div>
          <Input
            value={pasteFilename}
            onChange={(e) => setPasteFilename(e.target.value)}
            placeholder={t.ragDialog.filenameLabel}
            className={`mb-2 ${compact ? "h-7 text-xs" : "h-8 text-sm"}`}
          />
          <Textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={t.ragDialog.textPlaceholder}
            className={`flex-1 min-h-0 resize-none ${compact ? "text-xs" : "text-sm"}`}
            rows={compact ? 2 : 3}
          />
          <Button
            size="sm"
            className="mt-2 self-end"
            onClick={onTextSubmit}
            disabled={!pasteFilename.trim() || !pasteText.trim() || submittingText}
          >
            {submittingText && (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            )}
            {submittingText ? t.ragDialog.uploading : t.ragDialog.submit}
          </Button>
        </div>
      </div>

      {/* Document list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-2">
          <p className="text-xs text-muted-foreground">
            {t.ragDialog.noDocuments}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {documents.map((doc) => (
            <div
              key={`${doc.user_id}:${doc.filename}`}
              className="p-3 bg-muted rounded-lg flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0">
                <Database className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-medium text-sm truncate">
                    {doc.filename}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    {doc.file_type}
                  </Badge>
                  {doc.user_id === "shared" && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
                      {t.ragDialog.sharedBadge}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground space-x-2">
                  <span>
                    {doc.chunk_count} {t.ragDialog.chunks}
                  </span>
                  <span>{formatFileSize(doc.total_chars)}</span>
                </div>
              </div>

              {doc.user_id !== "shared" && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(doc.filename)}
                  disabled={deleting === doc.filename}
                  className="text-destructive hover:text-destructive flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main Component (FloatingWindow content) ---
export function RagDocumentManager({
  language,
  onDocumentCountChange,
}: RagDocumentManagerProps) {
  const t = aiChatTranslations[language];
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [pasteFilename, setPasteFilename] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [submittingText, setSubmittingText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/ai/rag-documents");
      if (!response.ok) return;

      const data = await response.json();
      const docs = data.documents || [];
      setDocuments(docs);
      onDocumentCountChange?.(docs.length);
    } catch {
      // silent fail
    } finally {
      setLoading(false);
    }
  }, [onDocumentCountChange]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".md") && !file.name.toLowerCase().endsWith(".markdown")) {
      alert(t.ragDialog.invalidFileType);
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/ai/rag-documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      await fetchDocuments();
    } catch {
      alert(t.ragDialog.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleTextSubmit = async () => {
    if (!pasteFilename.trim() || !pasteText.trim()) return;

    try {
      setSubmittingText(true);
      const response = await fetch("/api/ai/rag-documents/upload-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: pasteFilename.trim(),
          text: pasteText,
        }),
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      setPasteFilename("");
      setPasteText("");
      await fetchDocuments();
    } catch {
      alert(t.ragDialog.uploadError);
    } finally {
      setSubmittingText(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(t.ragDialog.deleteConfirm)) return;

    try {
      setDeleting(filename);
      const response = await fetch(
        `/api/ai/rag-documents/${encodeURIComponent(filename)}`,
        { method: "DELETE" },
      );

      if (response.ok) {
        await fetchDocuments();
      }
    } catch {
      alert(t.ragDialog.deleteError);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="flex flex-col h-full -m-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
          e.target.value = "";
        }}
      />

      <Tabs defaultValue="manage" className="flex flex-col h-full">
        <TabsList className="w-full shrink-0 mx-4 mt-2" style={{ width: "calc(100% - 2rem)" }}>
          <TabsTrigger value="manage" className="flex-1">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            {t.ragDialog.manageTab}
          </TabsTrigger>
          <TabsTrigger value="browse" className="flex-1">
            <BookOpen className="w-3.5 h-3.5 mr-1.5" />
            {t.ragDialog.browseTab}
          </TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <TabsContent value="manage" className="mt-3">
            <ManageTab
              documents={documents}
              loading={loading}
              language={language}
              onUpload={handleUpload}
              onDelete={handleDelete}
              uploading={uploading}
              deleting={deleting}
              onTextSubmit={handleTextSubmit}
              pasteFilename={pasteFilename}
              setPasteFilename={setPasteFilename}
              pasteText={pasteText}
              setPasteText={setPasteText}
              submittingText={submittingText}
              fileInputRef={fileInputRef}
            />
          </TabsContent>

          <TabsContent value="browse" className="mt-3">
            <BrowseTab
              documents={documents}
              loading={loading}
              language={language}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
