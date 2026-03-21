"use client";

import { Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useFormBuilderStore,
  type FormFieldDraft,
  type FormSectionDraft,
} from "@/lib/addon-modules/forms/form-builder-store";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";

const operators = [
  "eq",
  "ne",
  "gt",
  "lt",
  "contains",
  "not_empty",
  "is_empty",
] as const;

type LogicData = NonNullable<FormFieldDraft["conditionalLogic"]>;

function ConditionalLogicEditorCore({
  logic,
  referenceFields,
  onUpdate,
  onClear,
  language,
}: {
  logic: LogicData;
  referenceFields: FormFieldDraft[];
  onUpdate: (partial: Partial<LogicData>) => void;
  onClear: () => void;
  language: Language;
}) {
  const t = formBuilderTranslations[language];

  const hasConditions = logic.conditions.length > 0;

  const operatorLabels: Record<string, string> = {
    eq: t.operatorEq,
    ne: t.operatorNe,
    gt: t.operatorGt,
    lt: t.operatorLt,
    contains: t.operatorContains,
    not_empty: t.operatorNotEmpty,
    is_empty: t.operatorIsEmpty,
  };

  return (
    <div className="space-y-2 border-t pt-4">
      <Label className="text-xs font-medium">{t.conditionalLogic}</Label>

      {hasConditions && (
        <>
          <div className="flex gap-2">
            <Select
              value={logic.action}
              onValueChange={(v) =>
                onUpdate({ action: v as "show" | "hide" })
              }
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="show">{t.logicShow}</SelectItem>
                <SelectItem value="hide">{t.logicHide}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={logic.logic}
              onValueChange={(v) =>
                onUpdate({ logic: v as "and" | "or" })
              }
            >
              <SelectTrigger className="text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="and">{t.logicAnd}</SelectItem>
                <SelectItem value="or">{t.logicOr}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {logic.conditions.map((cond, i) => (
            <div key={i} className="space-y-1 border rounded p-2 bg-muted/30">
              <Select
                value={cond.fieldId}
                onValueChange={(v) => {
                  const conditions = [...logic.conditions];
                  conditions[i] = { ...cond, fieldId: v };
                  onUpdate({ conditions });
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder={t.conditionField} />
                </SelectTrigger>
                <SelectContent>
                  {referenceFields.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.labelJa || f.label || f.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Select
                  value={cond.operator}
                  onValueChange={(v) => {
                    const conditions = [...logic.conditions];
                    conditions[i] = { ...cond, operator: v };
                    onUpdate({ conditions });
                  }}
                >
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op} value={op}>
                        {operatorLabels[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!["is_empty", "not_empty"].includes(cond.operator) && (
                  <Input
                    value={String(cond.value ?? "")}
                    onChange={(e) => {
                      const conditions = [...logic.conditions];
                      conditions[i] = { ...cond, value: e.target.value };
                      onUpdate({ conditions });
                    }}
                    placeholder={t.conditionValue}
                    className="text-xs h-8"
                  />
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-2 h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const conditions = logic.conditions.filter(
                      (_, j) => j !== i,
                    );
                    if (conditions.length === 0) {
                      onClear();
                    } else {
                      onUpdate({ conditions });
                    }
                  }}
                >
                  x
                </Button>
              </div>
            </div>
          ))}
        </>
      )}

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={() => {
          onUpdate({
            conditions: [
              ...logic.conditions,
              { fieldId: "", operator: "eq", value: "" },
            ],
          });
        }}
        disabled={referenceFields.length === 0}
      >
        {t.addCondition}
      </Button>
    </div>
  );
}

export function ConditionalLogicEditor({
  field,
  language,
}: {
  field: FormFieldDraft;
  language: Language;
}) {
  const { form, updateField } = useFormBuilderStore();

  const allFields = form?.sections.flatMap((s) => s.fields) ?? [];
  const otherFields = allFields.filter(
    (f) => f.id !== field.id && f.type !== "SECTION_HEADER",
  );

  const logic = field.conditionalLogic ?? {
    action: "show" as const,
    logic: "and" as const,
    conditions: [],
  };

  return (
    <ConditionalLogicEditorCore
      logic={logic}
      referenceFields={otherFields}
      onUpdate={(partial) =>
        updateField(field.id, {
          conditionalLogic: { ...logic, ...partial },
        })
      }
      onClear={() => updateField(field.id, { conditionalLogic: null })}
      language={language}
    />
  );
}

export function SectionConditionalLogicEditor({
  section,
  language,
}: {
  section: FormSectionDraft;
  language: Language;
}) {
  const { form, updateSection } = useFormBuilderStore();

  // セクションの条件には、このセクションより前のフィールドのみ参照可能
  const sectionIndex = form?.sections.findIndex((s) => s.id === section.id) ?? -1;
  const precedingFields = (form?.sections ?? [])
    .slice(0, sectionIndex)
    .flatMap((s) => s.fields)
    .filter((f) => f.type !== "SECTION_HEADER");

  const logic = section.conditionalLogic ?? {
    action: "show" as const,
    logic: "and" as const,
    conditions: [],
  };

  return (
    <ConditionalLogicEditorCore
      logic={logic}
      referenceFields={precedingFields}
      onUpdate={(partial) =>
        updateSection(section.id, {
          conditionalLogic: { ...logic, ...partial },
        })
      }
      onClear={() => updateSection(section.id, { conditionalLogic: null })}
      language={language}
    />
  );
}
