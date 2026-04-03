"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface FileItem {
  id: string;
  name: string;
  size: number;
  status: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  securityChecks?: { name: string; passed: boolean; description: string }[];
}

interface SandboxData {
  id: string;
  files: FileItem[];
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

const STATUS_LABELS: Record<string, { text: string; className: string }> = {
  pending: {
    text: "チェック中",
    className:
      "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
  },
  approved: {
    text: "承認済み",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  rejected: {
    text: "拒否",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
};

const REJECTION_REASONS: Record<string, string> = {
  unknown_file_type: "未知のファイル形式",
  unsupported_extension: "非対応の拡張子",
  extension_mismatch: "拡張子と実際の形式が不一致",
  mime_mismatch: "MIMEタイプが不一致",
  decode_failed: "画像として読み込めません",
};

type Phase = "join" | "sandbox";

export function SenderClient({ sandboxId }: { sandboxId: string }) {
  const [phase, setPhase] = useState<Phase>("join");
  const [pin, setPin] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState<SandboxData | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restore token from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`watasu-token-${sandboxId}`);
    if (stored) {
      setToken(stored);
      setPhase("sandbox");
    }
  }, [sandboxId]);

  // Poll sandbox
  const fetchSandbox = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/watasu/sandboxes/${sandboxId}`, {
        headers: { "x-sandbox-token": token },
      });
      if (res.status === 404) {
        // Sandbox expired
        sessionStorage.removeItem(`watasu-token-${sandboxId}`);
        setPhase("join");
        setToken(null);
        setError("サンドボックスの有効期限が切れました");
        return;
      }
      if (!res.ok) return;
      const data: SandboxData = await res.json();
      setSandbox(data);
    } catch {
      // ignore
    }
  }, [sandboxId, token]);

  useEffect(() => {
    if (phase !== "sandbox") return;
    fetchSandbox();
    const interval = setInterval(fetchSandbox, 2000);
    return () => clearInterval(interval);
  }, [phase, fetchSandbox]);

  // Countdown
  useEffect(() => {
    if (!sandbox?.expiresAt) return;
    function tick() {
      const ms = sandbox!.expiresAt - Date.now();
      setRemaining(ms > 0 ? ms : 0);
    }
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [sandbox?.expiresAt]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (pin.length !== 6 || pin !== sandboxId) {
      setError("PINが正しくありません");
      return;
    }
    setJoining(true);
    setError("");

    try {
      const res = await fetch("/api/watasu/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sandboxId }),
      });
      if (res.status === 404) {
        setError("サンドボックスが見つかりません");
        setJoining(false);
        return;
      }
      if (!res.ok) {
        setError("エラーが発生しました");
        setJoining(false);
        return;
      }
      const data = await res.json();
      sessionStorage.setItem(`watasu-token-${sandboxId}`, data.joinerToken);
      setToken(data.joinerToken);
      setPhase("sandbox");
    } catch {
      setError("エラーが発生しました");
    } finally {
      setJoining(false);
    }
  }

  function upload(files: FileList | File[]) {
    if (files.length === 0 || !token) return;
    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    for (const file of files) {
      formData.append("files", file);
    }

    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      setUploading(false);
      setProgress(0);
      fetchSandbox();
    });
    xhr.addEventListener("error", () => {
      setUploading(false);
      setProgress(0);
    });
    xhr.open("POST", "/api/watasu/upload");
    xhr.setRequestHeader("x-sandbox-token", token);
    xhr.setRequestHeader("x-sandbox-id", sandboxId);
    xhr.send(formData);
  }

  // Join phase
  if (phase === "join") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-bold text-center mb-1">モバイル転送</h1>
          <p className="text-sm text-center text-muted-foreground mb-6">
            画像をPCへ安全に転送
          </p>
          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="6桁のPINを入力"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="w-full h-12 px-4 rounded-2xl border border-border bg-background text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button
              type="submit"
              disabled={joining || pin.length !== 6}
              className="w-full h-12 bg-primary text-primary-foreground font-semibold rounded-2xl transition-colors disabled:opacity-30"
            >
              {joining ? "参加中..." : "参加する（送信側）"}
            </button>
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Sandbox phase
  const isExpiringSoon = remaining !== null && remaining < 5 * 60 * 1000;
  const files = sandbox?.files ?? [];

  return (
    <div className="flex flex-1 flex-col p-4 max-w-lg mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
          PIN
        </div>
        <div className="text-3xl font-mono font-bold tracking-[0.3em]">
          {sandboxId}
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            送信側（スマホ）
          </span>
          {remaining !== null && (
            <span
              className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                isExpiringSoon
                  ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {remaining === 0
                ? "期限切れ"
                : `残り ${formatCountdown(remaining)}`}
            </span>
          )}
        </div>
      </div>

      {/* Upload */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          upload(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center h-36 rounded-2xl border-2 border-dashed cursor-pointer transition-colors mb-4 ${
          dragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) upload(e.target.files);
            e.target.value = "";
          }}
        />
        {uploading ? (
          <>
            <div className="text-sm text-muted-foreground mb-2">
              アップロード中...
            </div>
            <div className="w-48 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {progress}%
            </div>
          </>
        ) : (
          <>
            <svg
              className="w-8 h-8 mb-2 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z"
              />
            </svg>
            <div className="text-sm text-muted-foreground">
              タップして画像を選択
            </div>
            <div className="text-xs text-muted-foreground/70 mt-1">
              JPEG / PNG / GIF / HEIC
            </div>
          </>
        )}
      </div>

      {/* File list */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          ファイル ({files.length})
        </h3>
        {files.length === 0 ? (
          <div className="text-center text-muted-foreground py-6 text-sm">
            画像をアップロードしてください。
          </div>
        ) : (
          <ul className="space-y-2">
            {files.map((file) => {
              const status = STATUS_LABELS[file.status];
              return (
                <li
                  key={file.id}
                  className="p-3 rounded-xl bg-muted/50"
                >
                  <div className="text-sm font-medium truncate">
                    {file.name}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">
                      {formatSize(file.size)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.className}`}
                    >
                      {status.text}
                    </span>
                  </div>
                  {file.status === "rejected" && file.rejectionReason && (
                    <div className="text-xs text-red-500 mt-1">
                      {REJECTION_REASONS[file.rejectionReason] ??
                        file.rejectionReason}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
