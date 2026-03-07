"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@/components/ui";
import { LoadingSpinner } from "@/components/ui";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formBuilderTranslations, type Language } from "@/app/(menus)/(manager)/form-builder/translations";

interface Answer {
  id: string;
  value: unknown;
  field: { id: string; label: string; labelJa: string | null; type: string };
}

interface Submission {
  id: string;
  submittedAt: string;
  submitter: { id: string; name: string | null; email: string | null };
  answers: Answer[];
}

export function FormResponsesPanel({
  formId,
  language,
}: {
  formId: string;
  language: Language;
}) {
  const t = formBuilderTranslations[language];
  const [responses, setResponses] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/responses`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResponses(data.responses ?? []);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [formId, t.loadError]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingSpinner />;

  if (responses.length === 0) {
    return (
      <EmptyState
        message={t.noResponses}
        description={t.noResponsesDescription}
      />
    );
  }

  // フィールドの順序を最初の回答から取得
  const fieldOrder = responses[0]?.answers.map((a) => a.field) ?? [];

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {t.responsesTitle} ({responses.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.respondent}</TableHead>
                <TableHead>{t.submittedAt}</TableHead>
                {fieldOrder.map((f) => (
                  <TableHead key={f.id}>
                    {f.labelJa || f.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.map((sub) => {
                const answerMap = new Map(
                  sub.answers.map((a) => [a.field.id, a.value]),
                );
                return (
                  <TableRow key={sub.id}>
                    <TableCell>
                      {sub.submitter.name ?? sub.submitter.email ?? "-"}
                    </TableCell>
                    <TableCell>
                      {new Date(sub.submittedAt).toLocaleDateString(
                        language === "ja" ? "ja-JP" : "en-US",
                      )}
                    </TableCell>
                    {fieldOrder.map((f) => (
                      <TableCell key={f.id}>
                        {formatValue(answerMap.get(f.id))}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
