"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Languages, Loader2 } from "lucide-react";
import { assetTranslations } from "../translations";

interface CategoryFormProps {
  language: "en" | "ja";
  initial?: {
    id?: string;
    name: string;
    nameEn: string;
    type: string;
    requiresApproval: boolean;
    color: string;
    order: number;
    isActive: boolean;
  };
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}

const RESOURCE_TYPES = ["ROOM", "VEHICLE", "EQUIPMENT"] as const;
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function CategoryForm({
  language,
  initial,
  onSave,
  onCancel,
}: CategoryFormProps) {
  const t = assetTranslations[language];
  const [name, setName] = useState(initial?.name || "");
  const [nameEn, setNameEn] = useState(initial?.nameEn || "");
  const [type, setType] = useState(initial?.type || "ROOM");
  const [requiresApproval, setRequiresApproval] = useState(
    initial?.requiresApproval ?? false,
  );
  const [color, setColor] = useState(initial?.color || COLORS[0]);
  const [order, setOrder] = useState(initial?.order ?? 0);
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

  const typeLabels: Record<string, string> = {
    ROOM: t.typeRoom,
    VEHICLE: t.typeVehicle,
    EQUIPMENT: t.typeEquipment,
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name,
        nameEn: nameEn || null,
        type,
        requiresApproval,
        color,
        order,
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
          {t.categoryName} *
        </label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t.categoryNameEn}
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
        <label className="block text-sm font-medium mb-1">
          {t.resourceType} *
        </label>
        <div className="flex gap-2">
          {RESOURCE_TYPES.map((rt) => (
            <button
              key={rt}
              type="button"
              onClick={() => setType(rt)}
              className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                type === rt
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:bg-muted"
              }`}
            >
              {typeLabels[rt]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="requiresApproval"
          checked={requiresApproval}
          onChange={(e) => setRequiresApproval(e.target.checked)}
          className="rounded"
        />
        <label htmlFor="requiresApproval" className="text-sm">
          {t.requiresApproval}
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t.displayColor}
        </label>
        <div className="flex gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                color === c
                  ? "border-foreground scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          {t.displayOrder}
        </label>
        <Input
          type="number"
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="w-24"
        />
      </div>

      {initial?.id && (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded"
          />
          <label htmlFor="isActive" className="text-sm">
            {t.active}
          </label>
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
          {t.save}
        </Button>
      </div>
    </form>
  );
}
