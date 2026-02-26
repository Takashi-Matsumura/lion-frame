"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel?: string;
  deleteLabel?: string;
  disabled?: boolean;
  onDelete: () => void;
  /** "DELETE" 入力を求める確認テキスト。設定するとテキスト入力が一致するまで削除ボタンが無効になる */
  requireConfirmText?: string;
  /** 確認テキスト入力欄の上に表示するラベル */
  confirmPrompt?: string;
}

function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Cancel",
  deleteLabel = "Delete",
  disabled = false,
  onDelete,
  requireConfirmText,
  confirmPrompt,
}: DeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState("");

  // ダイアログが閉じたら入力をリセット
  useEffect(() => {
    if (!open) setConfirmText("");
  }, [open]);

  const isConfirmValid = requireConfirmText
    ? confirmText === requireConfirmText
    : true;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription asChild={!!requireConfirmText}>
            {requireConfirmText ? (
              <div className="space-y-3">
                <p>{description}</p>
                <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                    {confirmPrompt ||
                      `Type "${requireConfirmText}" to confirm:`}
                  </p>
                  <Input
                    className="mt-2"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={requireConfirmText}
                    disabled={disabled}
                  />
                </div>
              </div>
            ) : (
              description
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={disabled}
          >
            {cancelLabel}
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            disabled={disabled || !isConfirmValid}
          >
            {deleteLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export { DeleteConfirmDialog };
export type { DeleteConfirmDialogProps };
