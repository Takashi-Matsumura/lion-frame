"use client";

import { useCallback, useEffect, useState } from "react";
import { Edit3, FileText, Plus, Star, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { pdfManagementTranslations, type Language } from "./translations";

interface TemplateItem {
  id: string;
  name: string;
  isDefault: boolean;
  headerLeft: string | null;
  headerCenter: string | null;
  headerRight: string | null;
  footerLeft: string | null;
  footerCenter: string | null;
  footerRight: string | null;
  headerFontSize: number;
  footerFontSize: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  showPageNumber: boolean;
  pageNumberFormat: string;
  createdAt: string;
}

const defaultForm = {
  name: "",
  isDefault: false,
  headerLeft: "",
  headerCenter: "",
  headerRight: "",
  footerLeft: "",
  footerCenter: "",
  footerRight: "%page / %total",
  headerFontSize: 9,
  footerFontSize: 8,
  marginTop: 15,
  marginBottom: 15,
  marginLeft: 10,
  marginRight: 10,
  showPageNumber: true,
  pageNumberFormat: "%page / %total",
};

export function PdfManagementClient({ language }: { language: Language }) {
  const t = pdfManagementTranslations[language];

  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TemplateItem | null>(null);
  const [form, setForm] = useState(defaultForm);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pdf/templates");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTemplates(data.templates ?? []);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openCreateModal = useCallback(() => {
    setEditingTemplate(null);
    setForm(defaultForm);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((tmpl: TemplateItem) => {
    setEditingTemplate(tmpl);
    setForm({
      name: tmpl.name,
      isDefault: tmpl.isDefault,
      headerLeft: tmpl.headerLeft ?? "",
      headerCenter: tmpl.headerCenter ?? "",
      headerRight: tmpl.headerRight ?? "",
      footerLeft: tmpl.footerLeft ?? "",
      footerCenter: tmpl.footerCenter ?? "",
      footerRight: tmpl.footerRight ?? "%page / %total",
      headerFontSize: tmpl.headerFontSize,
      footerFontSize: tmpl.footerFontSize,
      marginTop: tmpl.marginTop,
      marginBottom: tmpl.marginBottom,
      marginLeft: tmpl.marginLeft,
      marginRight: tmpl.marginRight,
      showPageNumber: tmpl.showPageNumber,
      pageNumberFormat: tmpl.pageNumberFormat,
    });
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      toast.error("テンプレート名は必須です");
      return;
    }
    setSaving(true);
    try {
      const url = editingTemplate ? `/api/pdf/templates/${editingTemplate.id}` : "/api/pdf/templates";
      const method = editingTemplate ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      toast.success(editingTemplate ? "テンプレートを更新しました" : "テンプレートを作成しました");
      setShowModal(false);
      fetchTemplates();
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  }, [form, editingTemplate, fetchTemplates]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/pdf/templates/${deleteTarget.id}`, { method: "DELETE" });
      toast.success("テンプレートを削除しました");
      setDeleteTarget(null);
      fetchTemplates();
    } catch {
      toast.error("削除に失敗しました");
    }
  }, [deleteTarget, fetchTemplates]);

  const summarize = (left?: string | null, center?: string | null, right?: string | null) => {
    const parts = [left, center, right].filter(Boolean);
    return parts.length > 0 ? parts.join(" | ") : "—";
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card>
        <CardContent className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold">{t.templates}</h3>
              <Badge variant="secondary">{templates.length}</Badge>
            </div>
            <Button onClick={openCreateModal}>
              <Plus className="h-4 w-4 mr-2" />
              {t.newTemplate}
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            PDFエクスポート時に適用するヘッダー/フッターのテンプレートを管理します。
            デフォルトに設定したテンプレートは自動的にすべてのPDFエクスポートに適用されます。
          </p>

          <p className="text-xs text-muted-foreground mb-4">
            {t.placeholderHelp}
          </p>

          {/* テーブル */}
          <div className="rounded-lg border">
            {loading ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] pl-4"><Skeleton className="h-4 w-24" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead><Skeleton className="h-4 w-20" /></TableHead>
                    <TableHead className="w-[80px] text-center"><Skeleton className="h-4 w-12 mx-auto" /></TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-32" />
                          {i === 0 && <Skeleton className="h-3.5 w-3.5 rounded-full" />}
                        </div>
                      </TableCell>
                      <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell className="text-center">
                        {i === 0 && <Skeleton className="h-5 w-8 rounded-full mx-auto" />}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : templates.length === 0 ? (
              <div className="py-12">
                <EmptyState
                  icon={<FileText className="h-12 w-12" />}
                  message={t.noTemplates}
                  description={t.noTemplatesDescription}
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px] pl-4">{t.templateName}</TableHead>
                    <TableHead>{t.headerSettings}</TableHead>
                    <TableHead>{t.footerSettings}</TableHead>
                    <TableHead className="w-[80px] text-center">{t.default}</TableHead>
                    <TableHead className="w-[90px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((tmpl) => (
                    <TableRow key={tmpl.id}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{tmpl.name}</span>
                          {tmpl.isDefault && (
                            <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {summarize(tmpl.headerLeft, tmpl.headerCenter, tmpl.headerRight)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {summarize(tmpl.footerLeft, tmpl.footerCenter, tmpl.footerRight)}
                      </TableCell>
                      <TableCell className="text-center">
                        {tmpl.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            ✓
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openEditModal(tmpl)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteTarget(tmpl)}
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
        </CardContent>
      </Card>

      {/* 作成/編集ダイアログ */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t.update : t.create}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* テンプレート名 */}
            <div className="space-y-2">
              <Label>{t.templateName}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="例: 社内文書テンプレート"
              />
            </div>

            {/* デフォルト設定 */}
            <div className="flex items-center gap-3">
              <Switch
                checked={form.isDefault}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
              />
              <Label>{t.setDefault}</Label>
            </div>

            {/* ヘッダー設定 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t.headerSettings}</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">{t.headerLeft}</Label>
                  <Input
                    value={form.headerLeft}
                    onChange={(e) => setForm((f) => ({ ...f, headerLeft: e.target.value }))}
                    placeholder="例: 株式会社○○"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.headerCenter}</Label>
                  <Input
                    value={form.headerCenter}
                    onChange={(e) => setForm((f) => ({ ...f, headerCenter: e.target.value }))}
                    placeholder="例: %title"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.headerRight}</Label>
                  <Input
                    value={form.headerRight}
                    onChange={(e) => setForm((f) => ({ ...f, headerRight: e.target.value }))}
                    placeholder="例: %date"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">{t.fontSize}</Label>
                <Input
                  type="number"
                  value={form.headerFontSize}
                  onChange={(e) => setForm((f) => ({ ...f, headerFontSize: Number(e.target.value) }))}
                  className="w-20 text-sm"
                  min={6}
                  max={14}
                />
                <span className="text-xs text-muted-foreground">pt</span>
              </div>
            </div>

            {/* フッター設定 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t.footerSettings}</Label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">{t.footerLeft}</Label>
                  <Input
                    value={form.footerLeft}
                    onChange={(e) => setForm((f) => ({ ...f, footerLeft: e.target.value }))}
                    placeholder="例: 社外秘"
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.footerCenter}</Label>
                  <Input
                    value={form.footerCenter}
                    onChange={(e) => setForm((f) => ({ ...f, footerCenter: e.target.value }))}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">{t.footerRight}</Label>
                  <Input
                    value={form.footerRight}
                    onChange={(e) => setForm((f) => ({ ...f, footerRight: e.target.value }))}
                    placeholder="例: %page / %total"
                    className="text-sm"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">{t.fontSize}</Label>
                <Input
                  type="number"
                  value={form.footerFontSize}
                  onChange={(e) => setForm((f) => ({ ...f, footerFontSize: Number(e.target.value) }))}
                  className="w-20 text-sm"
                  min={6}
                  max={14}
                />
                <span className="text-xs text-muted-foreground">pt</span>
              </div>
            </div>

            {/* マージン設定 */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t.marginSettings}</Label>
              <div className="grid grid-cols-4 gap-2">
                {(["marginTop", "marginBottom", "marginLeft", "marginRight"] as const).map((key) => (
                  <div key={key}>
                    <Label className="text-xs text-muted-foreground">
                      {t[key === "marginTop" ? "marginTop" : key === "marginBottom" ? "marginBottom" : key === "marginLeft" ? "marginLeft" : "marginRight"]}
                    </Label>
                    <Input
                      type="number"
                      value={form[key]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: Number(e.target.value) }))}
                      className="text-sm"
                      min={0}
                      max={50}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* A4プレビュー */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">{t.preview}</Label>
              <div className="border rounded-lg p-2 bg-muted/30">
                <div
                  className="bg-white border shadow-sm mx-auto relative"
                  style={{ width: "200px", height: "283px", fontSize: "6px", fontFamily: "sans-serif" }}
                >
                  {/* ヘッダー */}
                  <div className="absolute top-1 left-2 right-2 flex justify-between text-muted-foreground" style={{ fontSize: `${Math.max(5, form.headerFontSize * 0.6)}px` }}>
                    <span>{form.headerLeft || ""}</span>
                    <span>{form.headerCenter || ""}</span>
                    <span>{form.headerRight || ""}</span>
                  </div>
                  {form.headerLeft || form.headerCenter || form.headerRight ? (
                    <div className="absolute top-4 left-2 right-2 border-b border-gray-200" />
                  ) : null}
                  {/* コンテンツ領域 */}
                  <div className="absolute left-3 right-3 flex flex-col gap-1" style={{ top: "20px" }}>
                    <div className="h-2 bg-gray-300 rounded w-3/4" />
                    <div className="h-1 bg-gray-200 rounded w-full" />
                    <div className="h-1 bg-gray-200 rounded w-full" />
                    <div className="h-1 bg-gray-200 rounded w-2/3" />
                    <div className="h-1.5 bg-gray-300 rounded w-1/2 mt-1" />
                    <div className="h-1 bg-gray-200 rounded w-full" />
                    <div className="h-1 bg-gray-200 rounded w-full" />
                  </div>
                  {/* フッター */}
                  {form.footerLeft || form.footerCenter || form.footerRight ? (
                    <div className="absolute bottom-4 left-2 right-2 border-t border-gray-200" />
                  ) : null}
                  <div className="absolute bottom-1 left-2 right-2 flex justify-between text-muted-foreground" style={{ fontSize: `${Math.max(4, form.footerFontSize * 0.5)}px` }}>
                    <span>{form.footerLeft || ""}</span>
                    <span>{form.footerCenter || ""}</span>
                    <span>{(form.footerRight || "").replace("%page", "1").replace("%total", "3")}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "保存中..." : editingTemplate ? t.update : t.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
