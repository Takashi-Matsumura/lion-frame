"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { FormFieldRenderer } from "./FormFieldRenderer";
import { evaluateConditions, type ConditionalLogic } from "@/lib/addon-modules/forms/condition-evaluator";
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";
import type { FormDraft } from "@/lib/addon-modules/forms/form-builder-store";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: FormDraft;
  language: Language;
}

export function FormPreviewDialog({ open, onOpenChange, form, language }: Props) {
  const t = formBuilderTranslations[language];
  const [answers, setAnswers] = useState<Record<string, unknown>>({});

  const handleChange = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.previewTitle}</DialogTitle>
          <DialogDescription>{t.previewDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Form header */}
          <div>
            <h2 className="text-lg font-semibold">
              {form.titleJa || form.title}
            </h2>
            {(form.descriptionJa || form.description) && (
              <p className="text-sm text-muted-foreground mt-1">
                {form.descriptionJa || form.description}
              </p>
            )}
          </div>

          {/* Sections */}
          {form.sections.map((section) => {
            const sectionTitle = section.titleJa || section.title;
            return (
              <Card key={section.id}>
                {sectionTitle && (
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{sectionTitle}</CardTitle>
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
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
      </DialogContent>
    </Dialog>
  );
}
