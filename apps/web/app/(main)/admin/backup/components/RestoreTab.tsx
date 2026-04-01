"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { BackupFile, RestorePreviewRow } from "@/lib/addon-modules/backup/types";
import { backupTranslations } from "../translations";

interface RestoreTabProps {
  language: "en" | "ja";
}

export function RestoreTab({ language }: RestoreTabProps) {
  const t = backupTranslations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [backupData, setBackupData] = useState<BackupFile | null>(null);
  const [preview, setPreview] = useState<RestorePreviewRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = useCallback(
    async (file: File) => {
      setMessage(null);
      setPreview(null);
      setBackupData(null);
      setFileName(file.name);
      setLoading(true);

      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as BackupFile;

        if (!parsed.manifest || !parsed.data) {
          setMessage({ type: "error", text: t.invalidFile });
          setLoading(false);
          return;
        }

        setBackupData(parsed);

        // プレビュー取得
        const response = await fetch("/api/backup/preview", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept-Language": language,
          },
          body: JSON.stringify(parsed),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Preview failed");
        }

        const data = await response.json();
        setPreview(data.preview);
      } catch (e) {
        const msg = e instanceof Error ? e.message : t.invalidFile;
        setMessage({ type: "error", text: msg });
      } finally {
        setLoading(false);
      }
    },
    [language, t],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect],
  );

  const handleRestore = useCallback(async () => {
    if (!backupData) return;

    setRestoring(true);
    setMessage(null);

    try {
      // リストア前に自動バックアップ
      setMessage({ type: "success", text: t.preRestoreBackup });
      const exportRes = await fetch("/api/backup/export");
      if (exportRes.ok) {
        const blob = await exportRes.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `lionframe-pre-restore-backup-${new Date().toISOString().split("T")[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }

      // リストア実行
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backupData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Restore failed");
      }

      const result = await response.json();
      setMessage({
        type: "success",
        text: `${t.restoreSuccess} (${result.totalRecords} records)`,
      });

      // プレビューとバックアップデータをクリア
      setPreview(null);
      setBackupData(null);
      setFileName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.restoreError;
      setMessage({ type: "error", text: msg });
    } finally {
      setRestoring(false);
    }
  }, [backupData, t]);

  const handleCancel = useCallback(() => {
    setBackupData(null);
    setPreview(null);
    setFileName("");
    setMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.restoreDescription}</p>

      {/* 警告バナー */}
      <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {t.restoreWarning}
        </p>
      </div>

      {/* ファイルアップロード */}
      {!preview && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleInputChange}
            className="hidden"
          />
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.loadingPreview}</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {fileName || t.dropFileHere}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t.supportedFormat}
              </p>
            </>
          )}
        </div>
      )}

      {/* プレビュー */}
      {preview && backupData && (
        <div className="space-y-4">
          {/* バックアップ情報 */}
          <div className="bg-muted/50 rounded-lg px-4 py-3">
            <h4 className="text-sm font-medium mb-2">{t.backupInfo}</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {t.backupCreatedAt}:{" "}
                </span>
                <span>
                  {new Date(backupData.manifest.createdAt).toLocaleString(
                    language === "ja" ? "ja-JP" : "en-US",
                  )}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {t.backupCreatedBy}:{" "}
                </span>
                <span>{backupData.manifest.createdBy}</span>
              </div>
            </div>
          </div>

          {/* 差分テーブル */}
          <h4 className="text-sm font-medium">{t.previewTitle}</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                    {t.previewModel}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    {t.previewCurrent}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    {t.previewBackup}
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                    {t.previewDiff}
                  </th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => {
                  const diff = row.backup - row.current;
                  return (
                    <tr key={row.model} className="border-b border-border/50">
                      <td className="py-2 px-3">{row.modelJa}</td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {row.current.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">
                        {row.backup.toLocaleString()}
                      </td>
                      <td
                        className={`py-2 px-3 text-right tabular-nums ${
                          diff > 0
                            ? "text-green-600 dark:text-green-400"
                            : diff < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-muted-foreground"
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff === 0 ? "0" : diff}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-3">
            <Button
              variant="destructive"
              onClick={handleRestore}
              disabled={restoring}
              loading={restoring}
            >
              {restoring ? t.restoring : t.confirmRestore}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={restoring}
            >
              {t.cancelRestore}
            </Button>
          </div>
        </div>
      )}

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
    </div>
  );
}
