import React, { useEffect } from "react";
import { createPortal } from "react-dom";

const useLockScroll = (locked: boolean) => {
  useEffect(() => {
    if (locked) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = prev; };
    }
  }, [locked]);
};

export const Modal: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; size?: "sm" | "md" | "lg" }> = ({ open, onClose, title, children, footer, size = "md" }) => {
  useLockScroll(open);
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" };
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={`w-full ${widths[size]} rounded-xl bg-surface shadow-pop animate-in`}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-md text-text-muted hover:bg-bg">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export const Drawer: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode; side?: "start" | "end"; width?: string }> = ({ open, onClose, title, children, footer, side = "end", width = "460px" }) => {
  useLockScroll(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex bg-black/40" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width }}
        className={`absolute top-0 h-full max-w-[92vw] bg-surface shadow-pop flex flex-col ${side === "end" ? "left-0" : "right-0"}`}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-md text-text-muted hover:bg-bg">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3 shrink-0">{footer}</div>}
      </div>
    </div>,
    document.body
  );
};

export const BottomSheet: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ open, onClose, title, children }) => {
  useLockScroll(open);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end bg-black/40 md:hidden" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full rounded-t-2xl bg-surface p-4 shadow-pop max-h-[85vh] overflow-y-auto">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
        <h3 className="mb-3 text-base font-semibold">{title}</h3>
        {children}
      </div>
    </div>,
    document.body
  );
};

export const ConfirmDialog: React.FC<{ open: boolean; onClose: () => void; onConfirm: () => void; title: string; description?: string; danger?: boolean }> = ({ open, onClose, onConfirm, title, description, danger }) => (
  <Modal open={open} onClose={onClose} title={title} size="sm" footer={
    <>
      <button onClick={onClose} className="h-9 rounded-md border border-border px-4 text-sm hover:bg-bg">انصراف</button>
      <button onClick={() => { onConfirm(); onClose(); }} className={`h-9 rounded-md px-4 text-sm font-medium text-white ${danger ? "bg-danger-500 hover:bg-danger-600" : "bg-primary-500 hover:bg-primary-600"}`}>تأیید</button>
    </>
  }>
    <p className="text-sm text-text-muted">{description ?? "آیا از انجام این عملیات مطمئن هستید؟"}</p>
  </Modal>
);
