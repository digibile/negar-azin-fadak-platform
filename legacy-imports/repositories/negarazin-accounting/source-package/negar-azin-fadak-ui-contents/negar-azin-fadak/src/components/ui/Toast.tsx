import React, { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";
interface ToastItem { id: number; type: ToastType; message: string; }
interface ToastCtx { push: (type: ToastType, message: string) => void; }

const Ctx = createContext<ToastCtx | null>(null);

const ICONS: Record<ToastType, string> = { success: "✅", error: "⛔", info: "ℹ️", warning: "⚠️" };
const COLORS: Record<ToastType, string> = {
  success: "border-success-500/30 bg-success-50 text-success-600",
  error: "border-danger-500/30 bg-danger-50 text-danger-600",
  info: "border-info-500/30 bg-info-50 text-info-600",
  warning: "border-warning-500/30 bg-warning-50 text-warning-600",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((type: ToastType, message: string) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, type, message }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-4 left-4 z-[100] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-pop ${COLORS[t.type]}`}>
            <span>{ICONS[t.type]}</span>{t.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};
