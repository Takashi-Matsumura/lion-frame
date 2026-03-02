"use client";

import { ClipboardPaste, Database, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

interface RagDocumentManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "en" | "ja";
  onDocumentCountChange?: (count: number) => void;
}

function formatFileSize(chars: number): string {
  if (chars < 1024) return `${chars} chars`;
  if (chars < 1024 * 1024) return `${(chars / 1024).toFixed(1)}K chars`;
  return `${(chars / (1024 * 1024)).toFixed(1)}M chars`;
}

export function RagDocumentManager({
  open,
  onOpenChange,
  language,
  onDocumentCountChange,
}: RagDocumentManagerProps) {
  const t = aiChatTranslations[language];
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
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
    if (open) {
      fetchDocuments();
    }
  }, [open, fetchDocuments]);

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
        handleUpload(file);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

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

  const compact = documents.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            {t.ragDialog.title}
          </DialogTitle>
          <DialogDescription>
            {t.ragDialog.description}
          </DialogDescription>
        </DialogHeader>

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
                onClick={handleTextSubmit}
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
                  key={doc.filename}
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
                    </div>
                    <div className="text-xs text-muted-foreground space-x-2">
                      <span>
                        {doc.chunk_count} {t.ragDialog.chunks}
                      </span>
                      <span>{formatFileSize(doc.total_chars)}</span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(doc.filename)}
                    disabled={deleting === doc.filename}
                    className="text-destructive hover:text-destructive flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
