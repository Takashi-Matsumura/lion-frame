"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  PageSkeleton,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { formsTranslations, type Language } from "./translations";

interface FormItem {
  id: string;
  title: string;
  titleJa: string | null;
  description: string | null;
  descriptionJa: string | null;
  status: string;
  responseCount: number;
  mySubmissionStatus: string | null;
  creator: { id: string; name: string | null };
  createdAt: string;
  updatedAt: string;
}

const NEW_DAYS = 7;

function isNewForm(form: FormItem): boolean {
  const diff = Date.now() - new Date(form.updatedAt).getTime();
  return diff < NEW_DAYS * 24 * 60 * 60 * 1000;
}

export function FormsClient({ language }: { language: Language }) {
  const t = formsTranslations[language];
  const router = useRouter();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadForms = useCallback(async () => {
    try {
      const res = await fetch("/api/forms");
      if (!res.ok) throw new Error();
      const data = await res.json();
      // USER向け: PUBLISHEDのみ表示
      setForms(
        (data.forms ?? []).filter(
          (f: FormItem) => f.status === "PUBLISHED",
        ),
      );
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.subtitle}</p>

      {forms.length === 0 ? (
        <EmptyState message={t.noForms} description={t.noFormsDescription} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => {
            const answered = form.mySubmissionStatus === "SUBMITTED";
            const isNew = !answered && isNewForm(form);
            return (
              <Card
                key={form.id}
                className={`cursor-pointer shadow-sm hover:shadow-md hover:border-primary/50 transition-all ${isNew ? "border-primary/30" : ""}`}
                onClick={() => router.push(`/forms/${form.id}`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base line-clamp-2">
                      {form.titleJa || form.title}
                    </CardTitle>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isNew && (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px] px-1.5 py-0">
                          New
                        </Badge>
                      )}
                      <Badge
                        className={
                          answered
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }
                      >
                        {answered ? t.answered : t.notAnswered}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {(form.descriptionJa || form.description) && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {form.descriptionJa || form.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {t.by} {form.creator.name ?? "-"}
                    </span>
                    <span>
                      {form.responseCount} {t.responses}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
