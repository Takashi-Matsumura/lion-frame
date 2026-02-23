"use client";

import { useCallback, useEffect, useState } from "react";
import { FaEdit, FaPlus, FaTrash } from "react-icons/fa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { DataManagementTranslation } from "../translations";

interface PositionMaster {
  id: string;
  code: string;
  name: string;
  nameJa: string;
  level: string;
  isManager: boolean;
  color: string | null;
  displayOrder: number;
  isActive: boolean;
}

interface PositionsTabProps {
  language: "en" | "ja";
  t: DataManagementTranslation;
}

const levelOptions = [
  { value: "EXECUTIVE", labelEn: "Executive", labelJa: "役員" },
  { value: "DEPARTMENT", labelEn: "Department", labelJa: "本部" },
  { value: "SECTION", labelEn: "Section", labelJa: "部" },
  { value: "COURSE", labelEn: "Course", labelJa: "課" },
  { value: "SENIOR", labelEn: "Senior", labelJa: "上位" },
  { value: "STAFF", labelEn: "Staff", labelJa: "一般" },
];

const colorOptions = [
  { value: "", labelEn: "None", labelJa: "なし" },
  { value: "purple", labelEn: "Purple", labelJa: "紫" },
  { value: "cyan", labelEn: "Cyan", labelJa: "シアン" },
  { value: "green", labelEn: "Green", labelJa: "緑" },
  { value: "blue", labelEn: "Blue", labelJa: "青" },
  { value: "red", labelEn: "Red", labelJa: "赤" },
  { value: "orange", labelEn: "Orange", labelJa: "オレンジ" },
  { value: "yellow", labelEn: "Yellow", labelJa: "黄" },
];

