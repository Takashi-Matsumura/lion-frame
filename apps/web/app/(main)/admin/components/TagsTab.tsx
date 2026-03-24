"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Edit3, Hash, Languages, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TagBadge } from "@/components/ui/tag-badge";
import { TAG_COLORS } from "@/lib/services/tag-service";
import { cn } from "@/lib/utils";

interface TagItem {
  id: string;
  name: string;
  nameJa: string | null;
  color: string;
  description: string | null;
  createdAt: string;
  _count?: { assignments: number };
}

interface TagsTabProps {
  language: "en" | "ja";
}

/**
 * TagsTab — Card ラッパー付き（単独タブとして使用する場合）
 */
export function TagsTab({ language }: TagsTabProps) {
  return (
    <Card className="flex-1 flex flex-col min-h-0">
      <CardContent className="p-6 flex-1 flex flex-col min-h-0">
        <TagsTabContent language={language} />
      </CardContent>
    </Card>
  );
}

/**
 * TagsTabContent — Card ラッパーなし（SettingsTab 内に埋め込むために使用）
 */
export function TagsTabContent({ language }: TagsTabProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);

  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TagItem | null>(null);
  const [translating, setTranslating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [form, setForm] = useState({
    name: "",
    nameJa: "",
    color: "blue",
    description: "",
  });

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tags/stats");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTags(data.stats ?? []);
    } catch {
      toast.error(t("Failed to load tags", "タグの読み込みに失敗しました"));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags;
    const q = searchQuery.toLowerCase();
    return tags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(q) ||
        (tag.nameJa?.toLowerCase().includes(q) ?? false) ||
        (tag.description?.toLowerCase().includes(q) ?? false),
    );
  }, [tags, searchQuery]);

  const openCreateModal = useCallback(() => {
    setEditingTag(null);
    setForm({ name: "", nameJa: "", color: "blue", description: "" });
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((tag: TagItem) => {
    setEditingTag(tag);
    setForm({
      name: tag.name,
      nameJa: tag.nameJa ?? "",
      color: tag.color,
      description: tag.description ?? "",
    });
    setShowModal(true);
  }, []);

  const handleTranslate = useCallback(async () => {
    if (!form.nameJa.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/tags/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.nameJa.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.nameEn) {
        setForm((f) => ({ ...f, name: data.nameEn }));
      }
    } catch {
      toast.error(t("Translation failed", "翻訳に失敗しました"));
    } finally {
      setTranslating(false);
    }
  }, [form.nameJa, language]);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error(t("Tag name is required", "タグ名は必須です"));
      return;
    }

    setSaving(true);
    try {
      if (editingTag) {
        const res = await fetch(`/api/tags/${editingTag.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed");
        }
        toast.success(t("Tag updated", "タグを更新しました"));
      } else {
        const res = await fetch("/api/tags", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed");
        }
        toast.success(t("Tag created", "タグを作成しました"));
      }
      setShowModal(false);
      fetchTags();
    } catch (e) {
      toast.error(
        e instanceof Error && e.message.includes("Unique")
          ? t("Tag name already exists", "そのタグ名は既に存在します")
          : t("Failed to save tag", "タグの保存に失敗しました"),
      );
    } finally {
      setSaving(false);
    }
  }, [form, editingTag, fetchTags, language]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/tags/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success(t("Tag deleted", "タグを削除しました"));
      setDeleteTarget(null);
      fetchTags();
    } catch {
      toast.error(t("Failed to delete tag", "タグの削除に失敗しました"));
    }
  }, [deleteTarget, fetchTags, language]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  return (
    <>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Hash className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">
            {t("System Tags", "システムタグ")}
          </h3>
          <Badge variant="secondary">{tags.length}</Badge>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          {t("New Tag", "新規タグ")}
        </Button>
      </div>

      {/* 検索 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("Search tags...", "タグを検索...")}
            className="pl-9"
          />
        </div>
        <span className="text-sm text-muted-foreground">
          {t("Total:", "合計:")}{" "}
          {searchQuery ? `${filteredTags.length} / ${tags.length}` : tags.length}
        </span>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t("Loading...", "読み込み中...")}
          </div>
        ) : tags.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<Hash className="h-12 w-12" />}
              message={t("No tags", "タグがありません")}
              description={t(
                "Create system tags for your organization.",
                "組織で使用するシステムタグを作成してください。",
              )}
            />
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
            {t("No matching tags", "一致するタグがありません")}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px] pl-4">{t("Tag", "タグ")}</TableHead>
                <TableHead>{t("Name", "タグ名")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("Description", "説明")}</TableHead>
                <TableHead className="w-[80px] text-center">{t("Uses", "使用数")}</TableHead>
                <TableHead className="w-[110px]">{t("Created", "作成日")}</TableHead>
                <TableHead className="w-[90px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="pl-4">
                    <TagBadge
                      name={language === "ja" && tag.nameJa ? tag.nameJa : tag.name}
                      color={tag.color}
                      size="md"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{tag.name}</div>
                    {tag.nameJa && (
                      <div className="text-xs text-muted-foreground">{tag.nameJa}</div>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground truncate block max-w-[300px]">
                      {tag.description || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="text-xs">
                      {tag._count?.assignments ?? 0}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(tag.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditModal(tag)}
                        title={t("Edit", "編集")}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteTarget(tag)}
                        title={t("Delete", "削除")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* 作成/編集ダイアログ */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTag
                ? t("Edit Tag", "タグを編集")
                : t("Create Tag", "タグを作成")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t("Tag Name (JA)", "タグ名（日本語）")}</Label>
              <Input
                value={form.nameJa}
                onChange={(e) => setForm((f) => ({ ...f, nameJa: e.target.value }))}
                placeholder="例: プロジェクトα"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("Tag Name (EN)", "タグ名（英語）")}</Label>
              <div className="flex gap-2">
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. project-alpha"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0 h-9 w-9"
                  disabled={translating || !form.nameJa.trim()}
                  onClick={handleTranslate}
                  title={t("Translate", "翻訳")}
                >
                  <Languages className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("Color", "カラー")}</Label>
              <div className="flex gap-2 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      form.color === c.name
                        ? "border-primary scale-110 ring-2 ring-primary/30"
                        : "border-transparent hover:scale-105",
                    )}
                    style={{ backgroundColor: `var(--color-${c.name}-500, ${getColorFallback(c.name)})` }}
                    onClick={() => setForm((f) => ({ ...f, color: c.name }))}
                    title={language === "ja" ? c.labelJa : c.name}
                  />
                ))}
              </div>
              <div className="mt-2">
                <TagBadge name={(language === "ja" ? form.nameJa || form.name : form.name || form.nameJa) || (language === "ja" ? "プレビュー" : "preview")} color={form.color} size="md" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t("Description", "説明")}</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t("Optional description", "説明（任意）")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              {t("Cancel", "キャンセル")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? t("Saving...", "保存中...")
                : editingTag
                  ? t("Update", "更新")
                  : t("Create", "作成")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 削除確認 */}
      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={t("Delete Tag", "タグを削除")}
        description={t(
          `Are you sure you want to delete "${deleteTarget?.name}"? All assignments will be removed.`,
          `「${deleteTarget?.nameJa ?? deleteTarget?.name}」を削除しますか？すべての割り当ても解除されます。`,
        )}
        cancelLabel={t("Cancel", "キャンセル")}
        deleteLabel={t("Delete", "削除")}
        onDelete={handleDelete}
      />
    </>
  );
}

function getColorFallback(name: string): string {
  const map: Record<string, string> = {
    blue: "#3b82f6",
    green: "#22c55e",
    red: "#ef4444",
    purple: "#a855f7",
    orange: "#f97316",
    yellow: "#eab308",
    pink: "#ec4899",
    cyan: "#06b6d4",
    gray: "#6b7280",
  };
  return map[name] ?? "#6b7280";
}
