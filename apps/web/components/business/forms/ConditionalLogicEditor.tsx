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

export function ConditionalLogicEditor({
  field,
  language,
}: {
  field: FormFieldDraft;
  language: Language;
}) {
  const t = formBuilderTranslations[language];
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

  const update = (partial: Partial<typeof logic>) => {
    updateField(field.id, {
      conditionalLogic: { ...logic, ...partial },
    });
  };

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
                update({ action: v as "show" | "hide" })
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
                update({ logic: v as "and" | "or" })
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
                  update({ conditions });
                }}
              >
                <SelectTrigger className="text-xs h-8">
                  <SelectValue placeholder={t.conditionField} />
                </SelectTrigger>
                <SelectContent>
                  {otherFields.map((f) => (
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
                    update({ conditions });
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
                      update({ conditions });
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
                    update({ conditions });
                    if (conditions.length === 0) {
                      updateField(field.id, { conditionalLogic: null });
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
          update({
            conditions: [
              ...logic.conditions,
              { fieldId: "", operator: "eq", value: "" },
            ],
          });
        }}
        disabled={otherFields.length === 0}
      >
        {t.addCondition}
      </Button>
    </div>
  );
}
