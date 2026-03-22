"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Info, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { EmployeePickerField } from "./EmployeePickerField";
import { NumberInputField } from "./NumberInputField";
import { RatingField } from "./RatingField";
import { DatePicker } from "@/components/ui/date-picker";

const OTHER_VALUE = "__other__";
const OTHER_LABEL = "その他";
const OTHER_PLACEHOLDER = "入力してください";
const SLOT_LABEL = (i: number) => `第${i + 1}希望日`;

interface FieldConfig {
  options?: string[];
  max?: number;
  min?: number;
  step?: number;
  buttonLayout?: "sides" | "right";
  dateMin?: string; // YYYY-MM-DD
  dateMax?: string; // YYYY-MM-DD
  [key: string]: unknown;
}

interface FormFieldDef {
  id: string;
  type: string;
  label: string;
  labelJa?: string | null;
  placeholder?: string | null;
  required: boolean;
  config: FieldConfig;
}

interface Props {
  field: FormFieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  language: "en" | "ja";
}

export function FormFieldRenderer({ field, value, onChange, language }: Props) {
  const label = (language === "ja" && field.labelJa) || field.label;
  const placeholder = field.placeholder ?? "";
  const description = (field.config?.description as string) || "";

  if (field.type === "SECTION_HEADER") {
    return (
      <div className="pt-4 pb-2 border-b border-border">
        <h3 className="text-base font-semibold text-foreground">{label}</h3>
      </div>
    );
  }

  const renderInput = () => {
    switch (field.type) {
      case "TEXT":
      case "TEXTAREA": {
        if (field.type === "TEXTAREA" || field.config?.multiline === true) {
          const maxLen = field.config?.maxLength as number | undefined;
          const strVal = String(value ?? "");
          const charCount = strVal.length;
          const isOver = maxLen != null && charCount > maxLen;
          return (
            <div>
              <Textarea
                value={strVal}
                onChange={(e) => onChange(maxLen != null ? e.target.value.slice(0, maxLen) : e.target.value)}
                placeholder={placeholder}
                rows={4}
              />
              {maxLen != null && (
                <p className={`text-xs text-right mt-1 ${isOver ? "text-destructive" : "text-muted-foreground"}`}>
                  {charCount} / {maxLen}
                </p>
              )}
            </div>
          );
        }
        return (
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        );
      }

      case "NUMBER":
        return (
          <NumberInputField
            value={value === "" || value == null ? "" : Number(value)}
            onChange={(v) => onChange(v)}
            placeholder={placeholder}
            min={field.config?.min}
            max={field.config?.max}
            step={field.config?.step}
            buttonLayout={field.config?.buttonLayout}
          />
        );

      case "DATE":
        return (
          <DatePicker
            value={String(value ?? "")}
            onChange={(v) => onChange(v)}
            min={field.config?.dateMin}
            max={field.config?.dateMax}
          />
        );

      case "SELECT": {
        const selectValue = String(value ?? "");
        const selectOptions = field.config?.options ?? [];
        const selectAllowOther = field.config?.allowOther === true;
        const isOtherSelected = selectAllowOther && selectValue && !selectOptions.includes(selectValue) && selectValue !== OTHER_VALUE;
        const currentSelectVal = isOtherSelected ? OTHER_VALUE : selectValue;
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Select
                value={currentSelectVal}
                onValueChange={(v) => {
                  if (v === OTHER_VALUE) {
                    onChange(OTHER_VALUE);
                  } else {
                    onChange(v);
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {selectOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>
                      {opt}
                    </SelectItem>
                  ))}
                  {selectAllowOther && (
                    <SelectItem value={OTHER_VALUE}>{OTHER_LABEL}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectValue && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0 px-1 cursor-pointer"
                  aria-label="Clear"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            {selectAllowOther && (currentSelectVal === OTHER_VALUE || isOtherSelected) && (
              <Input
                value={isOtherSelected ? selectValue : ""}
                onChange={(e) => onChange(e.target.value || OTHER_VALUE)}
                placeholder={OTHER_PLACEHOLDER}
                autoFocus
              />
            )}
          </div>
        );
      }

      case "MULTI_SELECT":
      case "CHECKBOX_GROUP": {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        const horizontal = field.config?.layout === "horizontal";
        const cbAllowOther = field.config?.allowOther === true;
        const cbOptions = field.config?.options ?? [];
        const otherValues = cbAllowOther ? selected.filter((s) => !cbOptions.includes(s) && s !== OTHER_VALUE) : [];
        const hasOtherChecked = cbAllowOther && (selected.includes(OTHER_VALUE) || otherValues.length > 0);
        return (
          <div className="space-y-2">
            <div className={horizontal ? "flex flex-wrap gap-x-4 gap-y-2" : "space-y-2"}>
              {cbOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        onChange([...selected, opt]);
                      } else {
                        onChange(selected.filter((s) => s !== opt));
                      }
                    }}
                  />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {cbAllowOther && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={hasOtherChecked}
                    onCheckedChange={(checked) => {
                      if (checked === true) {
                        onChange([...selected.filter((s) => cbOptions.includes(s)), OTHER_VALUE]);
                      } else {
                        onChange(selected.filter((s) => cbOptions.includes(s)));
                      }
                    }}
                  />
                  <span className="text-sm">{OTHER_LABEL}</span>
                </label>
              )}
            </div>
            {hasOtherChecked && (
              <Input
                value={otherValues[0] ?? ""}
                onChange={(e) => {
                  const base = selected.filter((s) => cbOptions.includes(s));
                  onChange(e.target.value ? [...base, e.target.value] : [...base, OTHER_VALUE]);
                }}
                placeholder={OTHER_PLACEHOLDER}
                className="ml-6"
              />
            )}
          </div>
        );
      }

      case "RADIO": {
        const radioHorizontal = field.config?.layout === "horizontal";
        const radioAllowOther = field.config?.allowOther === true;
        const radioOptions = field.config?.options ?? [];
        const radioValue = String(value ?? "");
        const isRadioOther = radioAllowOther && radioValue && !radioOptions.includes(radioValue) && radioValue !== OTHER_VALUE;
        const radioGroupVal = isRadioOther ? OTHER_VALUE : radioValue;
        return (
          <div className="space-y-2">
            <RadioGroup
              value={radioGroupVal}
              onValueChange={(v) => onChange(v)}
              className={radioHorizontal ? "flex flex-wrap gap-x-4 gap-y-2" : undefined}
            >
              {radioOptions.map((opt) => (
                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={opt} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
              {radioAllowOther && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <RadioGroupItem value={OTHER_VALUE} />
                  <span className="text-sm">{OTHER_LABEL}</span>
                </label>
              )}
            </RadioGroup>
            {radioAllowOther && (radioGroupVal === OTHER_VALUE || isRadioOther) && (
              <Input
                value={isRadioOther ? radioValue : ""}
                onChange={(e) => onChange(e.target.value || OTHER_VALUE)}
                placeholder={OTHER_PLACEHOLDER}
                className="ml-6"
                autoFocus
              />
            )}
          </div>
        );
      }

      case "YES_NO": {
        const boolValue = value === true || value === "true";
        const yesLabel = (field.config?.yesLabel as string) || "はい";
        const noLabel = (field.config?.noLabel as string) || "いいえ";
        const toggle = () => onChange(!boolValue);
        return (
          <div className="flex items-center gap-3">
            <button type="button" onClick={toggle} className={`text-sm cursor-pointer ${!boolValue ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {noLabel}
            </button>
            <Switch
              checked={boolValue}
              onCheckedChange={(checked) => onChange(checked)}
            />
            <button type="button" onClick={toggle} className={`text-sm cursor-pointer ${boolValue ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {yesLabel}
            </button>
          </div>
        );
      }

      case "RATING":
        return (
          <RatingField
            value={Number(value ?? 0)}
            max={field.config?.max ?? 5}
            onChange={(v) => onChange(v)}
          />
        );

      case "DATE_SLOTS": {
        const slotCount = (field.config?.slotCount as number) ?? 3;
        const slots = Array.isArray(value) ? (value as string[]) : Array(slotCount).fill("");
        const slotLabels = field.config?.slotLabels as string[] | undefined;
        const slotsHorizontal = field.config?.layout === "horizontal";
        return (
          <div className={slotsHorizontal ? "flex flex-wrap gap-4" : "space-y-3"}>
            {Array.from({ length: slotCount }).map((_, i) => (
              <div key={i} className={slotsHorizontal ? "flex-1 min-w-[140px]" : ""}>
                <Label className="text-xs text-muted-foreground mb-1">
                  {slotLabels?.[i] || SLOT_LABEL(i)}
                </Label>
                <DatePicker
                  value={slots[i] ?? ""}
                  onChange={(v) => {
                    const newSlots = [...slots];
                    while (newSlots.length < slotCount) newSlots.push("");
                    newSlots[i] = v;
                    onChange(newSlots);
                  }}
                  min={field.config?.dateMin as string | undefined}
                  max={field.config?.dateMax as string | undefined}
                />
              </div>
            ))}
          </div>
        );
      }

      case "EMPLOYEE_PICKER":
        return (
          <EmployeePickerField
            value={String(value ?? "")}
            onChange={(v) => onChange(v)}
            language={language}
          />
        );

      default:
        return (
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        );
    }
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-sm flex items-center gap-1">
        {label}
        {field.required && <span className="text-destructive">*</span>}
        {description && (
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                <Info className="size-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="max-h-60 overflow-y-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {description}
                </ReactMarkdown>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </Label>
      {renderInput()}
    </div>
  );
}
