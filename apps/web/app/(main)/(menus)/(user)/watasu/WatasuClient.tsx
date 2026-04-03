"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Copy, Check, QrCode, X, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { watasuTranslations, type Language } from "./translations";

interface FileItem {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  securityChecks?: { name: string; passed: boolean; description: string }[];
}

interface SandboxInfo {
  id: string;
  files: FileItem[];
  createdAt: number;
  role: "receiver" | "sender";
  expiresAt: number;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const STATUS_MAP = {
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

const REJECTION_REASONS: Record<string, string> = {
  unknown_file_type: "unknownFileType",
  unsupported_extension: "unsupportedExtension",
  extension_mismatch: "extensionMismatch",
  mime_mismatch: "mimeMismatch",
  decode_failed: "decodeFailed",
};

const CHECK_NAMES: Record<string, string> = {
  magic_bytes: "magicBytes",
  extension: "extension",
  mime_type: "mimeType",
  decode: "decode",
};

interface Props {
  language: Language;
}

export function WatasuClient({ language }: Props) {
  const t = watasuTranslations[language];
  const [sandboxes, setSandboxes] = useState<SandboxInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrId, setQrId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [selectedSandbox, setSelectedSandbox] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedChecks, setExpandedChecks] = useState<Set<string>>(new Set());
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [closingId, setClosingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const initialLoad = useRef(true);

  const fetchSandboxes = useCallback(async () => {
    try {
      const res = await fetch("/api/watasu/sandboxes");
      if (!res.ok) return;
      const data = await res.json();
      setSandboxes(data.sandboxes);
    } catch {
      // ignore
    } finally {
      if (initialLoad.current) {
        setLoading(false);
        initialLoad.current = false;
      }
    }
  }, []);

  useEffect(() => {
    fetchSandboxes();
    const interval = setInterval(fetchSandboxes, 2000);
    return () => clearInterval(interval);
  }, [fetchSandboxes]);

  // Countdown timers
  useEffect(() => {
    function tick() {
      const now = Date.now();
      const r: Record<string, number> = {};
      for (const sb of sandboxes) {
        const ms = sb.expiresAt - now;
        r[sb.id] = ms > 0 ? ms : 0;
      }
      setRemaining(r);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sandboxes]);

  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/watasu/sandboxes", { method: "POST" });
      if (res.ok) {
        await fetchSandboxes();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleClose(sandboxId: string) {
    setClosingId(sandboxId);
    try {
      await fetch(`/api/watasu/sandboxes/${sandboxId}`, { method: "DELETE" });
      if (selectedSandbox === sandboxId) setSelectedSandbox(null);
      await fetchSandboxes();
    } finally {
      setClosingId(null);
    }
  }

  function handleCopy(pin: string) {
    navigator.clipboard.writeText(pin);
    setCopiedId(pin);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function handleShowQr(sandboxId: string) {
    if (qrId === sandboxId) {
      setQrId(null);
      setQrDataUrl(null);
      return;
    }
    setQrId(sandboxId);
    const url = `${window.location.origin}/watasu/${sandboxId}`;
    try {
      const QRCode = (await import("qrcode")).default;
      const dataUrl = await QRCode.toDataURL(url, { width: 200, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      setQrDataUrl(null);
    }
  }

  async function handleDownload(sandboxId: string, fileId: string, fileName: string) {
    const res = await fetch(`/api/watasu/download/${fileId}?sandboxId=${sandboxId}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBulkDownload(sandboxId: string, files: FileItem[]) {
    const targets = files.filter(
      (f) => selected.has(f.id) && f.status === "approved",
    );
    for (const file of targets) {
      await handleDownload(sandboxId, file.id, file.name);
    }
  }

  const activeSandbox = sandboxes.find((sb) => sb.id === selectedSandbox);

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-full p-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-9 w-44 rounded-md" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-6 w-6 rounded" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* 左: サンドボックス一覧 */}
      <div className={`flex flex-col ${activeSandbox ? "w-[40%] border-r" : "w-full"} p-4`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t.activeSandboxes}
          </h2>
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            <Plus className="w-4 h-4 mr-1" />
            {creating ? t.creating : t.createSandbox}
          </Button>
        </div>

        {sandboxes.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">{t.noActiveSandboxes}</p>
          </div>
        ) : (
          <div className="space-y-2 overflow-y-auto">
            {sandboxes.map((sb) => {
              const rem = remaining[sb.id] ?? 0;
              const isExpiring = rem > 0 && rem < 5 * 60 * 1000;
              const isSelected = selectedSandbox === sb.id;

              return (
                <Card
                  key={sb.id}
                  className={`cursor-pointer transition-all ${isSelected ? "ring-2 ring-primary" : "hover:shadow-sm"}`}
                  onClick={() => setSelectedSandbox(isSelected ? null : sb.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* PIN */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(sb.id);
                          }}
                          className="font-mono text-lg font-bold tracking-[0.2em] hover:text-primary transition-colors"
                        >
                          {sb.id}
                        </button>
                        {copiedId === sb.id && (
                          <span className="text-xs text-green-600">
                            <Check className="w-3 h-3 inline" /> {t.copied}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* QR */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShowQr(sb.id);
                          }}
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>
                        {/* Countdown */}
                        <Badge
                          variant="outline"
                          className={
                            rem === 0
                              ? "text-red-600 border-red-300"
                              : isExpiring
                                ? "text-red-600 border-red-300"
                                : ""
                          }
                        >
                          {rem === 0 ? t.expired : `${t.remaining} ${formatCountdown(rem)}`}
                        </Badge>
                        {/* Files count */}
                        <Badge variant="secondary">
                          {t.files}: {sb.files.length}
                        </Badge>
                        {/* Close */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClose(sb.id);
                          }}
                          disabled={closingId === sb.id}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    {/* QR Code */}
                    {qrId === sb.id && qrDataUrl && (
                      <div className="mt-3 flex flex-col items-center">
                        <img
                          src={qrDataUrl}
                          alt="QR Code"
                          className="w-48 h-48 rounded-lg"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.scanQrToJoin}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 右: ファイル詳細 */}
      {activeSandbox && (
        <div className="w-[60%] flex flex-col p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium">
              {t.files} ({activeSandbox.files.length})
            </h2>
            {activeSandbox.files.filter((f) => f.status === "approved").length > 1 && (
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={
                      selected.size ===
                        activeSandbox.files.filter((f) => f.status === "approved").length &&
                      selected.size > 0
                    }
                    onChange={() => {
                      const approved = activeSandbox.files.filter(
                        (f) => f.status === "approved",
                      );
                      if (selected.size === approved.length) {
                        setSelected(new Set());
                      } else {
                        setSelected(new Set(approved.map((f) => f.id)));
                      }
                    }}
                    className="w-3.5 h-3.5 rounded accent-primary"
                  />
                  {t.selectAll}
                </label>
                {selected.size > 0 && (
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() =>
                      handleBulkDownload(activeSandbox.id, activeSandbox.files)
                    }
                  >
                    {t.downloadAll} ({selected.size})
                  </Button>
                )}
              </div>
            )}
          </div>

          {activeSandbox.files.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t.noFiles}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activeSandbox.files.map((file) => (
                <FileRow
                  key={file.id}
                  file={file}
                  sandboxId={activeSandbox.id}
                  language={language}
                  selected={selected.has(file.id)}
                  showCheckbox={
                    activeSandbox.files.filter((f) => f.status === "approved")
                      .length > 1
                  }
                  onToggleSelect={() => {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(file.id)) next.delete(file.id);
                      else next.add(file.id);
                      return next;
                    });
                  }}
                  expandedChecks={expandedChecks.has(file.id)}
                  onToggleChecks={() => {
                    setExpandedChecks((prev) => {
                      const next = new Set(prev);
                      if (next.has(file.id)) next.delete(file.id);
                      else next.add(file.id);
                      return next;
                    });
                  }}
                  onDownload={() =>
                    handleDownload(activeSandbox.id, file.id, file.name)
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Thumbnail({
  sandboxId,
  fileId,
  fileName,
}: {
  sandboxId: string;
  fileId: string;
  fileName: string;
}) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let revoked = false;
    fetch(`/api/watasu/thumbnail/${fileId}?sandboxId=${sandboxId}`)
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (blob && !revoked) {
          setSrc(URL.createObjectURL(blob));
        }
      });
    return () => {
      revoked = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sandboxId, fileId]);

  if (!src) {
    return (
      <div className="w-14 h-14 rounded-lg bg-muted animate-pulse shrink-0" />
    );
  }

  return (
    <img
      src={src}
      alt={fileName}
      className="w-14 h-14 rounded-lg object-cover shrink-0"
    />
  );
}

function FileRow({
  file,
  sandboxId,
  language,
  selected,
  showCheckbox,
  onToggleSelect,
  expandedChecks,
  onToggleChecks,
  onDownload,
}: {
  file: FileItem;
  sandboxId: string;
  language: Language;
  selected: boolean;
  showCheckbox: boolean;
  onToggleSelect: () => void;
  expandedChecks: boolean;
  onToggleChecks: () => void;
  onDownload: () => void;
}) {
  const t = watasuTranslations[language];
  const isApproved = file.status === "approved";
  const statusLabel =
    file.status === "approved"
      ? t.approved
      : file.status === "rejected"
        ? t.rejected
        : t.pending;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
      {showCheckbox && isApproved && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="w-3.5 h-3.5 rounded accent-primary shrink-0"
        />
      )}
      {isApproved && (
        <Thumbnail sandboxId={sandboxId} fileId={file.id} fileName={file.name} />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{file.name}</div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {formatSize(file.size)}
          </span>
          {file.securityChecks && file.securityChecks.length > 0 ? (
            <button
              type="button"
              onClick={onToggleChecks}
              className={`text-xs px-2 py-0.5 rounded-full font-medium cursor-pointer transition-opacity hover:opacity-80 ${STATUS_MAP[file.status]}`}
            >
              {statusLabel}
              <span className="ml-1 text-[10px]">
                {expandedChecks ? "\u25B2" : "\u25BC"}
              </span>
            </button>
          ) : (
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_MAP[file.status]}`}
            >
              {statusLabel}
            </span>
          )}
        </div>
        {file.status === "rejected" && file.rejectionReason && (
          <div className="text-xs text-red-500 mt-0.5">
            {t[REJECTION_REASONS[file.rejectionReason] as keyof typeof t] ??
              file.rejectionReason}
          </div>
        )}
        {expandedChecks &&
          file.securityChecks &&
          file.securityChecks.length > 0 && (
            <div className="mt-1.5 space-y-0.5">
              {file.securityChecks.map((check) => (
                <div
                  key={check.name}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                  <span
                    className={
                      check.passed ? "text-green-500" : "text-red-500"
                    }
                  >
                    {check.passed ? "\u2713" : "\u2717"}
                  </span>
                  <span className="font-medium">
                    {t[CHECK_NAMES[check.name] as keyof typeof t] ?? check.name}
                  </span>
                  <span className="text-muted-foreground/70">
                    {check.description}
                  </span>
                </div>
              ))}
            </div>
          )}
      </div>
      {isApproved && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8"
          onClick={onDownload}
        >
          {t.download}
        </Button>
      )}
    </div>
  );
}
