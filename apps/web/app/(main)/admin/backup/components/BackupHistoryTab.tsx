"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import type { BackupHistoryEntry } from "@/lib/addon-modules/backup/types";
import { backupTranslations } from "../translations";

interface BackupHistoryTabProps {
  language: "en" | "ja";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function BackupHistoryTab({ language }: BackupHistoryTabProps) {
  const t = backupTranslations[language];
  const [history, setHistory] = useState<BackupHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/backup/history")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data.history || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-12 bg-muted animate-pulse rounded-md"
          />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div>
        <p className="text-sm text-muted-foreground mb-6">
          {t.historyDescription}
        </p>
        <EmptyState
          message={t.historyEmpty}
          description={t.historyEmptyDescription}
        />
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">
        {t.historyDescription}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                {t.historyDate}
              </th>
              <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                {t.historyCreatedBy}
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                {t.historyRecords}
              </th>
              <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                {t.historySize}
              </th>
            </tr>
          </thead>
          <tbody>
            {history.map((entry) => (
              <tr key={entry.id} className="border-b border-border/50">
                <td className="py-2 px-3">
                  {new Date(entry.createdAt).toLocaleString(
                    language === "ja" ? "ja-JP" : "en-US",
                  )}
                </td>
                <td className="py-2 px-3">{entry.createdByName}</td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {entry.totalRecords.toLocaleString()}
                </td>
                <td className="py-2 px-3 text-right tabular-nums">
                  {formatBytes(entry.sizeBytes)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
