import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useStudio } from '@/store/graphStore';

export function Toasts() {
  const toasts = useStudio((s) => s.toasts);
  const dismiss = useStudio((s) => s.dismissToast);
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[330px] flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? AlertCircle
          : toast.kind === 'warning' ? AlertTriangle : Info;
        const color = toast.kind === 'success' ? '#16a34a' : toast.kind === 'error' ? '#dc2626'
          : toast.kind === 'warning' ? '#f59e0b' : '#2563eb';
        return (
          <div key={toast.id} className="toast-card pointer-events-auto flex items-start gap-2.5 p-3" style={{ borderLeftColor: color }}>
            <Icon size={15} className="mt-0.5 shrink-0" style={{ color }} />
            <div className="min-w-0 flex-1">
              <p className="text-[11.5px] font-semibold">{toast.title}</p>
              {toast.message && <p className="mt-0.5 text-[10px] leading-snug text-muted">{toast.message}</p>}
            </div>
            <button className="text-muted hover:text-ink" onClick={() => dismiss(toast.id)}><X size={12} /></button>
          </div>
        );
      })}
    </div>
  );
}
