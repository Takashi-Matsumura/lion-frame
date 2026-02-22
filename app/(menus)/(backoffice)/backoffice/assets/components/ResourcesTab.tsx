"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { assetTranslations } from "../translations";
import ResourceForm from "./ResourceForm";

interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  type: string;
  color: string | null;
}

interface Resource {
  id: string;
  name: string;
  nameEn: string | null;
  categoryId: string;
  location: string | null;
  capacity: number | null;
  specifications: Record<string, string> | null;
  notes: string | null;
  isActive: boolean;
  category: Category;
}

interface ResourcesTabProps {
  language: "en" | "ja";
}

export default function ResourcesTab({ language }: ResourcesTabProps) {
  const t = assetTranslations[language];
  const [resources, setResources] = useState<Resource[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const typeLabels: Record<string, string> = {
    ROOM: t.typeRoom,
    VEHICLE: t.typeVehicle,
    EQUIPMENT: t.typeEquipment,
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [resRes, catRes] = await Promise.all([
        fetch("/api/general-affairs/resources"),
        fetch("/api/general-affairs/categories"),
      ]);
      if (resRes.ok) setResources(await resRes.json());
      if (catRes.ok) setCategories(await catRes.json());
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (data: Record<string, unknown>) => {
    const isEdit = !!editingResource;
    const url = isEdit
      ? `/api/general-affairs/resources/${editingResource.id}`
      : "/api/general-affairs/resources";
    const method = isEdit ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (res.ok) {
      setShowForm(false);
      setEditingResource(null);
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.deleteConfirm)) return;
    const res = await fetch(`/api/general-affairs/resources/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error || t.deleteError);
    }
  };

  const filteredResources = filterCategoryId
    ? resources.filter((r) => r.categoryId === filterCategoryId)
    : resources;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showForm || editingResource) {
    return (
      <div className="max-w-lg mx-auto">
        <h2 className="text-lg font-semibold mb-4">
          {editingResource ? t.editResource : t.addResource}
        </h2>
        <ResourceForm
          language={language}
          initial={
            editingResource
              ? {
                  id: editingResource.id,
                  categoryId: editingResource.categoryId,
                  name: editingResource.name,
                  nameEn: editingResource.nameEn || "",
                  location: editingResource.location || "",
                  capacity: editingResource.capacity,
                  specifications: editingResource.specifications,
                  notes: editingResource.notes || "",
                  isActive: editingResource.isActive,
                }
              : undefined
          }
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingResource(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t.resources}</h2>
        <Button onClick={() => setShowForm(true)} size="sm">
          <Plus className="w-4 h-4 mr-1" />
          {t.addResource}
        </Button>
      </div>

      {categories.length > 0 && (
        <div>
          <select
            value={filterCategoryId}
            onChange={(e) => setFilterCategoryId(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="">{t.allCategories}</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {language === "ja" ? cat.name : cat.nameEn || cat.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filteredResources.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {t.noData}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b">
                <th className="text-left px-4 py-2">{t.name}</th>
                <th className="text-left px-4 py-2">{t.category}</th>
                <th className="text-left px-4 py-2">{t.location}</th>
                <th className="text-center px-4 py-2">{t.capacity}</th>
                <th className="text-center px-4 py-2">{t.status}</th>
                <th className="text-center px-4 py-2">{t.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filteredResources.map((res) => (
                <tr key={res.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">
                    {language === "ja" ? res.name : res.nameEn || res.name}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      {res.category.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: res.category.color }}
                        />
                      )}
                      <span className="text-muted-foreground">
                        {language === "ja"
                          ? res.category.name
                          : res.category.nameEn || res.category.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({typeLabels[res.category.type]})
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {res.location || "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {res.capacity ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`text-xs ${res.isActive ? "text-green-600" : "text-muted-foreground"}`}
                    >
                      {res.isActive ? t.active : t.inactive}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setEditingResource(res)}
                        className="p-1 hover:bg-muted rounded"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(res.id)}
                        className="p-1 hover:bg-muted rounded text-destructive"
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
