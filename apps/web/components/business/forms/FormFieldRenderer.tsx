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
import { DepartmentPickerField } from "./DepartmentPickerField";
import { NumberInputField } from "./NumberInputField";
import { RatingField } from "./RatingField";
import { DatePicker } from "@/components/ui/date-picker";

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
        return (
          <div className="flex items-center gap-1">
            <Select
              value={selectValue}
              onValueChange={(v) => onChange(v)}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
              <SelectContent>
                {(field.config?.options ?? []).map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
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
        );
      }

      case "MULTI_SELECT":
      case "CHECKBOX_GROUP": {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        const horizontal = field.config?.layout === "horizontal";
        return (
          <div className={horizontal ? "flex flex-wrap gap-x-4 gap-y-2" : "space-y-2"}>
            {(field.config?.options ?? []).map((opt) => (
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
          </div>
        );
      }

      case "RADIO": {
        const radioHorizontal = field.config?.layout === "horizontal";
        return (
          <RadioGroup
            value={String(value ?? "")}
            onValueChange={(v) => onChange(v)}
            className={radioHorizontal ? "flex flex-wrap gap-x-4 gap-y-2" : undefined}
          >
            {(field.config?.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <RadioGroupItem value={opt} />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </RadioGroup>
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

      case "EMPLOYEE_PICKER":
        return (
          <EmployeePickerField
            value={String(value ?? "")}
            onChange={(v) => onChange(v)}
            language={language}
          />
        );

      case "DEPARTMENT_PICKER":
        return (
          <DepartmentPickerField
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
