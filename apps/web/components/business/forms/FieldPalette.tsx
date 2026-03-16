"use client";

import { useState } from "react";
import type { FieldType } from "@prisma/client";
import {
  Type,
  AlignLeft,
  Hash,
  Calendar,
  ChevronDown,
  ListFilter,
  List,
  CircleDot,
  CheckSquare,
  Star,
  User,
  Building2,
  Heading,
  ChevronRight,
  ToggleLeft,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useFormBuilderStore } from "@/lib/addon-modules/forms/form-builder-store";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";

const fieldTypeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  TEXT: Type,
  TEXTAREA: AlignLeft,
  NUMBER: Hash,
  DATE: Calendar,
  SELECT: ChevronDown,
  MULTI_SELECT: ListFilter,
  RADIO: CircleDot,
  CHECKBOX_GROUP: CheckSquare,
  RATING: Star,
  EMPLOYEE_PICKER: User,
  DEPARTMENT_PICKER: Building2,
  SECTION_HEADER: Heading,
  YES_NO: ToggleLeft,
};

const fieldTypeLabels: Record<string, string> = {
  TEXT: "テキスト",
  TEXTAREA: "長文テキスト",
  NUMBER: "数値",
  DATE: "日付",
  SELECT: "ドロップ",
  MULTI_SELECT: "複数選択",
  RADIO: "ラジオ",
  CHECKBOX_GROUP: "チェック",
  RATING: "スター",
  EMPLOYEE_PICKER: "社員",
  DEPARTMENT_PICKER: "部署",
  SECTION_HEADER: "セクション",
  YES_NO: "はい/いいえ",
};

interface FieldGroup {
  label: string;
  types: FieldType[];
}

const fieldGroups: FieldGroup[] = [
  { label: "基本", types: ["TEXT", "NUMBER", "DATE"] },
  { label: "選択", types: ["SELECT", "RADIO", "CHECKBOX_GROUP", "YES_NO", "RATING"] },
  { label: "特殊", types: ["EMPLOYEE_PICKER", "DEPARTMENT_PICKER"] },
  { label: "レイアウト", types: ["SECTION_HEADER"] },
];

export function FieldPalette({ language }: { language: Language }) {
  const t = formBuilderTranslations[language];
  const { form, addField } = useFormBuilderStore();
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});

  const handleAdd = (type: FieldType) => {
    if (!form || form.sections.length === 0) return;
    const lastSection = form.sections[form.sections.length - 1];
    addField(lastSection.id, type);
  };

  const toggleGroup = (index: number) => {
    setCollapsed((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t.fieldPalette}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-3 pb-3">
        {fieldGroups.map((group, gi) => {
          const isCollapsed = !!collapsed[gi];
          return (
            <div key={gi}>
              <button
                type="button"
                className="flex items-center gap-1 w-full py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => toggleGroup(gi)}
              >
                <ChevronRight
                  className={`size-3.5 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
                />
                {group.label}
              </button>
              {!isCollapsed && (
                <div className="space-y-0.5 ml-1">
                  {group.types.map((type) => {
                    const Icon = fieldTypeIcon[type] ?? List;
                    return (
                      <button
                        key={type}
                        type="button"
                        className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left rounded-md hover:bg-accent transition-colors"
                        onClick={() => handleAdd(type)}
                      >
                        <span className="w-6 h-6 flex items-center justify-center bg-muted rounded shrink-0">
                          <Icon className="size-3.5" />
                        </span>
                        <span className="truncate">
                          {fieldTypeLabels[type] ?? type}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
