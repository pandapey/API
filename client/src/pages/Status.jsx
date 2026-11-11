import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, CheckCircle2, LogOut, RefreshCw, XCircle } from 'lucide-react';
import { API_URL } from '../utils/constants.js';
import { useAuth } from '../context/AuthContext.jsx';

const backendBase = (API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');

async function checkUrl(url, timeoutMs = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = performance.now();
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    const ms = Math.round(performance.now() - started);
    let body = null;
    try { body = await res.clone().json(); } catch { /* non-json */ }
    return { ok: res.ok, status: res.status, ms, body };
  } catch (e) {
    return { ok: false, status: 'ERR', ms: null, error: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

function Row({ name, result, hint }) {
  const up = !!result?.ok;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.03] p-4">
      {result ? (up ? <CheckCircle2 className="shrink-0 text-emerald-400" size={22} /> : <XCircle className="shrink-0 text-rose-400" size={22} />) : <Activity className="shrink-0 text-slate-500" size={22} />}
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{name}</p>
        <p className="truncate font-mono text-xs text-slate-400">
          {result ? `${result.ok ? 'UP' : 'DOWN'} · ${result.status} ${result.ms != null ? `· ${result.ms}ms` : ''} ${result.error ? `· ${result.error}` : ''}` : 'checking…'}
        </p>
        {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
      </div>
      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${result ? (up ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300') : 'bg-white/10 text-slate-300'}`}>
        {result ? (up ? 'Operational' : 'Down') : '…'}
      </span>
    </div>
  );
}

export default function Status() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [backend, setBackend] = useState(null);
  const [docs, setDocs] = useState(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true);
    const [b, d] = await Promise.all([
      checkUrl(`${backendBase}/health`),
      // /api-docs returns HTML (CORS/fallback prone); check JSON endpoint for reliable UP/DOWN.
      checkUrl(`${backendBase}/api-docs.json`),
    ]);
    setBackend(b);
    setDocs(d);
    setLoading(false);
  }, []);

  useEffect(() => { run(); }, [run]);

  const allUp = backend?.ok && docs?.ok;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold shadow-pop">D</span>
          <span className="text-lg font-bold">DevAPI Hub</span>
        </Link>
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white">
          <ArrowLeft size={15} /> Back to site
        </Link>
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold hover:bg-brand-500">Dashboard</Link>
              <button onClick={async () => { await logout(); navigate('/'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-semibold hover:bg-white/10">
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="px-3 py-1.5 text-sm font-semibold text-slate-300 hover:text-white">Sign in</Link>
              <Link to="/register" className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-semibold hover:bg-brand-500">Sign up</Link>
            </>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-8">
        <h1 className="text-3xl font-extrabold">System status</h1>
        <p className="mt-2 flex items-center gap-2 text-slate-400">
          <span className={`h-2 w-2 rounded-full ${loading ? 'animate-pulse bg-amber-400' : allUp ? 'bg-emerald-400' : 'bg-rose-400'}`} />
          {loading ? 'Checking services…' : allUp ? 'All systems operational' : 'Some services are down — see below'}
        </p>

        <div className="mt-6 space-y-3">
          <Row name="Frontend (this page)" result={{ ok: true, status: 200, ms: 0 }} hint="If you can read this, frontend is up." />
          <Row name={`Backend API — ${backendBase}/health`} result={backend} hint="Needs npm run dev:server on :5000. If DOWN, start the server." />
          <Row name={`Swagger JSON — ${backendBase}/api-docs.json`} result={docs} hint="Same backend, JSON spec. UI at /api-docs." />
        </div>

        <div className="mt-5 flex gap-2">
          <button onClick={run} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-500 disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> {loading ? 'Checking…' : 'Re-check'}
          </button>
          <Link to="/demo" className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">Open live demo</Link>
        </div>

        {backend?.body && (
          <pre className="mt-5 max-h-64 overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-xs text-slate-300">
            {JSON.stringify(backend.body, null, 2)}
          </pre>
        )}
      </main>
    </div>
  );
}
