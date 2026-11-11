import { useState } from 'react';
import { Check, Copy, FlaskConical, Sparkles } from 'lucide-react';
import { DEMO_CREDENTIALS, DEMO_PERMISSIONS_NOTE } from '../utils/demo.js';

async function copyText(value, setCopied) {
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value);
    else {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  } catch {}
}

/**
 * Public demo access panel — render ONLY on the login page.
 */
export default function DemoLogin({ onUseDemo, onLoginAsDemo, busy }) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  return (
    <div className="gradient-border scale-in relative overflow-hidden rounded-2xl border border-brand-500/25 bg-gradient-to-br from-brand-600/[0.08] via-violet-600/[0.06] to-cyan-500/[0.07] p-5 dark:from-brand-500/10 dark:via-violet-500/10 dark:to-cyan-400/10">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 animate-pulse-soft rounded-full bg-brand-500/20 blur-2xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -bottom-12 -left-8 h-28 w-28 rounded-full bg-violet-500/15 blur-2xl" aria-hidden="true" />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-pop">
            <FlaskConical size={16} />
          </span>
          <div>
            <p className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">{DEMO_CREDENTIALS.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">No signup needed</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
            <Sparkles size={12} /> Live demo
          </span>
        </div>
        <p className="mt-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">{DEMO_CREDENTIALS.hint}</p>

        <div className="mt-3.5 space-y-2.5">
          <div className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-brand-700">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Email</p>
              <p className="truncate font-mono text-[13px] font-medium text-slate-900 dark:text-slate-100">{DEMO_CREDENTIALS.email}</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(DEMO_CREDENTIALS.email, setCopiedEmail)}
              className="btn-ghost !p-2 transition hover:scale-105 active:scale-90"
              aria-label="Copy demo email"
              title="Copy email"
            >
              {copiedEmail ? <Check size={16} className="scale-in text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
          <div className="group flex items-center gap-2 rounded-xl border border-slate-200 bg-white/80 px-3 py-2 transition hover:border-brand-300 dark:border-slate-700 dark:bg-slate-900/80 dark:hover:border-brand-700">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Password</p>
              <p className="truncate font-mono text-[13px] font-medium text-slate-900 dark:text-slate-100">{DEMO_CREDENTIALS.password}</p>
            </div>
            <button
              type="button"
              onClick={() => copyText(DEMO_CREDENTIALS.password, setCopiedPass)}
              className="btn-ghost !p-2 transition hover:scale-105 active:scale-90"
              aria-label="Copy demo password"
              title="Copy password"
            >
              {copiedPass ? <Check size={16} className="scale-in text-emerald-500" /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <div aria-live="polite" className="sr-only">
          {copiedEmail ? 'Demo email copied' : ''} {copiedPass ? 'Demo password copied' : ''}
        </div>

        <button
          type="button"
          onClick={onUseDemo}
          className="btn-secondary mt-3.5 w-full !py-2.5 transition hover:-translate-y-px active:scale-[0.98]"
        >
          <FlaskConical size={16} /> Use Demo Account
        </button>
        <button
          type="button"
          onClick={onLoginAsDemo}
          disabled={busy}
          className="btn-primary mt-2 w-full !py-2.5 transition active:scale-[0.98] disabled:opacity-60"
        >
          <Sparkles size={16} /> {busy ? 'Signing in…' : 'Login as Demo — 1 click'}
        </button>
        <p className="mt-2.5 text-center text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">{DEMO_PERMISSIONS_NOTE}</p>
      </div>
    </div>
  );
}
