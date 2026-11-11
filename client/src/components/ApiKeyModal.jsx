import { AlertTriangle } from 'lucide-react';
import Modal from './Modal.jsx';
import CopyButton from './CopyButton.jsx';

export default function ApiKeyModal({ open, onClose, apiKey, name }) {
  return (
    <Modal open={open} onClose={onClose} title="API key created">
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle size={16} /> Copy it now — it will not be shown again.
        </p>
      </div>
      {name && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Key: <b>{name}</b></p>}
      <div className="mt-2 flex items-center gap-2 rounded-xl bg-slate-950 p-3 font-mono text-xs text-emerald-300">
        <code className="flex-1 break-all">{apiKey || '—'}</code>
        <CopyButton text={apiKey} />
      </div>
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" onClick={onClose}>
          I&apos;ve saved it
        </button>
      </div>
    </Modal>
  );
}
