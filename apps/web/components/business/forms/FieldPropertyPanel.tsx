"use client";

import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { ConditionalLogicEditor } from "./ConditionalLogicEditor";
import { formBuilderTranslations, type Language } from "@/app/(menus)/(manager)/form-builder/translations";

const hasOptions = (type: string) =>
  ["SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX_GROUP"].includes(type);

export function FieldPropertyPanel({ language }: { language: Language }) {
  const t = formBuilderTranslations[language];
  const { form, selectedFieldId, updateField } = useFormBuilderStore();

  const field = form?.sections
    .flatMap((s) => s.fields)
    .find((f) => f.id === selectedFieldId);

  if (!field) {
    return (
      <Card className="h-fit">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground text-center">
            {t.noFieldSelected}
          </p>
        </CardContent>
      </Card>
    );
  }

  const options: string[] = (field.config?.options as string[]) ?? [];

  const updateOptions = (newOptions: string[]) => {
    updateField(field.id, {
      config: { ...field.config, options: newOptions },
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t.properties}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">{t.fieldLabel}</Label>
          <Input
            value={field.label}
            onChange={(e) => updateField(field.id, { label: e.target.value })}
          />
        </div>

        <div>
          <Label className="text-xs">{t.fieldLabelJa}</Label>
          <Input
            value={field.labelJa ?? ""}
            onChange={(e) =>
              updateField(field.id, { labelJa: e.target.value })
            }
          />
        </div>

        {field.type !== "SECTION_HEADER" && (
          <>
            <div>
              <Label className="text-xs">{t.fieldPlaceholder}</Label>
              <Input
                value={field.placeholder ?? ""}
                onChange={(e) =>
                  updateField(field.id, { placeholder: e.target.value })
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(v) =>
                  updateField(field.id, { required: v })
                }
              />
              <Label className="text-xs">{t.fieldRequired}</Label>
            </div>
          </>
        )}

        {/* Options for select/radio/checkbox */}
        {hasOptions(field.type) && (
          <div className="space-y-2">
            <Label className="text-xs">{t.fieldOptions}</Label>
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-1">
                <Input
                  value={opt}
                  onChange={(e) => {
                    const newOpts = [...options];
                    newOpts[i] = e.target.value;
                    updateOptions(newOpts);
                  }}
                  placeholder={`${t.optionLabel} ${i + 1}`}
                  className="text-sm"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive px-2"
                  onClick={() => updateOptions(options.filter((_, j) => j !== i))}
                >
                  x
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => updateOptions([...options, ""])}
            >
              {t.addOption}
            </Button>
          </div>
        )}

        {/* Rating config */}
        {field.type === "RATING" && (
          <div>
            <Label className="text-xs">Max</Label>
            <Select
              value={String((field.config?.max as number) ?? 5)}
              onValueChange={(v) =>
                updateField(field.id, {
                  config: { ...field.config, max: Number(v) },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[3, 4, 5, 7, 10].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Conditional logic */}
        {field.type !== "SECTION_HEADER" && (
          <ConditionalLogicEditor field={field} language={language} />
        )}
      </CardContent>
    </Card>
  );
}
