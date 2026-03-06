"use client";

import type { FieldType } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useFormBuilderStore } from "@/lib/addon-modules/forms/form-builder-store";
import { formBuilderTranslations, type Language } from "@/app/(menus)/(manager)/form-builder/translations";

const fieldTypes: { type: FieldType; icon: string }[] = [
  { type: "TEXT", icon: "Aa" },
  { type: "TEXTAREA", icon: "T" },
  { type: "NUMBER", icon: "#" },
  { type: "DATE", icon: "D" },
  { type: "SELECT", icon: "v" },
  { type: "MULTI_SELECT", icon: "M" },
  { type: "RADIO", icon: "O" },
  { type: "CHECKBOX_GROUP", icon: "X" },
  { type: "RATING", icon: "*" },
  { type: "EMPLOYEE_PICKER", icon: "E" },
  { type: "DEPARTMENT_PICKER", icon: "B" },
  { type: "SECTION_HEADER", icon: "S" },
];

const fieldTypeLabels: Record<FieldType, { en: string; ja: string }> = {
  TEXT: { en: "Text", ja: "テキスト" },
  TEXTAREA: { en: "Long Text", ja: "長文テキスト" },
  NUMBER: { en: "Number", ja: "数値" },
  DATE: { en: "Date", ja: "日付" },
  SELECT: { en: "Dropdown", ja: "ドロップダウン" },
  MULTI_SELECT: { en: "Multi Select", ja: "複数選択" },
  RADIO: { en: "Radio", ja: "ラジオ" },
  CHECKBOX_GROUP: { en: "Checkbox", ja: "チェックボックス" },
  RATING: { en: "Rating", ja: "評価" },
  EMPLOYEE_PICKER: { en: "Employee", ja: "社員" },
  DEPARTMENT_PICKER: { en: "Department", ja: "部署" },
  SECTION_HEADER: { en: "Section", ja: "セクション" },
  CALCULATED: { en: "Calculated", ja: "計算" },
};

export function FieldPalette({ language }: { language: Language }) {
  const t = formBuilderTranslations[language];
  const { form, addField } = useFormBuilderStore();

  const handleAdd = (type: FieldType) => {
    if (!form || form.sections.length === 0) return;
    // 最後のセクションに追加
    const lastSection = form.sections[form.sections.length - 1];
    addField(lastSection.id, type);
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t.fieldPalette}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {fieldTypes.map(({ type, icon }) => (
          <button
            key={type}
            type="button"
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left rounded-md hover:bg-accent transition-colors"
            onClick={() => handleAdd(type)}
          >
            <span className="w-6 h-6 flex items-center justify-center bg-muted rounded text-xs font-mono">
              {icon}
            </span>
            <span>
              {language === "ja"
                ? fieldTypeLabels[type].ja
                : fieldTypeLabels[type].en}
            </span>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
