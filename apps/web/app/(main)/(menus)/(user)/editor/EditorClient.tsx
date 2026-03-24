"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { toast } from "sonner";
import { Plus, Trash2, FileText, ExternalLink, Pencil, Check, X, PenTool, ChevronDown, Printer, Loader2, Hash, Search } from "lucide-react";
import { Button } from "@/components/ui";
import { Skeleton } from "@/components/ui/skeleton";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TagBadge } from "@/components/ui/tag-badge";
import { TagPicker } from "@/components/ui/tag-picker";
import { useFloatingWindowStore } from "@/lib/stores/floating-window-store";
import dynamic from "next/dynamic";
import { type DocType, DEFAULT_WINDOW_SIZE } from "@/components/business/editor/types";
import { editorTranslations, type Language } from "./translations";

const FloatingEditorContent = dynamic(
  () => import("@/components/business/editor/FloatingEditorContent"),
  { ssr: false },
);

interface SystemTagInfo {
  id: string;
  name: string;
  nameJa: string | null;
  color: string;
}

interface DocTags {
  systemTags: SystemTagInfo[];
  userTags: string[];
}

interface DocItem {
  id: string;
  title: string;
  type: DocType;
  updatedAt: string;
  createdAt: string;
  tags?: DocTags;
}

interface PdfTemplateInfo {
  id: string;
  name: string;
  isDefault: boolean;
}

const DOC_TYPE_ICON: Record<DocType, typeof FileText> = {
  markdown: FileText,
  excalidraw: PenTool,
};

const DOC_TYPE_LABEL: Record<string, string> = {
  markdown: "マークダウン",
  excalidraw: "ホワイトボード",
};

