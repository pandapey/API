import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);
let idSeq = 1;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
    const tm = timers.current.get(id);
    if (tm) {
      clearTimeout(tm);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (message, type = 'info', ms = 4200) => {
      const id = idSeq++;
      setToasts((t) => [...t.slice(-4), { id, message, type }]);
      const tm = setTimeout(() => dismiss(id), ms);
      timers.current.set(id, tm);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toasts,
      push,
      dismiss,
      success: (m) => push(m, 'success'),
      error: (m) => push(m, 'error'),
      info: (m) => push(m, 'info'),
    }),
    [toasts, push, dismiss]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
