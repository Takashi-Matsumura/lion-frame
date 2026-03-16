"use client";

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
import { EmployeePickerField } from "./EmployeePickerField";
import { DepartmentPickerField } from "./DepartmentPickerField";
import { NumberInputField } from "./NumberInputField";
import { RatingField } from "./RatingField";

interface FieldConfig {
  options?: string[];
  max?: number;
  min?: number;
  step?: number;
  buttonLayout?: "sides" | "right";
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
        return (
          <Input
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
          />
        );

      case "TEXTAREA":
        return (
          <Textarea
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={4}
          />
        );

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
          <Input
            type="date"
            value={String(value ?? "")}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "SELECT":
        return (
          <Select
            value={String(value ?? "")}
            onValueChange={(v) => onChange(v)}
          >
            <SelectTrigger>
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
        );

      case "MULTI_SELECT":
      case "CHECKBOX_GROUP": {
        const selected = Array.isArray(value) ? (value as string[]) : [];
        return (
          <div className="space-y-2">
            {(field.config?.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selected, opt]);
                    } else {
                      onChange(selected.filter((s) => s !== opt));
                    }
                  }}
                  className="rounded border-input"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );
      }

      case "RADIO":
        return (
          <div className="space-y-2">
            {(field.config?.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name={field.id}
                  checked={value === opt}
                  onChange={() => onChange(opt)}
                  className="border-input"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        );

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
      <Label className="text-sm">
        {label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {renderInput()}
    </div>
  );
}
