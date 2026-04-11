import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export interface ToastMessage {
  id: string;
  message: string;
  type: "success" | "error";
}

interface ToastProps {
  toasts: ToastMessage[];
  onRemove: (id: string) => void;
}

export default function Toast({ toasts, onRemove }: ToastProps) {
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: ToastMessage; onRemove: (id: string) => void }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  const isSuccess = toast.type === "success";

  return (
    <div
      className={`flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-full pointer-events-auto transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
      style={{
        background: isSuccess
          ? "linear-gradient(135deg, rgba(124,58,237,0.95), rgba(139,92,246,0.95))"
          : "rgba(185,28,28,0.92)",
        border: isSuccess
          ? "1px solid rgba(167,139,250,0.5)"
          : "1px solid rgba(248,113,113,0.4)",
        boxShadow: isSuccess
          ? "0 0 24px rgba(139,92,246,0.5), 0 4px 16px rgba(0,0,0,0.5)"
          : "0 0 16px rgba(220,38,38,0.4), 0 4px 16px rgba(0,0,0,0.5)",
        color: "white",
        backdropFilter: "blur(12px)",
      }}
    >
      {toast.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {toast.message}
    </div>
  );
}
