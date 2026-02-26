"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import type {
  AutoAssignResult,
  AutoAssignSkipped,
} from "@/types/organization";
import type { DataManagementTranslation } from "../../translations";

interface CancelStatus {
  canCancel: boolean;
  batchId?: string;
  importedAt?: string;
  changeLogCount?: number;
}

interface OrgActionDialogsProps {
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
  cancelStatus: CancelStatus | null;
  showCancelDialog: boolean;
  showClearDataDialog: boolean;
  showAutoAssignDialog: boolean;
  onCancelDialogClose: () => void;
  onClearDialogClose: () => void;
  onAutoAssignClose: () => void;
  onDataChanged: () => void;
}

export function OrgActionDialogs({
  organizationId,
  language,
  t,
  cancelStatus,
  showCancelDialog,
  showClearDataDialog,
  showAutoAssignDialog,
  onCancelDialogClose,
  onClearDialogClose,
  onAutoAssignClose,
  onDataChanged,
}: OrgActionDialogsProps) {
  // Cancel import state
  const [cancellingImport, setCancellingImport] = useState(false);

  // Clear data state
  const [clearingData, setClearingData] = useState(false);
  const [clearDataConfirmText, setClearDataConfirmText] = useState("");

  // Auto-assign state
  const [autoAssigning, setAutoAssigning] = useState(false);
  const [autoAssignResults, setAutoAssignResults] = useState<{
    assignments: AutoAssignResult[];
    skipped: AutoAssignSkipped[];
  } | null>(null);
  const [autoAssignError, setAutoAssignError] = useState<string | null>(null);

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Cancel import (rollback)
  const handleCancelImport = async () => {
    try {
      setCancellingImport(true);
      const response = await fetch("/api/admin/organization/import/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to cancel import");
      }

      onCancelDialogClose();
      onDataChanged();
    } catch (err) {
      console.error("Error cancelling import:", err);
    } finally {
      setCancellingImport(false);
    }
  };

  // Handle clear data
  const handleClearData = async () => {
    try {
      setClearingData(true);
      const response = await fetch(
        `/api/admin/organization/clear-data?organizationId=${organizationId}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to clear data");
      }

      onClearDialogClose();
      setClearDataConfirmText("");
      onDataChanged();
    } catch (err) {
      console.error("Error clearing data:", err);
    } finally {
      setClearingData(false);
    }
  };

  // Handle auto-assign managers
  const handleAutoAssign = async () => {
    try {
      setAutoAssigning(true);
      setAutoAssignError(null);
      const response = await fetch(
        "/api/admin/organization/auto-assign-managers",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ organizationId }),
        },
      );

      if (!response.ok) {
        const data = await response.json();
        if (data.error === "no_position_master") {
          setAutoAssignError("no_position_master");
          return;
        }
        throw new Error(data.error || "Failed to auto-assign");
      }

      const data = await response.json();
      setAutoAssignResults(data);
    } catch (err) {
      console.error("Error auto-assigning managers:", err);
      setAutoAssignError("error");
    } finally {
      setAutoAssigning(false);
    }
  };

  const handleCloseAutoAssign = () => {
    const hadAssignments =
      autoAssignResults && autoAssignResults.assignments.length > 0;
    setAutoAssignResults(null);
    setAutoAssignError(null);
    onAutoAssignClose();
    if (hadAssignments) {
      onDataChanged();
    }
  };

  return (
    <>
      {/* Cancel Import Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={(open) => { if (!open) onCancelDialogClose(); }}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t.cancelImportTitle}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Description */}
            <p className="text-sm text-muted-foreground">
              {t.cancelImportDescription}
            </p>

            {/* Import Info */}
            {cancelStatus?.canCancel && (
              <div className="p-3 bg-muted rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t.importedAt}:</span>
                  <span>{formatDate(cancelStatus.importedAt || null)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {t.affectedRecords}:
                  </span>
                  <span>{cancelStatus.changeLogCount}</span>
                </div>
              </div>
            )}

            {/* Warning */}
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {t.cancelImportConfirm}
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={onCancelDialogClose}
                disabled={cancellingImport}
              >
                {t.cancel}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelImport}
                disabled={cancellingImport}
              >
                {cancellingImport ? t.cancellingImport : t.cancelImport}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Data Dialog */}
      <Dialog
        open={showClearDataDialog}
        onOpenChange={(open) => {
          if (!open) {
            onClearDialogClose();
            setClearDataConfirmText("");
          }
        }}
      >
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{t.clearDataTitle}</DialogTitle>
            <DialogDescription>{t.clearDataDescription}</DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{t.clearDataConfirm}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {t.clearDataTypeDelete}
            </p>
            <Input
              value={clearDataConfirmText}
              onChange={(e) => setClearDataConfirmText(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                onClearDialogClose();
                setClearDataConfirmText("");
              }}
              disabled={clearingData}
            >
              {t.cancel}
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearData}
              disabled={clearingData || clearDataConfirmText !== "DELETE"}
            >
              {clearingData ? t.clearingData : t.clearData}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-assign Managers Dialog */}
      <Dialog
        open={showAutoAssignDialog}
        onOpenChange={(open) => {
          if (!open) handleCloseAutoAssign();
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t.autoAssignConfirmTitle}</DialogTitle>
            {!autoAssignResults && !autoAssignError && (
              <DialogDescription>
                {t.autoAssignConfirmMessage}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Error: No Position Master */}
          {autoAssignError === "no_position_master" && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-md dark:bg-orange-950 dark:border-orange-800">
              <p className="text-sm text-orange-700 dark:text-orange-300">
                {t.autoAssignNoPositionMaster}
              </p>
            </div>
          )}

          {/* Error: General */}
          {autoAssignError === "error" && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">
                {t.importError}
              </p>
            </div>
          )}

          {/* Results */}
          {autoAssignResults && (
            <div className="min-h-0 flex-1 space-y-2">
              <p className="text-sm font-medium">{t.autoAssignResult}</p>
              <ScrollArea className="max-h-[50vh] border rounded-md">
                <div className="p-3 space-y-1.5">
                  {autoAssignResults.assignments.map((a) => (
                    <div
                      key={`${a.type}:${a.unitId}`}
                      className="flex items-start gap-2 text-sm"
                    >
                      <span className="text-green-600 dark:text-green-400 shrink-0">
                        &#10003;
                      </span>
                      <span>
                        {a.unitName} &rarr; {a.managerName}
                        {a.managerPosition && (
                          <span className="text-muted-foreground">
                            ({a.managerPosition})
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                  {autoAssignResults.skipped
                    .filter((s) => s.reason === "already_assigned")
                    .map((s) => (
                      <div
                        key={`${s.type}:${s.unitId}`}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="shrink-0">&mdash;</span>
                        <span>
                          {s.unitName}({t.autoAssignSkippedExisting})
                        </span>
                      </div>
                    ))}
                  {autoAssignResults.skipped
                    .filter((s) => s.reason === "no_candidates")
                    .map((s) => (
                      <div
                        key={`${s.type}:${s.unitId}`}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <span className="text-orange-500 shrink-0">
                          &#9651;
                        </span>
                        <span>
                          {s.unitName}({t.autoAssignSkippedNoCandidates})
                        </span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Loading */}
          {autoAssigning && (
            <div className="flex items-center justify-center py-6">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          )}

          <DialogFooter>
            {!autoAssignResults && !autoAssignError && !autoAssigning && (
              <>
                <Button
                  variant="outline"
                  onClick={onAutoAssignClose}
                >
                  {t.cancel}
                </Button>
                <Button onClick={handleAutoAssign}>
                  {t.autoAssignExecute}
                </Button>
              </>
            )}
            {(autoAssignResults || autoAssignError) && (
              <Button variant="outline" onClick={handleCloseAutoAssign}>
                {t.close}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
