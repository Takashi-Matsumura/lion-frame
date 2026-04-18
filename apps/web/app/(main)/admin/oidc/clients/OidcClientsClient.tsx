"use client";

import type { OIDCClient, Role } from "@prisma/client";
import { MoreHorizontal } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { LocaleDateTime } from "@/components/ui/locale-date";
import { PageSkeleton } from "@/components/ui/page-skeleton";
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

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <CardDescription className="max-w-3xl">
            {t.description}
          </CardDescription>
          <Button onClick={handleOpenCreate} className="shrink-0">
            {t.createButton}
          </Button>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <EmptyState message={t.empty} />
          ) : (
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">{t.name}</TableHead>
                  <TableHead className="w-[28%]">{t.clientId}</TableHead>
                  <TableHead className="w-[20%]">{t.redirectUris}</TableHead>
                  <TableHead className="w-[15%]">{t.roles}</TableHead>
                  <TableHead className="w-[10%]">{t.status}</TableHead>
                  <TableHead className="w-[5%]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((c) => (
                  <TableRow key={c.id} className="align-top">
                    <TableCell>
                      <div className="font-medium break-words">{c.name}</div>
                      {c.description && (
                        <div className="text-xs text-muted-foreground break-words mt-0.5">
                          {c.description}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground mt-1">
                        <LocaleDateTime
                          date={c.createdAt}
                          locale={language === "ja" ? "ja-JP" : "en-US"}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs break-all">
                        {c.clientId}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground break-all mt-1">
                        {c.allowedScopes.join(" ")}
                      </div>
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
                    <TableCell className="text-xs">
                      <div className="flex flex-wrap gap-1">
                        {(c.allowedRoles as Role[]).map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px]">
                            {r}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <Badge
                        className={
                          c.enabled
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {c.enabled ? t.enabled : t.disabled}
                      </Badge>
                      {c.autoApprove && (
                        <div className="text-muted-foreground mt-1">
                          {t.autoApprove}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenEdit(c)}>
                            {t.editButton}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setRegenerateTarget(c)}
                          >
                            {t.regenerateSecretButton}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(c)}
                          >
                            {t.deleteButton}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
