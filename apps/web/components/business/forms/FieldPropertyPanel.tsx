"use client";

import { useState, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
import { NumberInputField } from "./NumberInputField";
import { ConditionalLogicEditor } from "./ConditionalLogicEditor";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";
import { DatePicker } from "@/components/ui/date-picker";

const hasOptions = (type: string) =>
  ["SELECT", "MULTI_SELECT", "RADIO", "CHECKBOX_GROUP"].includes(type);

function AdvancedToggle({
  label,
  hasContent,
  children,
}: {
  label: string;
  hasContent: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(hasContent);
  return (
    <div>
      <button
        type="button"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 cursor-pointer"
        onClick={() => setOpen((v) => !v)}
      >
        <ChevronRight className={`size-3.5 transition-transform ${open ? "rotate-90" : ""}`} />
        {label}
        {hasContent && !open && <span className="size-1.5 rounded-full bg-primary ml-1" />}
      </button>
      {open && <div className="space-y-4 mt-2">{children}</div>}
    </div>
  );
}

export function FieldPropertyPanel({ language }: { language: Language }) {
  const t = formBuilderTranslations[language];
  const { form, selectedFieldId, updateField, moveFieldToSection } = useFormBuilderStore();
  const [bulkMode, setBulkMode] = useState(true);

  // Find field and its section
  let field: FormFieldDraft | undefined;
  let fieldSectionId: string | undefined;
  for (const s of form?.sections ?? []) {
    const found = s.fields.find((f) => f.id === selectedFieldId);
    if (found) {
      field = found;
      fieldSectionId = s.id;
      break;
    }
  }

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
  const sections = form?.sections ?? [];
  const showSectionSelect = sections.length >= 2 && fieldSectionId;

  const updateOptions = (newOptions: string[]) => {
    updateField(field!.id, {
      config: { ...field!.config, options: newOptions },
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">{t.properties}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Move field between sections */}
        {showSectionSelect && (
          <div>
            <Label className="text-xs">{t.belongsToSection}</Label>
            <Select
              value={fieldSectionId}
              onValueChange={(newSectionId) => {
                if (fieldSectionId && newSectionId !== fieldSectionId) {
                  moveFieldToSection(field!.id, fieldSectionId, newSectionId);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s, i) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.titleJa || s.title || `${t.section} ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div>
          <Label className="text-xs">{t.fieldLabel}</Label>
          <Input
            value={field.labelJa || field.label}
            onChange={(e) => updateField(field!.id, { label: e.target.value, labelJa: e.target.value })}
          />
        </div>

        {field.type !== "SECTION_HEADER" && (
          <>
            <AdvancedToggle
              label={t.advancedOptions}
              hasContent={!!(field.placeholder || (field.config?.description as string))}
            >
              <div>
                <Label className="text-xs">{t.fieldPlaceholder}</Label>
                <Input
                  value={field.placeholder ?? ""}
                  onChange={(e) =>
                    updateField(field!.id, { placeholder: e.target.value })
                  }
                />
              </div>

              <div>
                <Label className="text-xs">{t.fieldDescription}</Label>
                <Textarea
                  value={(field.config?.description as string) ?? ""}
                  onChange={(e) =>
                    updateField(field!.id, {
                      config: { ...field!.config, description: e.target.value || undefined },
                    })
                  }
                  placeholder={t.fieldDescriptionPlaceholder}
                  rows={3}
                  className="text-sm"
                />
              </div>
            </AdvancedToggle>

            {(field.type === "TEXT" || field.type === "TEXTAREA") && (
              <>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={field.type === "TEXTAREA" || field.config?.multiline === true}
                    onCheckedChange={(v) =>
                      updateField(field!.id, {
                        config: { ...field!.config, multiline: v },
                      })
                    }
                  />
                  <Label className="text-xs">{t.fieldMultiline}</Label>
                </div>
                {(field.type === "TEXTAREA" || field.config?.multiline === true) && (
                  <div>
                    <Label className="text-xs">{t.fieldMaxLength}</Label>
                    <NumberInputField
                      value={field.config?.maxLength != null ? Number(field.config.maxLength) : ""}
                      onChange={(v) =>
                        updateField(field!.id, {
                          config: {
                            ...field!.config,
                            maxLength: v === "" ? undefined : Number(v),
                          },
                        })
                      }
                      placeholder="—"
                      min={1}
                      step={10}
                      buttonLayout="right"
                    />
                  </div>
                )}
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(v) =>
                  updateField(field!.id, { required: v })
                }
              />
              <Label className="text-xs">{t.fieldRequired}</Label>
            </div>
          </>
        )}

        {/* Options for select/radio/checkbox */}
        {hasOptions(field.type) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">{t.fieldOptions}</Label>
              <div className="flex gap-1">
                <button
                  type="button"
                  className={`text-xs px-1.5 py-0.5 rounded ${!bulkMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setBulkMode(false)}
                >
                  {t.listInput}
                </button>
                <button
                  type="button"
                  className={`text-xs px-1.5 py-0.5 rounded ${bulkMode ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => setBulkMode(true)}
                >
                  {t.bulkInput}
                </button>
              </div>
            </div>

            {bulkMode ? (
              <Textarea
                value={options.join("\n")}
                onChange={(e) => {
                  const newOptions = e.target.value.split("\n");
                  updateOptions(newOptions);
                }}
                placeholder={t.bulkPlaceholder}
                rows={6}
                className="text-sm"
              />
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* Allow "other" free input */}
        {hasOptions(field.type) && (
          <div className="flex items-center gap-2">
            <Switch
              checked={field.config?.allowOther === true}
              onCheckedChange={(v) =>
                updateField(field!.id, {
                  config: { ...field!.config, allowOther: v },
                })
              }
            />
            <Label className="text-xs">{t.allowOther}</Label>
          </div>
        )}

        {/* Default value for radio */}
        {field.type === "RADIO" && options.length > 0 && (
          <div>
            <Label className="text-xs">{t.radioDefaultValue}</Label>
            <Select
              value={(field.config?.defaultValue as string) ?? "__none__"}
              onValueChange={(v) =>
                updateField(field!.id, {
                  config: { ...field!.config, defaultValue: v === "__none__" ? undefined : v },
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t.radioDefaultNone} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t.radioDefaultNone}</SelectItem>
                {options.filter(o => o.trim()).map((opt, i) => (
                  <SelectItem key={`${i}-${opt}`} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Options layout for radio/checkbox */}
        {(field.type === "RADIO" || field.type === "CHECKBOX_GROUP" || field.type === "MULTI_SELECT") && (
          <div>
            <Label className="text-xs">{t.optionsLayout}</Label>
            <Select
              value={String(field.config?.layout ?? "vertical")}
              onValueChange={(v) =>
                updateField(field!.id, {
                  config: { ...field!.config, layout: v },
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">{t.layoutVertical}</SelectItem>
                <SelectItem value="horizontal">{t.layoutHorizontal}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Number config */}
        {field.type === "NUMBER" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">{t.numberMin}</Label>
                <Input
                  type="number"
                  value={field.config?.min != null ? String(field.config.min) : ""}
                  onChange={(e) =>
                    updateField(field!.id, {
                      config: {
                        ...field!.config,
                        min: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    })
                  }
                  placeholder="—"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">{t.numberMax}</Label>
                <Input
                  type="number"
                  value={field.config?.max != null ? String(field.config.max) : ""}
                  onChange={(e) =>
                    updateField(field!.id, {
                      config: {
                        ...field!.config,
                        max: e.target.value === "" ? undefined : Number(e.target.value),
                      },
                    })
                  }
                  placeholder="—"
                  className="text-sm"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">{t.numberButtonLayout}</Label>
              <Select
                value={String(field.config?.buttonLayout ?? "sides")}
                onValueChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, buttonLayout: v },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sides">{t.numberButtonSides}</SelectItem>
                  <SelectItem value="right">{t.numberButtonRight}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Date slots config */}
        {field.type === "DATE_SLOTS" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t.dateSlotsCount}</Label>
              <Select
                value={String((field.config?.slotCount as number) ?? 3)}
                onValueChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, slotCount: Number(v) },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t.dateMin}</Label>
              <DatePicker
                value={(field.config?.dateMin as string) ?? ""}
                onChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, dateMin: v || undefined },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">{t.dateMax}</Label>
              <DatePicker
                value={(field.config?.dateMax as string) ?? ""}
                onChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, dateMax: v || undefined },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">{t.optionsLayout}</Label>
              <Select
                value={String(field.config?.layout ?? "vertical")}
                onValueChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, layout: v },
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vertical">{t.layoutVertical}</SelectItem>
                  <SelectItem value="horizontal">{t.layoutHorizontal}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Date config */}
        {field.type === "DATE" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t.dateMin}</Label>
              <DatePicker
                value={(field.config?.dateMin as string) ?? ""}
                onChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, dateMin: v || undefined },
                  })
                }
              />
            </div>
            <div>
              <Label className="text-xs">{t.dateMax}</Label>
              <DatePicker
                value={(field.config?.dateMax as string) ?? ""}
                onChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, dateMax: v || undefined },
                  })
                }
              />
            </div>
          </div>
        )}

        {/* Rating config */}
        {field.type === "RATING" && (
          <div>
            <Label className="text-xs">Max</Label>
            <Select
              value={String((field.config?.max as number) ?? 5)}
              onValueChange={(v) =>
                updateField(field!.id, {
                  config: { ...field!.config, max: Number(v) },
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

        {/* YES_NO config */}
        {field.type === "YES_NO" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">{t.yesNoYesLabel}</Label>
              <Input
                value={(field.config?.yesLabel as string) ?? ""}
                onChange={(e) =>
                  updateField(field!.id, {
                    config: { ...field!.config, yesLabel: e.target.value || undefined },
                  })
                }
                placeholder="はい"
                className="text-sm"
              />
            </div>
            <div>
              <Label className="text-xs">{t.yesNoNoLabel}</Label>
              <Input
                value={(field.config?.noLabel as string) ?? ""}
                onChange={(e) =>
                  updateField(field!.id, {
                    config: { ...field!.config, noLabel: e.target.value || undefined },
                  })
                }
                placeholder="いいえ"
                className="text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={field.config?.defaultValue === true}
                onCheckedChange={(v) =>
                  updateField(field!.id, {
                    config: { ...field!.config, defaultValue: v },
                  })
                }
              />
              <Label className="text-xs">{t.yesNoDefaultValue}</Label>
            </div>
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
