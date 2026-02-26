"use client";

import { useCallback, useState } from "react";

interface UseFormDialogResult<TForm, TItem = unknown> {
  isOpen: boolean;
  editingItem: TItem | null;
  form: TForm;
  setForm: React.Dispatch<React.SetStateAction<TForm>>;
  open: (item?: TItem, initialForm?: Partial<TForm>) => void;
  close: () => void;
}

/**
 * Hook for managing dialog open/close + form state.
 *
 * Usage:
 * ```tsx
 * const dialog = useFormDialog({
 *   title: "",
 *   message: "",
 * });
 *
 * // Open for creation
 * dialog.open();
 *
 * // Open for editing
 * dialog.open(existingItem, { title: existingItem.title });
 *
 * // In JSX
 * <Dialog open={dialog.isOpen} onOpenChange={() => dialog.close()}>
 *   <Input value={dialog.form.title} onChange={...} />
 * </Dialog>
 * ```
 */
export function useFormDialog<TForm extends Record<string, unknown>, TItem = unknown>(
  defaultForm: TForm,
): UseFormDialogResult<TForm, TItem> {
  const [isOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [form, setForm] = useState<TForm>(defaultForm);

  const open = useCallback(
    (item?: TItem, initialForm?: Partial<TForm>) => {
      setEditingItem(item ?? null);
      setForm(initialForm ? { ...defaultForm, ...initialForm } : defaultForm);
      setIsOpen(true);
    },
    [defaultForm],
  );

  const close = useCallback(() => {
    setIsOpen(false);
    setEditingItem(null);
    setForm(defaultForm);
  }, [defaultForm]);

  return { isOpen, editingItem, form, setForm, open, close };
}
