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

  const bg = toast.type === "success" ? "bg-green-600" : "bg-red-600";

  return (
    <div
      className={`flex items-center gap-2 ${bg} text-white text-sm font-semibold px-5 py-3 rounded-full shadow-lg pointer-events-auto transition-all duration-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
    >
      {toast.type === "success" ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
      {toast.message}
    </div>
  );
}
