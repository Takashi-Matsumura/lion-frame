"use client";

import type { Language } from "./translations";

export interface FormField {
  name: string;
  type: string;
  label: string;
  labelJa: string;
  required: boolean;
  options?: { value: string; label: string; labelJa: string }[];
}

export interface FormSchema {
  fields: FormField[];
}

interface WorkflowFormFieldsProps {
  schema: FormSchema;
  language: Language;
  values: Record<string, unknown>;
  onChange: (values: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function WorkflowFormFields({
  schema,
  language,
  values,
  onChange,
  disabled = false,
}: WorkflowFormFieldsProps) {
  const handleChange = (name: string, value: unknown) => {
    onChange({ ...values, [name]: value });
  };

  return (
    <div className="space-y-4">
      {schema.fields.map((field) => {
        const label = language === "ja" ? field.labelJa : field.label;

        return (
          <div key={field.name} className="space-y-1.5">
            <label
              htmlFor={`field-${field.name}`}
              className="block text-sm font-medium text-foreground"
            >
              {label}
              {field.required && (
                <span className="ml-1 text-red-500">*</span>
              )}
            </label>

            {field.type === "textarea" ? (
              <textarea
                id={`field-${field.name}`}
                value={(values[field.name] as string) || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                disabled={disabled}
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            ) : field.type === "select" ? (
              <select
                id={`field-${field.name}`}
                value={(values[field.name] as string) || ""}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                disabled={disabled}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">—</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {language === "ja" ? opt.labelJa : opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id={`field-${field.name}`}
                type={field.type}
                value={(values[field.name] as string) || ""}
                onChange={(e) =>
                  handleChange(
                    field.name,
                    field.type === "number"
                      ? e.target.value === ""
                        ? ""
                        : Number(e.target.value)
                      : e.target.value,
                  )
                }
                required={field.required}
                disabled={disabled}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * フォームデータを読み取り専用で表示
 */
export function WorkflowFormDisplay({
  schema,
  language,
  values,
}: {
  schema: FormSchema;
  language: Language;
  values: Record<string, unknown>;
}) {
  return (
    <div className="space-y-3">
      {schema.fields.map((field) => {
        const label = language === "ja" ? field.labelJa : field.label;
        let displayValue = values[field.name];

        // selectの場合はラベルに変換
        if (field.type === "select" && field.options) {
          const opt = field.options.find((o) => o.value === displayValue);
          displayValue = opt
            ? language === "ja"
              ? opt.labelJa
              : opt.label
            : displayValue;
        }

        // 数値で金額系はフォーマット
        if (field.type === "number" && typeof displayValue === "number") {
          displayValue = displayValue.toLocaleString();
        }

        return (
          <div key={field.name} className="flex items-start gap-2">
            <span className="w-28 shrink-0 text-sm text-muted-foreground">
              {label}
            </span>
            <span className="text-sm font-medium">
              {String(displayValue ?? "—")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
