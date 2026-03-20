"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
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
import { formBuilderTranslations, type Language } from "@/app/(main)/(menus)/(manager)/form-builder/translations";

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

  const formatValue = (value: unknown, fieldType?: string): string => {
    if (value === null || value === undefined) return "-";
    if (fieldType === "YES_NO") return value === true || value === "true" ? "はい" : "いいえ";
    if (fieldType === "EMPLOYEE_PICKER" && typeof value === "string") {
      try {
        const emp = JSON.parse(value);
        if (emp?.name) return `${emp.name} (${emp.employeeId})`;
      } catch { /* not JSON */ }
    }
    if (Array.isArray(value)) return value.filter((v) => v !== "__other__").join(", ");
    if (value === "__other__") return "その他";
    return String(value);
  };

  const handleExportXlsx = async () => {
    try {
      const res = await fetch(`/api/forms/${formId}/responses/export`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Content-Dispositionからファイル名を取得
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="?(.+?)"?$/);
      a.download = match?.[1] ? decodeURIComponent(match[1]) : "回答一覧.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t.loadError);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {t.responsesTitle} ({responses.length})
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleExportXlsx}
          >
            <Download className="h-4 w-4" />
            {t.exportXlsx}
          </Button>
        </div>
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
                        {formatValue(answerMap.get(f.id), f.type)}
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
