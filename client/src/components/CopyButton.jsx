import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ text, label = 'Copy' }) {
  const [done, setDone] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const copy = async () => {
    try {
      const value = text ?? '';
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setDone(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setDone(false), 1600);
    } catch {}
  };
  return (
    <>
      <button
        type="button"
        onClick={copy}
        className="btn-secondary !gap-1.5 !px-3 !py-1.5 !text-xs transition active:scale-95"
        title={label}
        aria-label={label}
      >
        {done ? <Check size={14} className="scale-in text-emerald-500" /> : <Copy size={14} />}
        {done ? 'Copied' : label}
      </button>
      <span aria-live="polite" className="sr-only">{done ? 'Copied to clipboard' : ''}</span>
    </>
  );
}
