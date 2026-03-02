"use client";

import { Database, Trash2, Upload } from "lucide-react";
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

        <div className="space-y-4">
          {/* Upload button */}
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <Upload className="w-4 h-4 mr-1" />
              {uploading ? t.ragDialog.uploading : t.ragDialog.upload}
            </Button>
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
          </div>

          {/* Document list */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">{t.ragDialog.noDocuments}</p>
              <p className="text-xs mt-1">{t.ragDialog.noDocumentsHint}</p>
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
