"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { assetTranslations } from "../translations";
import CategoryForm from "./CategoryForm";

interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  type: string;
  requiresApproval: boolean;
  color: string | null;
  order: number;
  isActive: boolean;
  _count: { resources: number };
}

interface CategoriesTabProps {
  language: "en" | "ja";
}

export default function CategoriesTab({ language }: CategoriesTabProps) {
  const t = assetTranslations[language];
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const typeLabels: Record<string, string> = {
    ROOM: t.typeRoom,
    VEHICLE: t.typeVehicle,
    EQUIPMENT: t.typeEquipment,
  };

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/general-affairs/categories");
      if (res.ok) {
        setCategories(await res.json());
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSave = async (data: Record<string, unknown>) => {
    const isEdit = !!editingCategory;
    const url = isEdit
      ? `/api/general-affairs/categories/${editingCategory.id}`
      : "/api/general-affairs/categories";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingCategory(null);
      fetchCategories();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/general-affairs/categories/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchCategories();
    } else {
      const err = await res.json();
      alert(err.error || t.deleteError);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showForm || editingCategory) {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-lg font-semibold mb-4">
          {editingCategory ? t.editCategory : t.addCategory}
        </h2>
        <CategoryForm
          language={language}
          initial={
            editingCategory
              ? {
                  id: editingCategory.id,
                  name: editingCategory.name,
                  nameEn: editingCategory.nameEn || "",
                  type: editingCategory.type,
                  requiresApproval: editingCategory.requiresApproval,
                  color: editingCategory.color || "#3b82f6",
                  order: editingCategory.order,
                  isActive: editingCategory.isActive,
                }
              : undefined
          }
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingCategory(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.categories}</h2>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t.addCategory}
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noData}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2">{t.name}</th>
                <th className="text-left px-4 py-2">{t.type}</th>
                <th className="text-center px-4 py-2">
                  {t.requiresApproval}
                </th>
                <th className="text-center px-4 py-2">{t.resourceCount}</th>
                <th className="text-center px-4 py-2">{t.status}</th>
                <th className="text-center px-4 py-2">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {cat.color && (
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                      )}
                      <span className="font-medium">
                        {language === "ja"
                          ? cat.name
                          : cat.nameEn || cat.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted">
                      {typeLabels[cat.type] || cat.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {cat.requiresApproval ? (
                      <CheckCircle className="w-4 h-4 text-amber-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-muted-foreground mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {cat._count.resources}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`text-xs ${cat.isActive ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {cat.isActive ? t.active : t.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        className="p-1 hover:bg-muted rounded text-destructive"
                        disabled={cat._count.resources > 0}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
