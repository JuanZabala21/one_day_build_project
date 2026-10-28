"use client";

import { useEffect, useRef } from "react";

import { ErrorBox, Spinner } from "./ui";

/**
 * Modal confirmation built on the native <dialog>, which traps focus and closes on Escape. While
 * `pending`, it can't be dismissed so the user sees the action through to success or an error.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  error,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  pending?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const dismiss = () => {
    if (!pending) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="confirm-dialog-title"
      onCancel={(event) => {
        // Escape: let React state drive closing instead of the browser.
        event.preventDefault();
        dismiss();
      }}
      onClick={(event) => {
        // A click on the dialog element itself (not its content) is a click on the backdrop.
        if (event.target === event.currentTarget) dismiss();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xl backdrop:bg-slate-900/50 backdrop:backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"
    >
      <div className="p-5 sm:p-6">
        <h2 id="confirm-dialog-title" className="text-lg font-semibold">
          {title}
        </h2>
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {description}
        </div>
        {error && (
          <div className="mt-4">
            <ErrorBox>{error}</ErrorBox>
          </div>
        )}
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={dismiss}
            disabled={pending}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
          >
            {pending && <Spinner className="size-4" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
