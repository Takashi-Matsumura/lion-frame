"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { FormFieldRenderer } from "./FormFieldRenderer";
import { evaluateConditions, type ConditionalLogic } from "@/lib/addon-modules/forms/condition-evaluator";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";
import type { FormDraft } from "@/lib/addon-modules/forms/form-builder-store";

function getDefaultAnswers(form: FormDraft): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const section of form.sections) {
    for (const field of section.fields) {
      if (field.type === "RADIO" && field.config?.defaultValue) {
        defaults[field.id] = field.config.defaultValue as string;
      } else if (field.type === "YES_NO" && field.config?.defaultValue === true) {
        defaults[field.id] = true;
      }
    }
  }
  return defaults;
}

export function FormReviewPanel({
  form,
  language,
}: {
  form: FormDraft;
  language: Language;
}) {
  const t = formBuilderTranslations[language];
  const [answers, setAnswers] = useState<Record<string, unknown>>(() =>
    getDefaultAnswers(form),
  );

  useEffect(() => {
    setAnswers(getDefaultAnswers(form));
  }, [form]);

  const handleChange = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const allFields = form.sections.flatMap((s) => s.fields);
  const fieldCount = allFields.filter((f) => f.type !== "SECTION_HEADER").length;
  const requiredCount = allFields.filter((f) => f.required).length;
  const sectionCount = form.sections.length;

  return (
    <div className="space-y-4">
      {/* Summary badges */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t.reviewTitle}</CardTitle>
          <p className="text-xs text-muted-foreground">{t.reviewDescription}</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <div className="text-center">
              <div className="text-lg font-semibold">{fieldCount}</div>
              <div className="text-xs text-muted-foreground">{t.reviewFieldCount}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">{sectionCount}</div>
              <div className="text-xs text-muted-foreground">{t.reviewSectionCount}</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-destructive">{requiredCount}</div>
              <div className="text-xs text-muted-foreground">{t.reviewRequiredCount}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Live preview */}
      <div className="space-y-4">
        {/* Form header */}
        <Card>
          <CardContent className="pt-4">
            <h3 className="text-base font-semibold">{form.titleJa || form.title}</h3>
            {(form.descriptionJa || form.description) && (
              <p className="text-sm text-muted-foreground mt-1">
                {form.descriptionJa || form.description}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sections */}
        {form.sections
          .filter((section) =>
            evaluateConditions(
              section.conditionalLogic as ConditionalLogic | null,
              answers,
            ),
          )
          .map((section) => {
            const sectionTitle = section.titleJa || section.title;
            return (
              <Card key={section.id}>
                {sectionTitle && (
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{sectionTitle}</CardTitle>
                    {section.description && (
                      <p className="text-xs text-muted-foreground">
                        {section.description}
                      </p>
                    )}
                  </CardHeader>
                )}
                <CardContent className="space-y-4">
                  {section.fields.map((field) => {
                    const visible = evaluateConditions(
                      field.conditionalLogic as ConditionalLogic | null,
                      answers,
                    );
                    if (!visible) return null;

                    return (
                      <FormFieldRenderer
                        key={field.id}
                        field={{
                          id: field.id,
                          type: field.type,
                          label: field.label,
                          labelJa: field.labelJa ?? null,
                          placeholder: field.placeholder ?? null,
                          required: field.required,
                          config: field.config,
                        }}
                        value={answers[field.id] ?? ""}
                        onChange={(v) => handleChange(field.id, v)}
                        language={language}
                      />
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
      </div>
    </div>
  );
}
