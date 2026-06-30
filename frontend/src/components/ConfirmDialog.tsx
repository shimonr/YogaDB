import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onCancel={onCancel}
      className="rounded-xl border border-sand-100 bg-white p-0 shadow-xl backdrop:bg-black/30 w-full max-w-md"
    >
      <div className="p-5 space-y-3">
        <h3 className="text-lg font-semibold text-sage-700">{title}</h3>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onCancel} className="px-4 py-1.5 text-sm rounded border border-sand-200 text-slate-600 hover:bg-sand-100">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-1.5 text-sm rounded bg-red-500 text-white hover:bg-red-600">
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
