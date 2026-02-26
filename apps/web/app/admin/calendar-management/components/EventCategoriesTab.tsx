"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageSkeleton } from "@/components/ui/page-skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { calendarManagementTranslations } from "../translations";

interface EventCategory {
  id: string;
  name: string;
  nameEn: string;
  color: string;
  enabled: boolean;
  builtIn: boolean;
}

interface CategoryFormData {
  name: string;
  nameEn: string;
  color: string;
  enabled: boolean;
}

const PRESET_COLORS = [
  { value: "bg-yellow-300", label: "Yellow" },
  { value: "bg-orange-300", label: "Orange" },
  { value: "bg-blue-300", label: "Blue" },
  { value: "bg-purple-300", label: "Purple" },
  { value: "bg-pink-300", label: "Pink" },
  { value: "bg-green-300", label: "Green" },
  { value: "bg-red-300", label: "Red" },
  { value: "bg-cyan-300", label: "Cyan" },
  { value: "bg-gray-500", label: "Gray" },
];

const DEFAULT_CATEGORIES: EventCategory[] = [
  { id: "personal", name: "個人", nameEn: "Personal", color: "bg-yellow-300", enabled: true, builtIn: true },
  { id: "work", name: "業務", nameEn: "Work", color: "bg-orange-300", enabled: true, builtIn: true },
  { id: "meeting", name: "会議", nameEn: "Meeting", color: "bg-blue-300", enabled: true, builtIn: true },
  { id: "visitor", name: "来客", nameEn: "Visitor", color: "bg-purple-300", enabled: true, builtIn: true },
  { id: "trip", name: "出張", nameEn: "Trip", color: "bg-pink-300", enabled: true, builtIn: true },
  { id: "other", name: "その他", nameEn: "Other", color: "bg-gray-500", enabled: true, builtIn: true },
];

const INITIAL_FORM: CategoryFormData = {
  name: "",
  nameEn: "",
  color: "bg-blue-300",
  enabled: true,
};

interface EventCategoriesTabProps {
  language: "en" | "ja";
}

export function EventCategoriesTab({ language }: EventCategoriesTabProps) {
  const t = calendarManagementTranslations[language].categories;
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<EventCategory | null>(null);
  const [form, setForm] = useState<CategoryFormData>(INITIAL_FORM);
  const [saving, setSaving] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<EventCategory | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/calendar/categories");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories ?? DEFAULT_CATEGORIES);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch {
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const openAddDialog = useCallback(() => {
    setEditingCategory(null);
    setForm(INITIAL_FORM);
    setDialogOpen(true);
  }, []);

  const openEditDialog = useCallback((category: EventCategory) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      nameEn: category.nameEn,
      color: category.color,
      enabled: category.enabled,
    });
    setDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim() || !form.nameEn.trim()) return;
    setSaving(true);

    try {
      const updated = [...categories];
      if (editingCategory) {
        const idx = updated.findIndex((c) => c.id === editingCategory.id);
        if (idx >= 0) {
          updated[idx] = { ...updated[idx], ...form };
        }
      } else {
        const id = form.nameEn.toLowerCase().replace(/\s+/g, "_");
        updated.push({
          id,
          name: form.name,
          nameEn: form.nameEn,
          color: form.color,
          enabled: form.enabled,
          builtIn: false,
        });
      }

      const res = await fetch("/api/calendar/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updated }),
      });

      if (res.ok) {
        setCategories(updated);
        setDialogOpen(false);
      }
    } finally {
      setSaving(false);
    }
  }, [form, editingCategory, categories]);

  const openDeleteConfirm = useCallback((category: EventCategory) => {
    setDeletingCategory(category);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deletingCategory) return;
    setSaving(true);
    try {
      const updated = categories.filter((c) => c.id !== deletingCategory.id);
      const res = await fetch("/api/calendar/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updated }),
      });

      if (res.ok) {
        setCategories(updated);
        setDeleteConfirmOpen(false);
        setDeletingCategory(null);
      }
    } finally {
      setSaving(false);
    }
  }, [deletingCategory, categories]);

  const handleToggleEnabled = useCallback(
    async (category: EventCategory) => {
      const updated = categories.map((c) =>
        c.id === category.id ? { ...c, enabled: !c.enabled } : c,
      );
      setCategories(updated);
      await fetch("/api/calendar/categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: updated }),
      });
    },
    [categories],
  );

  if (loading && categories.length === 0) {
    return (
      <PageSkeleton contentHeight="h-[300px]" />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end shrink-0">
        <Button size="sm" onClick={openAddDialog}>
          {t.addCategory}
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          message={t.noCategories}
          description={t.noCategoriesDescription}
          className="border rounded-lg"
        />
      ) : (
        <div className="border rounded-lg overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1">
            <Table>
              <TableHeader className="sticky top-0 bg-muted/50 z-10">
                <TableRow>
                  <TableHead className="w-[60px]">{t.color}</TableHead>
                  <TableHead>{t.nameJa}</TableHead>
                  <TableHead>{t.nameEn}</TableHead>
                  <TableHead className="w-[100px]">{t.enabled}</TableHead>
                  <TableHead className="w-[100px] text-right">{t.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className={`w-6 h-6 rounded ${category.color}`} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {category.name}
                        {category.builtIn && (
                          <Badge variant="outline" className="text-xs">
                            {t.builtIn}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {category.nameEn}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={category.enabled}
                        onCheckedChange={() => handleToggleEnabled(category)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                        >
                          {t.edit}
                        </Button>
                        {!category.builtIn && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => openDeleteConfirm(category)}
                          >
                            {t.delete}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingCategory ? t.editCategory : t.addCategory}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t.categoryName}</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.categoryNameEn}</Label>
              <Input
                value={form.nameEn}
                onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.categoryColor}</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    className={`w-8 h-8 rounded-md ${preset.value} transition-all ${
                      form.color === preset.value
                        ? "ring-2 ring-primary ring-offset-2"
                        : "hover:scale-110"
                    }`}
                    onClick={() => setForm((f) => ({ ...f, color: preset.value }))}
                    title={preset.label}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.enabled}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, enabled: checked }))
                }
              />
              <Label>{t.categoryEnabled}</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.nameEn.trim()}
            >
              {t.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={t.deleteCategory}
        description={t.deleteConfirm}
        cancelLabel={t.cancel}
        deleteLabel={t.delete}
        disabled={saving}
        onDelete={handleDelete}
      />
    </div>
  );
}
