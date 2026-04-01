"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MODEL_NAMES, MODEL_NAMES_EN } from "@/lib/addon-modules/backup/types";
import type { BackupHistoryEntry } from "@/lib/addon-modules/backup/types";
import { backupTranslations } from "../translations";

interface CreateBackupTabProps {
  language: "en" | "ja";
}

export function CreateBackupTab({ language }: CreateBackupTabProps) {
  const t = backupTranslations[language];
  const names = language === "ja" ? MODEL_NAMES : MODEL_NAMES_EN;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupHistoryEntry | null>(null);

  useEffect(() => {
    fetch("/api/backup/history")
      .then((res) => res.json())
      .then((data) => {
        if (data.history?.length > 0) {
          setLastBackup(data.history[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleCreateBackup = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/backup/export");
      if (!response.ok) {
        throw new Error("Export failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // ファイル名をContent-Dispositionから取得
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      a.download = filenameMatch?.[1] || "lionframe-backup.json";

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage({ type: "success", text: t.createSuccess });

      // 履歴を更新
      const historyRes = await fetch("/api/backup/history");
      const historyData = await historyRes.json();
      if (historyData.history?.length > 0) {
        setLastBackup(historyData.history[0]);
      }
    } catch {
      setMessage({ type: "error", text: t.createError });
    } finally {
      setLoading(false);
    }
  }, [t]);

  return (
    <div className="space-y-6">
      {/* 説明 */}
      <p className="text-sm text-muted-foreground">{t.createDescription}</p>

      {/* 最終バックアップ */}
      <div className="text-sm">
        <span className="text-muted-foreground">{t.lastBackup}: </span>
        {lastBackup ? (
          <span className="font-medium">
            {new Date(lastBackup.createdAt).toLocaleString(
              language === "ja" ? "ja-JP" : "en-US",
            )}{" "}
            ({lastBackup.createdByName})
          </span>
        ) : (
          <span className="text-muted-foreground italic">{t.noBackupYet}</span>
        )}
      </div>

      {/* バックアップ作成ボタン */}
      <div>
        <Button
          onClick={handleCreateBackup}
          disabled={loading}
          loading={loading}
          size="lg"
        >
          {loading ? t.creating : t.createButton}
        </Button>
      </div>

      {/* メッセージ */}
      {message && (
        <div
          className={`text-sm px-4 py-3 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200"
              : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 対象モデル一覧 */}
      <div>
        <h3 className="text-sm font-medium mb-3">{t.targetModels}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {Object.entries(names).map(([key, name]) => (
            <div
              key={key}
              className="text-xs px-3 py-2 rounded-md bg-muted text-muted-foreground"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
