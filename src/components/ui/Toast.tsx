import { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertCircle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

// Simple global toast store
let listeners: ((toasts: ToastItem[]) => void)[] = [];
let toasts: ToastItem[] = [];

function notify(listeners: ((t: ToastItem[]) => void)[], t: ToastItem[]) {
  listeners.forEach((l) => l([...t]));
}

export const toast = {
  success: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, message, type: "success" }];
    notify(listeners, toasts);
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify(listeners, toasts);
    }, 4000);
  },
  error: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, message, type: "error" }];
    notify(listeners, toasts);
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify(listeners, toasts);
    }, 4000);
  },
  info: (message: string) => {
    const id = Math.random().toString(36).slice(2);
    toasts = [...toasts, { id, message, type: "info" }];
    notify(listeners, toasts);
    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
      notify(listeners, toasts);
    }, 4000);
  },
};

export function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    listeners.push(setItems);
    return () => {
      listeners = listeners.filter((l) => l !== setItems);
    };
  }, []);

  const icons = {
    success: <CheckCircle size={16} className="text-green-400" />,
    error: <XCircle size={16} className="text-red-400" />,
    info: <AlertCircle size={16} className="text-orange-400" />,
  };

  const colors = {
    success: "border-green-500/30 bg-green-500/10",
    error: "border-red-500/30 bg-red-500/10",
    info: "border-orange-500/30 bg-orange-500/10",
  };

  const dismiss = (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    setItems([...toasts]);
  };

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm shadow-2xl animate-in slide-in-from-right-4 duration-300 ${colors[item.type]}`}
        >
          {icons[item.type]}
          <p className="text-sm text-[#f0f4ff] flex-1">{item.message}</p>
          <button
            onClick={() => dismiss(item.id)}
            className="text-[#64748b] hover:text-[#f0f4ff] transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
