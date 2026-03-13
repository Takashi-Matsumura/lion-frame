"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { PublishSettings } from "@/types/organization";
import type { DataManagementTranslation } from "../../translations";

interface PublishDialogProps {
  isOpen: boolean;
  publishSettings: PublishSettings | null;
  organizationId: string;
  language: "en" | "ja";
  t: DataManagementTranslation;
  onClose: () => void;
  onPublished: () => void;
}

export function PublishDialog({
  isOpen,
  publishSettings,
  organizationId,
  language,
  t,
  onClose,
  onPublished,
}: PublishDialogProps) {
  const [publishDate, setPublishDate] = useState("");
  const [publishAction, setPublishAction] = useState<"publish" | "schedule">(
    "publish",
  );
  const [updatingPublish, setUpdatingPublish] = useState(false);

  // Handle publish action
  const handlePublishAction = async () => {
    if (!organizationId) return;

    try {
      setUpdatingPublish(true);
      const body: {
        organizationId: string;
        action: string;
        publishAt?: string;
      } = {
        organizationId,
        action: publishAction,
      };

      if (publishAction === "schedule" && publishDate) {
        body.publishAt = new Date(publishDate).toISOString();
      }

      const response = await fetch("/api/admin/organization/publish", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update publish settings");
      }

      onPublished();
      onClose();
      setPublishDate("");
    } catch (err) {
      console.error("Error updating publish settings:", err);
    } finally {
      setUpdatingPublish(false);
    }
  };

  const handleClose = () => {
    onClose();
    setPublishDate("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{t.setPublishDate}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Action Selection */}
          <div className="flex gap-2">
            <Button
              variant={publishAction === "publish" ? "default" : "outline"}
              size="sm"
              onClick={() => setPublishAction("publish")}
              className="flex-1"
            >
              {t.publishNow}
            </Button>
            <Button
              variant={publishAction === "schedule" ? "default" : "outline"}
              size="sm"
              onClick={() => setPublishAction("schedule")}
              className="flex-1"
            >
              {t.schedulePublish}
            </Button>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground">
            {publishAction === "publish"
              ? t.confirmPublishNow
              : t.confirmSchedule}
          </p>

          {/* Date Picker for Schedule */}
          {publishAction === "schedule" && (
            <div className="space-y-2">
              <label htmlFor="publishDate" className="text-sm font-medium">
                {t.publishAt}
              </label>
              <Input
                id="publishDate"
                type="datetime-local"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={handleClose}>
              {t.cancel}
            </Button>
            <Button
              onClick={handlePublishAction}
              disabled={
                updatingPublish ||
                (publishAction === "schedule" && !publishDate)
              }
            >
              {updatingPublish
                ? t.loading
                : publishAction === "publish"
                  ? t.publishNow
                  : t.schedulePublish}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
