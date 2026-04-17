"use client";

import type { OIDCClient, Role } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { LocaleDateTime } from "@/components/ui/locale-date";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClientFormDialog,
  type ClientFormValues,
} from "./components/ClientFormDialog";
import { SecretRevealDialog } from "./components/SecretRevealDialog";
import { oidcClientsTranslations } from "./translations";

interface OidcClientsClientProps {
  language: "en" | "ja";
}

function parseRedirectUris(input: string): string[] {
  return input
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseScopes(input: string): string[] {
  return input
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function clientToFormValues(client: OIDCClient): ClientFormValues {
  return {
    id: client.id,
    name: client.name,
    description: client.description ?? "",
    redirectUris: client.redirectUris.join("\n"),
    allowedScopes: client.allowedScopes.join(" "),
    allowedRoles: client.allowedRoles,
    enabled: client.enabled,
    autoApprove: client.autoApprove,
  };
}

export function OidcClientsClient({ language }: OidcClientsClientProps) {
  const t = oidcClientsTranslations[language];
  const [clients, setClients] = useState<OIDCClient[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [formInitial, setFormInitial] = useState<ClientFormValues | undefined>();
  const [formEditMode, setFormEditMode] = useState(false);

  const [secretDialog, setSecretDialog] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<OIDCClient | null>(null);
  const [regenerateTarget, setRegenerateTarget] = useState<OIDCClient | null>(
    null,
  );

  const loadClients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/oidc/clients");
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as { clients: OIDCClient[] };
      setClients(data.clients);
    } catch {
      toast.error(t.loadError);
    } finally {
      setLoading(false);
    }
  }, [t.loadError]);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const handleOpenCreate = () => {
    setFormInitial(undefined);
    setFormEditMode(false);
    setFormOpen(true);
  };

  const handleOpenEdit = (client: OIDCClient) => {
    setFormInitial(clientToFormValues(client));
    setFormEditMode(true);
    setFormOpen(true);
  };

  const handleSubmitForm = async (values: ClientFormValues) => {
    const redirectUris = parseRedirectUris(values.redirectUris);
    const allowedScopes = parseScopes(values.allowedScopes);

    if (!values.name || redirectUris.length === 0 || allowedScopes.length === 0) {
      toast.error(t.validationError);
      return;
    }

    const payload = {
      name: values.name,
      description: values.description || undefined,
      redirectUris,
      allowedScopes,
      allowedRoles: values.allowedRoles,
      autoApprove: values.autoApprove,
      ...(formEditMode ? { enabled: values.enabled } : {}),
    };

    try {
      if (formEditMode && values.id) {
        const res = await fetch(`/api/admin/oidc/clients/${values.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("failed");
        toast.success(t.updateSuccess);
      } else {
        const res = await fetch("/api/admin/oidc/clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("failed");
        const data = (await res.json()) as {
          client: OIDCClient;
          clientSecret: string;
        };
        toast.success(t.createSuccess);
        setSecretDialog({
          clientId: data.client.clientId,
          clientSecret: data.clientSecret,
        });
      }
      setFormOpen(false);
      await loadClients();
    } catch {
      toast.error(formEditMode ? t.updateError : t.createError);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/oidc/clients/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("failed");
      toast.success(t.deleteSuccess);
      setDeleteTarget(null);
      await loadClients();
    } catch {
      toast.error(t.deleteError);
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateTarget) return;
    try {
      const res = await fetch(
        `/api/admin/oidc/clients/${regenerateTarget.id}/regenerate-secret`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("failed");
      const data = (await res.json()) as {
        client: OIDCClient;
        clientSecret: string;
      };
      toast.success(t.regenerateSuccess);
      setSecretDialog({
        clientId: data.client.clientId,
        clientSecret: data.clientSecret,
      });
      setRegenerateTarget(null);
      await loadClients();
    } catch {
      toast.error(t.regenerateError);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <CardTitle>{t.title}</CardTitle>
            <CardDescription className="mt-1">
              {t.description}
            </CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>{t.createButton}</Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">...</div>
          ) : clients.length === 0 ? (
            <EmptyState message={t.empty} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.name}</TableHead>
                  <TableHead>{t.clientId}</TableHead>
                  <TableHead>{t.redirectUris}</TableHead>
                  <TableHead>{t.scopes}</TableHead>
                  <TableHead>{t.roles}</TableHead>
                  <TableHead>{t.status}</TableHead>
                  <TableHead>{t.createdAt}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      {c.name}
                      {c.description && (
                        <div className="text-xs text-muted-foreground">
                          {c.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {c.clientId}
                    </TableCell>
                    <TableCell className="text-xs">
                      <ul className="space-y-0.5">
                        {c.redirectUris.map((u) => (
                          <li key={u} className="break-all">
                            {u}
                          </li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      {c.allowedScopes.join(" ")}
                    </TableCell>
                    <TableCell className="text-xs">
                      {(c.allowedRoles as Role[]).join(", ")}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{c.enabled ? t.enabled : t.disabled}</div>
                      {c.autoApprove && (
                        <div className="text-muted-foreground">
                          {t.autoApprove}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <LocaleDateTime
                        date={c.createdAt}
                        locale={language === "ja" ? "ja-JP" : "en-US"}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenEdit(c)}
                        >
                          {t.editButton}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRegenerateTarget(c)}
                        >
                          {t.regenerateSecretButton}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteTarget(c)}
                        >
                          {t.deleteButton}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ClientFormDialog
        open={formOpen}
        t={t}
        initialValues={formInitial}
        isEditMode={formEditMode}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmitForm}
      />

      {secretDialog && (
        <SecretRevealDialog
          open
          t={t}
          clientId={secretDialog.clientId}
          clientSecret={secretDialog.clientSecret}
          onClose={() => setSecretDialog(null)}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        onDelete={handleDelete}
        title={t.deleteConfirmTitle}
        description={t.deleteConfirmDescription}
        deleteLabel={t.deleteConfirmButton}
      />

      <DeleteConfirmDialog
        open={!!regenerateTarget}
        onOpenChange={(o) => !o && setRegenerateTarget(null)}
        onDelete={handleRegenerate}
        title={t.regenerateConfirmTitle}
        description={t.regenerateConfirmDescription}
        deleteLabel={t.regenerateConfirmButton}
      />
    </div>
  );
}
