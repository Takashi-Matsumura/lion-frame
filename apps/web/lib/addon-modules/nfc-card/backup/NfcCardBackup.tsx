"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { nfcCardBackupTranslations } from "./translations";
import type { NfcCardBackupFile, NfcCardRestorePreview } from "./types";
/** クライアントサイドのバリデーション */
function isValidNfcCardBackup(data: unknown): data is NfcCardBackupFile {
  if (!data || typeof data !== "object") return false;
  const file = data as Record<string, unknown>;
  if (!file.manifest || typeof file.manifest !== "object") return false;
  const manifest = file.manifest as Record<string, unknown>;
  if (manifest.version !== "1.0") return false;
  if (manifest.module !== "nfc-card") return false;
  if (manifest.framework !== "LionFrame") return false;
  if (!file.data || typeof file.data !== "object") return false;
  const fileData = file.data as Record<string, unknown>;
  if (!Array.isArray(fileData.nfcCards)) return false;
  return true;
}

interface NfcCardBackupProps {
  language: "en" | "ja";
}

export default function NfcCardBackup({ language }: NfcCardBackupProps) {
  const t = nfcCardBackupTranslations[language];
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    revoked: number;
  } | null>(null);

  // Restore state
  const [backupData, setBackupData] = useState<NfcCardBackupFile | null>(null);
  const [preview, setPreview] = useState<NfcCardRestorePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 現在のデータ統計を取得
  useEffect(() => {
    fetch("/api/nfc-card?activeOnly=false")
      .then((res) => res.json())
      .then((data) => {
        if (data.cards) {
          const total = data.cards.length;
          const active = data.cards.filter(
            (c: { isActive: boolean }) => c.isActive,
          ).length;
          setStats({ total, active, revoked: total - active });
        }
      })
      .catch(() => {});
  }, []);

  // エクスポート
  const handleExport = useCallback(async () => {
    setExporting(true);
    setMessage(null);

    try {
      const response = await fetch("/api/nfc-card/backup/export");
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="([^"]+)"/);
      a.download = filenameMatch?.[1] || "nfc-card-backup.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setMessage({ type: "success", text: t.exportSuccess });
    } catch {
      setMessage({ type: "error", text: t.exportError });
    } finally {
      setExporting(false);
    }
  }, [t]);

  // ファイル選択
  const handleFileSelect = useCallback(
    async (file: File) => {
      setMessage(null);
      setPreview(null);
      setBackupData(null);
      setFileName(file.name);
      setLoading(true);

      try {
        const text = await file.text();
        const parsed = JSON.parse(text);

        if (!isValidNfcCardBackup(parsed)) {
          setMessage({ type: "error", text: t.invalidFile });
          setLoading(false);
          return;
        }

        setBackupData(parsed);

        const response = await fetch("/api/nfc-card/backup/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
    [t],
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

  // リストア実行
  const handleRestore = useCallback(async () => {
    if (!backupData) return;

    setRestoring(true);
    setMessage(null);

    try {
      const response = await fetch("/api/nfc-card/backup/restore", {
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
        text: `${t.restoreSuccess} (${result.restored} records)`,
      });

      setPreview(null);
      setBackupData(null);
      setFileName("");

      // 統計更新
      setStats({
        total: result.restored,
        active: backupData.data.nfcCards.filter((c) => c.isActive).length,
        revoked: backupData.data.nfcCards.filter((c) => !c.isActive).length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.restoreError;
      if (msg.includes("employees not found")) {
        setMessage({ type: "error", text: t.employeeMissing });
      } else {
        setMessage({ type: "error", text: msg });
      }
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
    <div className="space-y-8">
      {/* === エクスポートセクション === */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t.exportTitle}</h3>
        <p className="text-sm text-muted-foreground">{t.exportDescription}</p>

        {/* 現在のデータ統計 */}
        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center px-4 py-3 rounded-lg bg-muted">
              <div className="text-lg font-semibold tabular-nums">
                {stats.total}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.totalCards}
              </div>
            </div>
            <div className="text-center px-4 py-3 rounded-lg bg-muted">
              <div className="text-lg font-semibold tabular-nums text-green-600 dark:text-green-400">
                {stats.active}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.activeCards}
              </div>
            </div>
            <div className="text-center px-4 py-3 rounded-lg bg-muted">
              <div className="text-lg font-semibold tabular-nums text-muted-foreground">
                {stats.revoked}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.revokedCards}
              </div>
            </div>
          </div>
        )}

        <Button
          onClick={handleExport}
          disabled={exporting}
          loading={exporting}
        >
          {exporting ? t.exporting : t.exportButton}
        </Button>
      </div>

      <hr className="border-border" />

      {/* === リストアセクション === */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">{t.restoreTitle}</h3>
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
              <p className="text-sm text-muted-foreground">
                {t.loadingPreview}
              </p>
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
              <div className="text-sm">
                <span className="text-muted-foreground">
                  {t.backupCreatedAt}:{" "}
                </span>
                <span>
                  {new Date(backupData.manifest.createdAt).toLocaleString(
                    language === "ja" ? "ja-JP" : "en-US",
                  )}
                </span>
              </div>
            </div>

            {/* プレビューテーブル */}
            <h4 className="text-sm font-medium">{t.previewTitle}</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 font-medium text-muted-foreground">
                      &nbsp;
                    </th>
                    <th className="text-right py-2 px-3 font-medium text-muted-foreground">
                      &nbsp;
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">{t.previewCurrent}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {preview.currentCount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3">{t.previewBackup}</td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {preview.backupCount.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted-foreground pl-6">
                      {t.previewActive}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums text-green-600 dark:text-green-400">
                      {preview.activeInBackup.toLocaleString()}
                    </td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 text-muted-foreground pl-6">
                      {t.previewRevoked}
                    </td>
                    <td className="py-2 px-3 text-right tabular-nums">
                      {preview.revokedInBackup.toLocaleString()}
                    </td>
                  </tr>
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
    </div>
  );
}
