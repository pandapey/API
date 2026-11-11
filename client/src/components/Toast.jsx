import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';

const styles = {
  success: 'border-emerald-500/30 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  error: 'border-rose-500/30 bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200',
  info: 'border-brand-500/30 bg-brand-50 text-brand-900 dark:bg-brand-950/50 dark:text-brand-100',
};

const icons = { success: CheckCircle2, error: AlertTriangle, info: Info };

export default function Toast() {
  const { toasts, dismiss } = useToast();
  return (
    <div aria-live="polite" role="status" className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[min(92vw,380px)] flex-col gap-2">
      {toasts.map((t) => {
        const Icon = icons[t.type] || Info;
        return (
          <div
            key={t.id}
            className={`toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm font-medium shadow-xl ${styles[t.type] || styles.info}`}
          >
            <Icon size={18} className="mt-0.5 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
