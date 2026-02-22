"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Languages, Loader2 } from "lucide-react";
import { assetTranslations } from "../translations";

interface Category {
  id: string;
  name: string;
  nameEn: string | null;
  type: string;
}

interface ResourceFormProps {
  language: "en" | "ja";
  initial?: {
    id?: string;
    categoryId: string;
    name: string;
    nameEn: string;
    location: string;
    capacity: number | null;
    specifications: Record<string, string> | null;
    notes: string;
    isActive: boolean;
  };
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

export default function ResourceForm({
  language,
  initial,
  onSave,
  onCancel,
}: ResourceFormProps) {
  const t = assetTranslations[language];
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [name, setName] = useState(initial?.name || "");
  const [nameEn, setNameEn] = useState(initial?.nameEn || "");
  const [location, setLocation] = useState(initial?.location || "");
  const [capacity, setCapacity] = useState<string>(
    initial?.capacity?.toString() || "",
  );
  const [notes, setNotes] = useState(initial?.notes || "");
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!name.trim()) return;
    setTranslating(true);
    try {
      const res = await fetch("/api/ai/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: name,
          sourceLanguage: "ja",
          targetLanguage: "en",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.translatedText) {
          setNameEn(data.translatedText);
        }
      }
    } catch (error) {
      console.error("Failed to translate:", error);
    } finally {
      setTranslating(false);
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/general-affairs/categories?isActive=true");
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (!categoryId && data.length > 0) {
          setCategoryId(data[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !categoryId) return;
    setSaving(true);
    try {
      await onSave({
        categoryId,
        name,
        nameEn: nameEn || null,
        location: location || null,
        capacity: capacity ? Number(capacity) : null,
        notes: notes || null,
        isActive,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">
          {t.category} *
        </label>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          required
        >
          <option value="">{t.filterByCategory}</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {language === "ja" ? cat.name : cat.nameEn || cat.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t.resourceName} *
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t.resourceNameEn}
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
            />
            {translating && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleTranslate}
            disabled={translating || !name.trim()}
            title={t.aiTranslate}
          >
            {translating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Languages className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t.location}</label>
        <Input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t.capacity}</label>
        <Input
          type="number"
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          className="w-24"
          min={0}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">{t.notes}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[60px]"
        />
      </div>

      {initial?.id && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActiveResource"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isActiveResource" className="text-sm">
            {t.active}
          </label>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" disabled={saving || !name.trim() || !categoryId}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {t.save}
        </Button>
      </div>
    </form>
  );
}
