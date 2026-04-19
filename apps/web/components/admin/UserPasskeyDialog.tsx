"use client";

import { Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Credential = {
  id: string;
  credentialId: string;
  nickname: string | null;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

interface UserPasskeyDialogProps {
  language: "en" | "ja";
  userId: string;
  userLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserPasskeyDialog({
  language,
  userId,
  userLabel,
  open,
  onOpenChange,
}: UserPasskeyDialogProps) {
  const t = (en: string, ja: string) => (language === "ja" ? ja : en);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${userId}/webauthn`);
      if (!res.ok) throw new Error("failed to load");
      const data = (await res.json()) as { credentials: Credential[] };
      setCredentials(data.credentials);
    } catch (_error) {
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const handleDelete = useCallback(
    async (credential: Credential) => {
      const msg = t(
        `Are you sure you want to force-delete this passkey? The user will no longer be able to sign in with it.`,
        "このパスキーを強制削除してよろしいですか？ ユーザはこのパスキーでサインインできなくなります。",
      );
      if (!confirm(msg)) return;
      setBusy(credential.id);
      try {
        const res = await fetch(
          `/api/admin/users/${userId}/webauthn/${credential.id}`,
          { method: "DELETE" },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.errorJa ?? data.error ?? "delete failed");
        }
        await load();
      } catch (error) {
        alert(
          t(
            error instanceof Error
              ? error.message
              : "Failed to delete passkey",
            error instanceof Error
              ? error.message
              : "パスキーの削除に失敗しました",
          ),
        );
      } finally {
        setBusy(null);
      }
    },
    [userId, load, t],
  );

  const formatDate = useCallback(
    (iso: string | null) => {
      if (!iso) return t("Never", "未使用");
      return new Date(iso).toLocaleString(
        language === "ja" ? "ja-JP" : "en-US",
      );
    },
    [language, t],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("Passkeys", "パスキー")}</DialogTitle>
          <DialogDescription>
            {t(
              `Manage passkeys registered for ${userLabel}.`,
              `${userLabel} のパスキーを管理します。`,
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-6">…</p>
        ) : credentials.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t(
              "This user has not registered any passkeys.",
              "このユーザはパスキーを登録していません。",
            )}
          </p>
        ) : (
          <ul className="divide-y border rounded-lg max-h-[50vh] overflow-y-auto">
            {credentials.map((c) => (
              <li key={c.id} className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {c.nickname ??
                      (language === "ja" ? "（未設定）" : "(unnamed)")}
                  </p>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                    <span>
                      {t("Added", "登録日時")}: {formatDate(c.createdAt)}
                    </span>
                    <span>
                      {t("Last used", "最終使用")}:{" "}
                      {formatDate(c.lastUsedAt)}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {c.deviceType === "multiDevice"
                        ? t("Syncs across devices", "デバイス間で同期")
                        : t("This device only", "このデバイス専用")}
                    </Badge>
                    {c.transports.map((tp) => (
                      <Badge key={tp} variant="outline" className="text-xs">
                        {tp}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(c)}
                  disabled={busy === c.id}
                  loading={busy === c.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("Close", "閉じる")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