export function EditorClient({ language, pdfEnabled }: { language: Language; pdfEnabled: boolean }) {
  const t = editorTranslations[language];
  const floatingWindow = useFloatingWindowStore();

  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [allSystemTags, setAllSystemTags] = useState<SystemTagInfo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [pdfTemplates, setPdfTemplates] = useState<PdfTemplateInfo[]>([]);

  const loadDocuments = useCallback(async (tagId?: string | null) => {
    try {
      const params = new URLSearchParams();
      if (tagId) params.set("tagId", tagId);
      const res = await fetch(`/api/editor${params.toString() ? `?${params}` : ""}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDocuments(data.documents ?? []);
      return data.documents ?? [];
    } catch {
      toast.error(t.loadError);
      return [];
    }
  }, [t.loadError]);

  const loadSystemTags = useCallback(async () => {
    try {
      const res = await fetch("/api/tags");
      if (!res.ok) return;
      const data = await res.json();
      setAllSystemTags(data.tags ?? []);
    } catch { /* ignore */ }
  }, []);

  const loadPdfTemplates = useCallback(async () => {
    if (!pdfEnabled) return;
    try {
      const res = await fetch("/api/pdf/templates");
      if (!res.ok) return;
      const data = await res.json();
      setPdfTemplates(data.templates ?? []);
    } catch { /* ignore */ }
  }, [pdfEnabled]);

  useEffect(() => {
    (async () => {
      await Promise.all([loadDocuments(), loadSystemTags(), loadPdfTemplates()]);
      setMounted(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((doc) => {
      if (doc.title.toLowerCase().includes(q)) return true;
      const tagNames = [
        ...(doc.tags?.systemTags.map((t) => t.nameJa ?? t.name) ?? []),
        ...(doc.tags?.userTags ?? []),
      ];
      return tagNames.some((name) => name.toLowerCase().includes(q));
    });
  }, [documents, searchQuery]);

  const handleFilterByTag = useCallback((tagId: string | null) => {
    setFilterTagId(tagId);
    loadDocuments(tagId);
  }, [loadDocuments]);

  const handleTagsChange = useCallback((docId: string, systemTags: SystemTagInfo[], userTags: string[]) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === docId ? { ...d, tags: { systemTags, userTags } } : d,
      ),
    );
  }, []);

  const startRename = useCallback((doc: DocItem) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
    setTimeout(() => renameInputRef.current?.select(), 0);
  }, []);

  const confirmRename = useCallback(async () => {
    if (!renamingId || !renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    const trimmed = renameValue.trim();
    try {
      await fetch(`/api/editor/${renamingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === renamingId
            ? { ...d, title: trimmed, updatedAt: new Date().toISOString() }
            : d,
        ),
      );
    } catch {
      toast.error(t.loadError);
    }
    setRenamingId(null);
  }, [renamingId, renameValue, t.loadError]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  const openInFloatingWindow = useCallback(
    (doc: DocItem) => {
      const docType = (doc.type ?? "markdown") as DocType;
      floatingWindow.open({
        title: doc.title,
        titleJa: doc.title,
        content: (
          <FloatingEditorContent docId={doc.id} docType={docType} />
        ),
        initialSize: DEFAULT_WINDOW_SIZE[docType],
        initialPosition: { x: 150, y: 80 },
        noPadding: true,
      });
    },
    [floatingWindow],
  );

  const handleCreate = useCallback(async (type: DocType) => {
    try {
      const res = await fetch("/api/editor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t.untitled, type }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const newDoc: DocItem = {
        id: data.document.id,
        title: data.document.title,
        type: data.document.type ?? type,
        updatedAt: data.document.updatedAt,
        createdAt: data.document.createdAt ?? data.document.updatedAt,
        tags: { systemTags: [], userTags: [] },
      };
      setDocuments((prev) => [newDoc, ...prev]);
      openInFloatingWindow(newDoc);
    } catch {
      toast.error(t.loadError);
    }
  }, [t.untitled, t.loadError, openInFloatingWindow]);

  // templateId: undefined=デフォルト使用, "none"=テンプレートなし, その他=指定ID
  const handleExportPdf = useCallback(async (doc: DocItem, templateId?: string) => {
    try {
      const res = await fetch(`/api/editor/${doc.id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const content = data.document.content as string;
      const docType = (doc.type ?? "markdown") as DocType;
      const tid = templateId === "none" ? "__none__" : templateId;

      if (docType === "markdown") {
        const { exportMarkdownToPdfHQ } = await import(
          "@/lib/addon-modules/pdf/pdf-export-service"
        );
        await exportMarkdownToPdfHQ(content, doc.title, tid);
      } else if (docType === "excalidraw") {
        const { exportExcalidrawToPdf } = await import(
          "@/lib/addon-modules/pdf/pdf-export-service"
        );
        setExportingId(doc.id);
        await exportExcalidrawToPdf(content, doc.title, tid);
        toast.success("PDFをダウンロードしました");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "PDF生成に失敗しました");
    } finally {
      setExportingId(null);
    }
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/editor/${deleteTarget}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget));
      if (floatingWindow.windowStatus !== "closed") {
        floatingWindow.close();
      }
      setDeleteTarget(null);
    } catch {
      toast.error(t.loadError);
    }
  }, [deleteTarget, floatingWindow, t.loadError]);

  if (!mounted) {
    return (
      <div className="max-w-5xl mx-auto">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
        {/* 検索 */}
        <div className="flex items-center gap-4 mb-3">
          <Skeleton className="h-9 max-w-sm flex-1 rounded-md" />
          <Skeleton className="h-5 w-20" />
        </div>
        {/* タグフィルタ */}
        <div className="flex items-center gap-2 mb-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-5 w-14 rounded" />
          ))}
        </div>
        {/* テーブル */}
        <div className="rounded-lg border">
          <div className="grid grid-cols-[40px_1fr_1fr_160px_130px] gap-2 px-4 py-3 border-b">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-16" />
            <div />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[40px_1fr_1fr_160px_130px] gap-2 px-4 py-3 border-b last:border-b-0">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-48" />
              <div className="flex gap-1">
                <Skeleton className="h-5 w-12 rounded" />
                <Skeleton className="h-5 w-14 rounded" />
              </div>
              <Skeleton className="h-4 w-32" />
              <div />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {documents.length}{t.documentCount}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.newDocument}
              <ChevronDown className="h-3.5 w-3.5 ml-1.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleCreate("markdown")}>
              <FileText className="h-4 w-4 mr-2" />
              {t.newMarkdown}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleCreate("excalidraw")}>
              <PenTool className="h-4 w-4 mr-2" />
              {t.newWhiteboard}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 検索 + タグフィルタ */}
      <div className="flex items-center gap-4 mb-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchDocuments}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {searchQuery
            ? `${filteredDocuments.length} / ${documents.length}`
            : `${documents.length}${t.documentCount}`}
        </span>
      </div>

      {allSystemTags.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <button
            type="button"
            className={`text-xs px-2 py-0.5 rounded transition-colors ${
              filterTagId === null
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
            onClick={() => handleFilterByTag(null)}
          >
            {t.allDocuments}
          </button>
          {allSystemTags.map((tag) => (
            <TagBadge
              key={tag.id}
              name={language === "ja" && tag.nameJa ? tag.nameJa : tag.name}
              color={tag.color}
              onClick={() => handleFilterByTag(filterTagId === tag.id ? null : tag.id)}
              className={filterTagId === tag.id ? "ring-2 ring-primary ring-offset-1" : "opacity-70 hover:opacity-100"}
            />
          ))}
        </div>
      )}

      {/* ドキュメントテーブル */}
      <div className="rounded-lg border">
        {documents.length === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground mb-1">
              {filterTagId ? t.filterByTag : t.noDocuments}
            </p>
            {!filterTagId && (
              <>
                <p className="text-sm text-muted-foreground/70 mb-4">
                  {t.noDocumentsDescription}
                </p>
                <Button onClick={() => handleCreate("markdown")}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t.newDocument}
                </Button>
              </>
            )}
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t.noMatchingDocuments}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] pl-4" />
                <TableHead>{t.title}</TableHead>
                <TableHead>{t.tags}</TableHead>
                <TableHead className="w-[160px]">{t.lastUpdated}</TableHead>
                <TableHead className="w-[130px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.map((doc) => {
                const docType = (doc.type ?? "markdown") as DocType;
                const Icon = DOC_TYPE_ICON[docType] ?? FileText;
                const hasTags = (doc.tags?.systemTags?.length ?? 0) > 0 || (doc.tags?.userTags?.length ?? 0) > 0;
                return (
                  <TableRow
                    key={doc.id}
                    className="group cursor-pointer"
                    onClick={() => {
                      if (renamingId !== doc.id) openInFloatingWindow(doc);
                    }}
                  >
                    <TableCell className="pl-4">
                      <span title={DOC_TYPE_LABEL[docType] ?? docType}>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </TableCell>
                    <TableCell>
                      {renamingId === doc.id ? (
                        <div
                          className="flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            ref={renameInputRef}
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") confirmRename();
                              if (e.key === "Escape") cancelRename();
                            }}
                            className="flex-1 text-sm font-medium bg-background border border-primary rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary"
                            autoFocus
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-primary" onClick={confirmRename}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={cancelRename}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">{doc.title}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {hasTags && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {doc.tags?.systemTags.map((tag) => (
                            <TagBadge
                              key={tag.id}
                              name={language === "ja" && tag.nameJa ? tag.nameJa : tag.name}
                              color={tag.color}
                            />
                          ))}
                          {doc.tags?.userTags.map((tag) => (
                            <TagBadge key={tag} name={tag} isUserTag />
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(doc.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <div onClick={(e) => e.stopPropagation()}>
                          <TagPicker
                            entityType="EditorDocument"
                            entityId={doc.id}
                            currentSystemTags={doc.tags?.systemTags ?? []}
                            currentUserTags={doc.tags?.userTags ?? []}
                            onTagsChange={(systemTags, userTags) => handleTagsChange(doc.id, systemTags, userTags)}
                            compact
                            language={language}
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(doc);
                          }}
                          title={t.rename}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        {pdfEnabled && (
                          exportingId === doc.id ? (
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            </Button>
                          ) : pdfTemplates.length === 0 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportPdf(doc, "none");
                              }}
                              title="PDF"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </Button>
                          ) : (
                            <div onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" title="PDF">
                                    <Printer className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[160px]">
                                  {pdfTemplates.map((tmpl) => (
                                    <DropdownMenuItem
                                      key={tmpl.id}
                                      onClick={() => handleExportPdf(doc, tmpl.id)}
                                    >
                                      <Printer className={`h-3 w-3 mr-1.5 shrink-0 ${tmpl.isDefault ? "text-primary" : ""}`} />
                                      <span className="truncate">{tmpl.name}</span>
                                      <span className="text-[10px] ml-auto pl-2 text-muted-foreground">HQ</span>
                                    </DropdownMenuItem>
                                  ))}
                                  <DropdownMenuItem onClick={() => handleExportPdf(doc, "none")}>
                                    <Printer className="h-3 w-3 mr-1.5 shrink-0" />
                                    <span className="text-muted-foreground">{language === "ja" ? "テンプレートなし" : "No template"}</span>
                                    <span className="text-[10px] ml-auto pl-2 text-muted-foreground">HQ</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(doc.id);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t.deleteTitle}
        description={t.deleteDescription}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        onDelete={handleDelete}
      />
    </div>
  );
}
