import { AlertTriangle, Loader2 } from 'lucide-react';
import Modal from './Modal.jsx';

/**
 * Styled confirmation dialog replacing native confirm() across the app.
 * Built on Modal (focus trap, topmost-Escape, scroll lock). tone='danger'
 * renders destructive styling.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
}) {
  return (
    <Modal open={open} onClose={busy ? undefined : onClose} title={title}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 shrink-0 rounded-xl p-2.5 ${tone === 'danger' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-brand-600/10 text-brand-600 dark:text-brand-300'}`}
          aria-hidden="true"
        >
          <AlertTriangle size={20} />
        </span>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
          onClick={onConfirm}
          disabled={busy}
        >
          {busy && <Loader2 size={16} className="animate-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
