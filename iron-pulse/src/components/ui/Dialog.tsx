"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
};

/** Janela modal com o <dialog> nativo: foco preso, Esc fecha, clique fora fecha. */
export function Dialog({ open, onClose, labelledBy, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="pulse-dialog m-0 h-dvh w-full overflow-y-auto overscroll-contain border border-white/10 bg-coal p-0 text-white sm:m-auto sm:h-auto sm:max-h-[min(90dvh,52rem)] sm:w-[min(92vw,44rem)]"
    >
      {open && children}
    </dialog>
  );
}
