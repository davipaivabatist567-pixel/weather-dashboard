"use client";

import { useEffect, useRef, type ReactNode } from "react";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
};

/** Janela modal com o <dialog> nativo: foco preso, Esc fecha, clique fora fecha. */
export function Dialog({ open, onClose, labelledBy, size = "lg", className = "", children }: DialogProps) {
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
      className={`aurora-dialog m-0 h-dvh w-full overflow-y-auto overscroll-contain bg-white p-0 text-navy sm:m-auto sm:h-auto sm:max-h-[min(92dvh,56rem)] ${size === "lg" ? "sm:w-[min(92vw,62rem)]" : "sm:w-[min(92vw,38rem)]"} ${className}`}
    >
      {open && children}
    </dialog>
  );
}
