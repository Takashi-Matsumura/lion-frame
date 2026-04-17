"use client";

import type { Role } from "@prisma/client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { OidcClientsTranslation } from "../translations";

const ALL_ROLES: Role[] = ["GUEST", "USER", "MANAGER", "EXECUTIVE", "ADMIN"];

export interface ClientFormValues {
  id?: string;
  name: string;
  description: string;
  redirectUris: string;
  allowedScopes: string;
  allowedRoles: Role[];
  enabled: boolean;
  autoApprove: boolean;
}

interface ClientFormDialogProps {
  open: boolean;
  t: OidcClientsTranslation;
  initialValues?: ClientFormValues;
  isEditMode?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ClientFormValues) => Promise<void>;
}

const DEFAULT_VALUES: ClientFormValues = {
  name: "",
  description: "",
  redirectUris: "",
  allowedScopes: "openid profile email",
  allowedRoles: ["USER", "MANAGER", "EXECUTIVE", "ADMIN"],
  enabled: true,
  autoApprove: false,
};

export function ClientFormDialog({
  open,
  t,
  initialValues,
  isEditMode = false,
  onOpenChange,
  onSubmit,
}: ClientFormDialogProps) {
  const [values, setValues] = useState<ClientFormValues>(
    initialValues ?? DEFAULT_VALUES,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setValues(initialValues ?? DEFAULT_VALUES);
    }
  }, [open, initialValues]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleRole = (role: Role) => {
    setValues((v) => ({
      ...v,
      allowedRoles: v.allowedRoles.includes(role)
        ? v.allowedRoles.filter((r) => r !== role)
        : [...v.allowedRoles, role],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? t.formEditTitle : t.formCreateTitle}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="oidc-name">{t.nameLabel}</Label>
            <Input
              id="oidc-name"
              required
              value={values.name}
              placeholder={t.namePlaceholder}
              onChange={(e) =>
                setValues((v) => ({ ...v, name: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="oidc-description">{t.descriptionLabel}</Label>
            <Input
              id="oidc-description"
              value={values.description}
              placeholder={t.descriptionPlaceholder}
              onChange={(e) =>
                setValues((v) => ({ ...v, description: e.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="oidc-redirects">{t.redirectUrisLabel}</Label>
            <Textarea
              id="oidc-redirects"
              required
              rows={4}
              className="font-mono text-xs"
              value={values.redirectUris}
              placeholder={t.redirectUrisPlaceholder}
              onChange={(e) =>
                setValues((v) => ({ ...v, redirectUris: e.target.value }))
              }
            />
            <DialogDescription>{t.redirectUrisHint}</DialogDescription>
          </div>

          <div className="space-y-2">
            <Label htmlFor="oidc-scopes">{t.scopesLabel}</Label>
            <Input
              id="oidc-scopes"
              required
              className="font-mono text-xs"
              value={values.allowedScopes}
              onChange={(e) =>
                setValues((v) => ({ ...v, allowedScopes: e.target.value }))
              }
            />
            <DialogDescription>{t.scopesHint}</DialogDescription>
          </div>

          <div className="space-y-2">
            <Label>{t.rolesLabel}</Label>
            <div className="flex flex-wrap gap-3">
              {ALL_ROLES.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={values.allowedRoles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
            <DialogDescription>{t.rolesHint}</DialogDescription>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={values.autoApprove}
                onCheckedChange={(checked) =>
                  setValues((v) => ({ ...v, autoApprove: checked === true }))
                }
              />
              <span>{t.autoApproveLabel}</span>
            </label>
            <DialogDescription>{t.autoApproveHint}</DialogDescription>
          </div>

          {isEditMode && (
            <div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={values.enabled}
                  onCheckedChange={(checked) =>
                    setValues((v) => ({ ...v, enabled: checked === true }))
                  }
                />
                <span>{t.enabledLabel}</span>
              </label>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {t.cancelButton}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t.saveButton}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
