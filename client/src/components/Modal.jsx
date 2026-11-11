import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Accessible modal: focus trap, Escape-to-close (topmost only), focus restore,
 * body scroll lock. Unique heading id per instance via useId.
 */
export default function Modal({ open, onClose, title, children, wide = false }) {
  const panelRef = useRef(null);
  const prevFocus = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    prevFocus.current = document.activeElement;
    const panel = panelRef.current;

    // Track open-Modal stack so only the topmost modal reacts to Escape.
    const MODALS_KEY = '__devapiOpenModals';
    const stack = (window[MODALS_KEY] = window[MODALS_KEY] || []);
    stack.push(panel);

    // Focus first focusable element for keyboard users.
    const t = setTimeout(() => {
      const el = panel?.querySelector('input, select, textarea, button:not([aria-label="Close dialog"])') || panel;
      el?.focus?.();
    }, 30);

    const onKey = (e) => {
      if (e.key === 'Escape') {
        // Only the topmost open modal closes.
        if (stack[stack.length - 1] !== panel) return;
        e.stopPropagation();
        onClose?.();
      }
      if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
      const idx = stack.indexOf(panel);
      if (idx !== -1) stack.splice(idx, 1);
      document.body.style.overflow = prev;
      prevFocus.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="fade-in absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`scale-in relative max-h-[90vh] w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="btn-ghost !p-1.5" aria-label="Close dialog">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