const colorBadgeClass: Record<string, string> = {
  purple:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  cyan: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
  green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  red: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  orange:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  yellow:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

interface PositionForm {
  code: string;
  name: string;
  nameJa: string;
  level: string;
  isManager: boolean;
  color: string;
  displayOrder: number;
  isActive: boolean;
}

const emptyForm: PositionForm = {
  code: "",
  name: "",
  nameJa: "",
  level: "STAFF",
  isManager: false,
  color: "",
  displayOrder: 0,
  isActive: true,
};

export function PositionsTab({ language, t }: PositionsTabProps) {
  const [positions, setPositions] = useState<PositionMaster[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<PositionMaster | null>(null);
  const [form, setForm] = useState<PositionForm>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PositionMaster | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isJa = language === "ja";

  const fetchPositions = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/admin/organization/positions");
      if (!response.ok) throw new Error("Failed to fetch positions");
      const data = await response.json();
      setPositions(data.positions);
    } catch (err) {
      console.error("Error fetching positions:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  const handleOpenCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setShowDialog(true);
  };

  const handleOpenEdit = (position: PositionMaster) => {
    setEditing(position);
    setForm({
      code: position.code,
      name: position.name,
      nameJa: position.nameJa,
      level: position.level,
      isManager: position.isManager,
      color: position.color || "",
      displayOrder: position.displayOrder,
      isActive: position.isActive,
    });
    setError(null);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.nameJa.trim()) {
      setError(
        isJa
          ? "コード、英語名、日本語名は必須です"
          : "Code, name, and Japanese name are required",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const url = editing
        ? `/api/admin/organization/positions/${editing.id}`
        : "/api/admin/organization/positions";
      const method = editing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          nameJa: form.nameJa.trim(),
          level: form.level,
          isManager: form.isManager,
          color: form.color || null,
          displayOrder: form.displayOrder,
          isActive: form.isActive,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setError(
            isJa
              ? "この役職コードは既に使用されています"
              : "Position code already exists",
          );
        } else {
          setError(data.error || (isJa ? "保存に失敗しました" : "Failed to save"));
        }
        return;
      }

      setShowDialog(false);
      await fetchPositions();
    } catch (err) {
      console.error("Error saving position:", err);
      setError(isJa ? "保存に失敗しました" : "Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (position: PositionMaster) => {
    setDeleteTarget(position);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `/api/admin/organization/positions/${deleteTarget.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setError(
            isJa
              ? `この役職は${data.employeeCount}名の社員に使用されているため削除できません`
              : `Cannot delete: ${data.employeeCount} employee(s) use this position`,
          );
        }
        setShowDeleteDialog(false);
        return;
      }

      setShowDeleteDialog(false);
      setDeleteTarget(null);
      await fetchPositions();
    } catch (err) {
      console.error("Error deleting position:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getLevelLabel = (level: string) => {
    const opt = levelOptions.find((o) => o.value === level);
    return opt ? (isJa ? opt.labelJa : opt.labelEn) : level;
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {isJa ? "役職マスタ" : "Position Master"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isJa
              ? "役職コードと管理職判定、表示色を管理します"
              : "Manage position codes, manager flags, and display colors"}
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={handleOpenCreate}>
          <FaPlus className="w-3 h-3 mr-2" />
          {isJa ? "役職を追加" : "Add Position"}
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* Table */}
      {!isLoading && positions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "コード" : "Code"}
                </th>
                <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "役職名" : "Position Name"}
                </th>
                <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "レベル" : "Level"}
                </th>
                <th className="text-center py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "管理職" : "Manager"}
                </th>
                <th className="text-left py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "色" : "Color"}
                </th>
                <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "表示順" : "Order"}
                </th>
                <th className="text-center py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "状態" : "Status"}
                </th>
                <th className="text-right py-3 px-3 font-medium text-muted-foreground">
                  {isJa ? "操作" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => (
                <tr
                  key={pos.id}
                  className="border-b border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-3 font-mono text-xs">{pos.code}</td>
                  <td className="py-3 px-3">
                    <div className="font-medium text-foreground">
                      {isJa ? pos.nameJa : pos.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isJa ? pos.name : pos.nameJa}
                    </div>
                  </td>
                  <td className="py-3 px-3">
                    <Badge variant="outline" className="text-xs">
                      {getLevelLabel(pos.level)}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-center">
                    {pos.isManager ? (
                      <span className="inline-block w-5 h-5 rounded-full bg-green-500 text-white text-xs leading-5 text-center">
                        ✓
                      </span>
                    ) : (
                      <span className="inline-block w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs leading-5 text-center">
                        -
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3">
                    {pos.color ? (
                      <Badge
                        className={`text-xs ${colorBadgeClass[pos.color] || "bg-muted text-muted-foreground"}`}
                      >
                        {pos.color}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-xs">
                    {pos.displayOrder}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <Badge
                      variant={pos.isActive ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {pos.isActive
                        ? isJa
                          ? "有効"
                          : "Active"
                        : isJa
                          ? "無効"
                          : "Inactive"}
                    </Badge>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(pos)}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded"
                        title={isJa ? "編集" : "Edit"}
                      >
                        <FaEdit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteClick(pos)}
                        className="p-1.5 text-muted-foreground hover:text-destructive transition-colors rounded"
                        title={isJa ? "削除" : "Delete"}
                      >
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && positions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="mb-4">
            {isJa ? "役職が登録されていません" : "No positions registered"}
          </p>
          <Button variant="primary" size="sm" onClick={handleOpenCreate}>
            <FaPlus className="w-3 h-3 mr-2" />
            {isJa ? "最初の役職を追加" : "Add First Position"}
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isJa
                  ? "役職を編集"
                  : "Edit Position"
                : isJa
                  ? "役職を追加"
                  : "Add Position"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Code */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                {isJa ? "役職コード" : "Position Code"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. 300"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Name (Japanese) */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                {isJa ? "役職名（日本語）" : "Position Name (Japanese)"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.nameJa}
                onChange={(e) => setForm({ ...form, nameJa: e.target.value })}
                placeholder={isJa ? "例: 課長" : "e.g. 課長"}
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Name (English) */}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                {isJa ? "役職名（英語）" : "Position Name (English)"}{" "}
                <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Section Chief"
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Level & Manager row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  {isJa ? "レベル" : "Level"}
                </label>
                <select
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  {levelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isJa ? opt.labelJa : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end pb-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isManager}
                    onChange={(e) =>
                      setForm({ ...form, isManager: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {isJa ? "管理職" : "Manager"}
                  </span>
                </label>
              </div>
            </div>

            {/* Color & Display Order row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  {isJa ? "表示色" : "Display Color"}
                </label>
                <select
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                >
                  {colorOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {isJa ? opt.labelJa : opt.labelEn}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  {isJa ? "表示順序" : "Display Order"}
                </label>
                <input
                  type="number"
                  value={form.displayOrder}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      displayOrder: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            </div>

            {/* Active toggle (edit only) */}
            {editing && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm({ ...form, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-border"
                  />
                  <span className="text-sm font-medium text-foreground">
                    {isJa ? "有効" : "Active"}
                  </span>
                </label>
              </div>
            )}

            {/* Error in dialog */}
            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={isSaving}
            >
              {t.cancel}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={
                isSaving ||
                !form.code.trim() ||
                !form.name.trim() ||
                !form.nameJa.trim()
              }
            >
              {isSaving ? (t.loading) : t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>
              {isJa ? "役職を削除" : "Delete Position"}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            {isJa
              ? `「${deleteTarget?.nameJa}」（${deleteTarget?.code}）を削除してもよろしいですか？`
              : `Are you sure you want to delete "${deleteTarget?.name}" (${deleteTarget?.code})?`}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isDeleting}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting
                ? isJa
                  ? "削除中..."
                  : "Deleting..."
                : isJa
                  ? "削除"
                  : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
