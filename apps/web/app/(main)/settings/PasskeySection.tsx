"use client";

import {
  browserSupportsWebAuthn,
  startRegistration,
} from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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

type PasskeyTranslations = {
  title: string;
  description: string;
  registerButton: string;
  registering: string;
  nicknamePlaceholder: string;
  saveNickname: string;
  cancel: string;
  delete: string;
  confirmDelete: string;
  lastUsedAt: string;
  createdAt: string;
  never: string;
  empty: string;
  registerSuccess: string;
  deleteSuccess: string;
  nicknameUpdated: string;
  error: string;
  notSupported: string;
  userCancelled: string;
  lastPasskeyBlocked: string;
  deviceSingle: string;
  deviceMulti: string;
};

interface PasskeySectionProps {
  language: "en" | "ja";
  translations: PasskeyTranslations;
}

export function PasskeySection({
  language,
  translations: t,
}: PasskeySectionProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [nickname, setNickname] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNickname, setEditingNickname] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setSupported(browserSupportsWebAuthn());
  }, []);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/webauthn/credentials");
      if (!res.ok) throw new Error("failed to load credentials");
      const data = (await res.json()) as { credentials: Credential[] };
      setCredentials(data.credentials);
    } catch (_error) {
      setMessage({ type: "error", text: t.error });
    } finally {
      setLoading(false);
    }
  }, [t.error]);

  useEffect(() => {
    loadCredentials();
  }, [loadCredentials]);

  const handleRegister = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const optionsRes = await fetch("/api/user/webauthn/register/options", {
        method: "POST",
      });
      if (!optionsRes.ok) throw new Error("options");
      const options = await optionsRes.json();

      const assertion = await startRegistration({ optionsJSON: options });

      const verifyRes = await fetch("/api/user/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          response: assertion,
          nickname: nickname.trim() || undefined,
        }),
      });
      if (!verifyRes.ok) {
        const data = await verifyRes.json().catch(() => ({}));
        throw new Error(data.error ?? "verify");
      }

      setMessage({ type: "success", text: t.registerSuccess });
      setNickname("");
      await loadCredentials();
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      if (name === "NotAllowedError" || name === "AbortError") {
        setMessage({ type: "error", text: t.userCancelled });
      } else {
        setMessage({ type: "error", text: t.error });
      }
    } finally {
      setBusy(false);
    }
  }, [nickname, t, loadCredentials]);

  const handleDelete = useCallback(
    async (credential: Credential) => {
      if (!confirm(t.confirmDelete)) return;
      setBusy(true);
      setMessage(null);
      try {
        const res = await fetch(
          `/api/user/webauthn/credentials/${credential.id}`,
          { method: "DELETE" },
        );
        if (res.status === 409) {
          setMessage({ type: "error", text: t.lastPasskeyBlocked });
          return;
        }
        if (!res.ok) throw new Error("delete");
        setMessage({ type: "success", text: t.deleteSuccess });
        await loadCredentials();
      } catch (_error) {
        setMessage({ type: "error", text: t.error });
      } finally {
        setBusy(false);
      }
    },
    [t, loadCredentials],
  );

  const startEditNickname = useCallback((credential: Credential) => {
    setEditingId(credential.id);
    setEditingNickname(credential.nickname ?? "");
    setMessage(null);
  }, []);

  const cancelEditNickname = useCallback(() => {
    setEditingId(null);
    setEditingNickname("");
  }, []);

  const saveNickname = useCallback(async () => {
    if (!editingId) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/user/webauthn/credentials/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname: editingNickname }),
      });
      if (!res.ok) throw new Error("patch");
      setMessage({ type: "success", text: t.nicknameUpdated });
      setEditingId(null);
      setEditingNickname("");
      await loadCredentials();
    } catch (_error) {
      setMessage({ type: "error", text: t.error });
    } finally {
      setBusy(false);
    }
  }, [editingId, editingNickname, t, loadCredentials]);

  const formatDate = useCallback(
    (iso: string | null) => {
      if (!iso) return t.never;
      return new Date(iso).toLocaleString(
        language === "ja" ? "ja-JP" : "en-US",
      );
    },
    [language, t.never],
  );

  if (supported === false) {
    return (
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t.title}</h3>
        <Alert variant="destructive">
          <AlertDescription>{t.notSupported}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{t.title}</h3>
        <p className="text-sm text-muted-foreground">{t.description}</p>
      </div>

      {message && (
        <Alert variant={message.type === "error" ? "destructive" : "default"}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2 p-4 bg-muted rounded-lg">
        <Input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={64}
          placeholder={t.nicknamePlaceholder}
          disabled={busy}
        />
        <Button onClick={handleRegister} disabled={busy} loading={busy}>
          {busy ? t.registering : t.registerButton}
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">…</p>
      ) : credentials.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.empty}</p>
      ) : (
        <ul className="divide-y border rounded-lg">
          {credentials.map((c) => (
            <li key={c.id} className="p-3 space-y-2">
              {editingId === c.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={editingNickname}
                    onChange={(e) => setEditingNickname(e.target.value)}
                    maxLength={64}
                    placeholder={t.nicknamePlaceholder}
                  />
                  <Button
                    size="sm"
                    onClick={saveNickname}
                    loading={busy}
                    disabled={busy}
                  >
                    {t.saveNickname}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditNickname}
                    disabled={busy}
                  >
                    {t.cancel}
                  </Button>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      className="font-medium text-left hover:underline"
                      onClick={() => startEditNickname(c)}
                    >
                      {c.nickname ??
                        (language === "ja" ? "（未設定）" : "(unnamed)")}
                    </button>
                    <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                      <span>
                        {t.createdAt}: {formatDate(c.createdAt)}
                      </span>
                      <span>
                        {t.lastUsedAt}: {formatDate(c.lastUsedAt)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge variant="secondary">
                        {c.deviceType === "multiDevice"
                          ? t.deviceMulti
                          : t.deviceSingle}
                      </Badge>
                      {c.transports.map((tp) => (
                        <Badge key={tp} variant="outline">
                          {tp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleDelete(c)}
                    disabled={busy}
                  >
                    {t.delete}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
