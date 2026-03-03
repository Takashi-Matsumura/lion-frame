"use client";

import { useCallback, useState } from "react";
import {
  FaCheckCircle,
  FaDownload,
  FaExclamationTriangle,
  FaFileExcel,
  FaTimes,
  FaUpload,
} from "react-icons/fa";
import type { PreviewResult } from "@/lib/importers/organization/types";
import type { DataManagementTranslation } from "../translations";
import { PreviewDialog } from "./PreviewDialog";

interface ImportTabProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
}

export function ImportTab({ organizationId, language, t }: ImportTabProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [markMissingAsRetired, setMarkMissingAsRetired] = useState(false);
  const [defaultEffectiveDate, setDefaultEffectiveDate] = useState(
    () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date()),
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      const selected = files[0];

      // XLSXのみ受付
      if (!selected.name.toLowerCase().endsWith(".xlsx")) {
        setError(
          language === "ja"
            ? "XLSXファイルのみ対応しています"
            : "Only XLSX files are supported",
        );
        return;
      }

      setFile(selected);
      setError(null);
      setSuccess(null);
      setPreview(null);
      setWarnings([]);
    },
    [language],
  );

  const handlePreview = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setWarnings([]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("organizationId", organizationId);

      const response = await fetch("/api/admin/organization/import/preview", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Preview failed");
      }

      const result = await response.json();
      setPreview(result.preview);
      setShowPreview(true);
      if (result.warnings?.length > 0) {
        setWarnings(result.warnings);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("organizationId", organizationId);
      formData.append("markMissingAsRetired", String(markMissingAsRetired));
      formData.append("defaultEffectiveDate", defaultEffectiveDate);

      const response = await fetch("/api/admin/organization/import", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Import failed");
      }

      const result = await response.json();
      setSuccess(
        `${t.importSuccess}: ${result.statistics.created} ${language === "ja" ? "名追加" : "added"}, ${result.statistics.updated} ${language === "ja" ? "名更新" : "updated"}, ${result.statistics.transferred} ${language === "ja" ? "名異動" : "transferred"}`,
      );
      setShowPreview(false);
      setFile(null);
      setPreview(null);
      setWarnings([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.importError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        const dropped = droppedFiles[0];
        if (!dropped.name.toLowerCase().endsWith(".xlsx")) {
          setError(
            language === "ja"
              ? "XLSXファイルのみ対応しています"
              : "Only XLSX files are supported",
          );
          return;
        }
        setFile(dropped);
        setError(null);
        setSuccess(null);
        setPreview(null);
        setWarnings([]);
      }
    },
    [language],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setError(null);
    setSuccess(null);
    setWarnings([]);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaUpload className="w-6 h-6 text-primary" />
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {t.importTitle}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t.importDescription}
            </p>
          </div>
        </div>
        <a
          href="/api/admin/organization/import/template"
          className="flex items-center gap-2 px-4 py-2 text-sm text-primary border border-input rounded-md hover:bg-muted transition-colors"
        >
          <FaDownload className="w-4 h-4" />
          {t.downloadTemplate}
        </a>
      </div>

      {/* File Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
        onClick={() => document.getElementById("file-input")?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx"
          onChange={handleFileChange}
          className="hidden"
        />
        <FaFileExcel className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-foreground font-medium mb-2">{t.dropFileHere}</p>
        <p className="text-sm text-muted-foreground">{t.supportedFormats}</p>
        <p className="text-sm text-muted-foreground">{t.maxFileSize}</p>
      </div>

      {/* Selected File */}
      {file && (
        <div className="mt-4">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <FaFileExcel className="w-5 h-5 text-green-600 dark:text-green-400" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clearFile();
              }}
              className="p-1 text-muted-foreground hover:text-destructive transition-colors"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Options */}
      {file && (
        <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
          {/* デフォルト発令日 */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {language === "ja" ? "デフォルト発令日" : "Default Effective Date"}
            </label>
            <p className="text-xs text-muted-foreground mb-2">
              {language === "ja"
                ? "CSV行に「発令日」カラムがない場合、この日付が適用されます"
                : "Used when rows don't have an 'Effective Date' column"}
            </p>
            <input
              type="date"
              value={defaultEffectiveDate}
              onChange={(e) => setDefaultEffectiveDate(e.target.value)}
              className="px-3 py-1.5 text-sm border border-input rounded-md bg-background text-foreground"
            />
          </div>

          {/* 退職処理オプション */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={markMissingAsRetired}
              onChange={(e) => setMarkMissingAsRetired(e.target.checked)}
              className="mt-1"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                {t.markMissingAsRetired}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.markMissingAsRetiredDesc}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          {warnings.map((w) => (
            <p key={w} className="text-sm text-yellow-700 dark:text-yellow-300">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
          <FaExclamationTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
          <FaCheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Action Buttons */}
      {file && (
        <div className="mt-6 flex gap-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={isLoading}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? t.loading : t.preview}
          </button>
        </div>
      )}

      {/* Preview Dialog */}
      {showPreview && preview && (
        <PreviewDialog
          preview={preview}
          language={language}
          t={t}
          onClose={() => setShowPreview(false)}
          onConfirm={handleImport}
          isLoading={isLoading}
        />
      )}
    </div>
  );
}
