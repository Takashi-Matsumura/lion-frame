"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, BackButton, Card, CardContent, CardHeader, CardTitle, PageSkeleton } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormFieldRenderer } from "@/components/business/forms/FormFieldRenderer";
import { evaluateConditions, type ConditionalLogic } from "@/lib/addon-modules/forms/condition-evaluator";
import { formsTranslations, type Language } from "../translations";

interface FormField {
  id: string;
  type: string;
  label: string;
  labelJa: string | null;
  placeholder: string | null;
  required: boolean;
  order: number;
  config: Record<string, unknown>;
  conditionalLogic: ConditionalLogic | null;
}

interface FormSection {
  id: string;
  title: string | null;
  titleJa: string | null;
  description: string | null;
  order: number;
  fields: FormField[];
}

interface FormData {
  id: string;
  title: string;
  titleJa: string | null;
  description: string | null;
  descriptionJa: string | null;
  status: string;
  allowMultiple: boolean;
  sections: FormSection[];
}

function formatAnswerDisplay(val: unknown): string {
  if (val == null || val === "") return "";
  if (Array.isArray(val)) return val.length > 0 ? val.join(", ") : "";
  if (typeof val === "number") return String(val);
  return String(val);
}

export function FormAnswerClient({
  formId,
  language,
}: {
  formId: string;
  language: Language;
}) {
  const t = formsTranslations[language];
  const router = useRouter();
  const [form, setForm] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setForm(data.form);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [formId, t.loadError]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const updateAnswer = (fieldId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    setConfirmOpen(false);

    try {
      const answerArray = Object.entries(answers).map(([fieldId, value]) => ({
        fieldId,
        value,
      }));

      const res = await fetch(`/api/forms/${formId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerArray }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Submit failed");
      }

      toast.success(t.submitted);
      router.push("/forms");
    } catch (e) {
      toast.error((e as Error).message || t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form) return <PageSkeleton />;

  if (form.status !== "PUBLISHED") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <BackButton onClick={() => router.push("/forms")} />
        <Card className="text-center py-12">
          <CardContent>
            <p className="text-muted-foreground">{t.formClosed}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = form.sections;
  const multiSection = sections.length > 1;
  const section = sections[currentSection];
  const visibleSections = multiSection ? [section] : sections;

  const progress = multiSection
    ? ((currentSection + 1) / sections.length) * 100
    : 100;

  return (
    <div className="flex flex-col h-[calc(100vh-128px)] overflow-hidden">
      {/* Header: BackButton + Title Card */}
      <div className="max-w-3xl mx-auto w-full shrink-0">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="py-2 px-4">
            <div className="flex items-center gap-3">
              <BackButton onClick={() => router.push("/forms")} />
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">
                  {language === "ja" && form.titleJa ? form.titleJa : form.title}
                </CardTitle>
                {(language === "ja" ? form.descriptionJa : form.description) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {language === "ja" ? form.descriptionJa : form.description}
                  </p>
                )}
              </div>
            </div>
            {multiSection && (
              <div className="space-y-0.5 pt-1.5">
                <p className="text-xs text-muted-foreground">
                  {t.sectionOf
                    .replace("{current}", String(currentSection + 1))
                    .replace("{total}", String(sections.length))}
                </p>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </CardHeader>
        </Card>
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto mt-4">
        <div className="max-w-3xl mx-auto space-y-6 pb-6">

          {/* Fields */}
          {visibleSections.map((sec) => (
            <Card key={sec.id}>
              {sec.title && (
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    {language === "ja" && sec.titleJa ? sec.titleJa : sec.title}
                  </CardTitle>
                  {sec.description && (
                    <p className="text-sm text-muted-foreground">
                      {sec.description}
                    </p>
                  )}
                </CardHeader>
              )}
              <CardContent className="space-y-4">
                {sec.fields.map((field) => {
                  const visible = evaluateConditions(
                    field.conditionalLogic,
                    answers,
                  );
                  if (!visible) return null;

                  return (
                    <FormFieldRenderer
                      key={field.id}
                      field={field}
                      value={answers[field.id]}
                      onChange={(v) => updateAnswer(field.id, v)}
                      language={language}
                    />
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {/* Navigation */}
          <div className="flex justify-between">
            {multiSection && currentSection > 0 ? (
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentSection((s) => s - 1);
                  scrollRef.current?.scrollTo({ top: 0 });
                }}
              >
                {t.previous}
              </Button>
            ) : (
              <div />
            )}

            {multiSection && currentSection < sections.length - 1 ? (
              <Button onClick={() => {
                setCurrentSection((s) => s + 1);
                scrollRef.current?.scrollTo({ top: 0 });
              }}>
                {t.next}
              </Button>
            ) : (
              <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                {submitting ? t.submitting : t.submit}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm dialog with answer review */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t.confirmTitle}</DialogTitle>
            <DialogDescription>{t.confirmDescription}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 py-2">
            {form.sections.map((sec) => (
              <div key={sec.id}>
                {sec.title && (
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5">
                    {language === "ja" && sec.titleJa ? sec.titleJa : sec.title}
                  </p>
                )}
                {sec.fields
                  .filter((f) => f.type !== "SECTION_HEADER" && evaluateConditions(f.conditionalLogic, answers))
                  .map((field) => {
                    const label = (language === "ja" && field.labelJa) || field.label;
                    const val = answers[field.id];
                    const display = formatAnswerDisplay(val);
                    const isEmpty = !display;
                    return (
                      <div key={field.id} className="flex items-baseline gap-2 py-1 border-b border-border last:border-0">
                        <span className="text-xs text-muted-foreground shrink-0 w-1/3 truncate">
                          {label}
                          {field.required && <span className="text-destructive ml-0.5">*</span>}
                        </span>
                        <span className={`text-sm flex-1 ${isEmpty ? "text-muted-foreground/50 italic" : "text-foreground"}`}>
                          {isEmpty ? (language === "ja" ? "未入力" : "No answer") : display}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              {t.cancel}
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? t.submitting : t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
