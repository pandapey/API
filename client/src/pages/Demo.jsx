import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ArrowRight, LogOut, Play, Zap } from 'lucide-react';
import { GATEWAY_URL, DOCS_URL } from '../utils/constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import CopyButton from '../components/CopyButton.jsx';

const steps = [
  { n: '1', title: 'Create account', desc: 'Register in 10 seconds — no credit card.', link: '/register', cta: 'Register' },
  { n: '2', title: 'Create project + endpoints', desc: 'Dashboard → Projects → New → add version v1 + endpoints like GET /hello.', link: '/projects', cta: 'Open projects' },
  { n: '3', title: 'Issue API key', desc: 'Project → Keys → New key. Copy dk_live_… once — only the hash is stored.', link: '/keys', cta: 'Get a key' },
  { n: '4', title: 'Call gateway', desc: 'Send below or via curl with header x-api-key. Watch Logs + Analytics update live.', external: DOCS_URL, cta: 'Full docs (Swagger)' },
];

export default function Demo() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ projectId: '', method: 'GET', path: '/hello', version: 'v1', apiKey: '' });
  const [resp, setResp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const url = `${GATEWAY_URL}/${(f.projectId || '<projectId>').trim()}${f.path.startsWith('/') ? f.path : `/${f.path}`}?version=${f.version || 'v1'}`;

  const send = async () => {
    setErr('');
    if (!f.projectId.trim()) return setErr('Paste a projectId first (Dashboard → Projects → click project → copy id from URL /projects/:id).');
    if (!f.apiKey.trim()) return setErr('Paste an API key (x-api-key: dk_live_…). Issue one from Project → Keys.');
    setBusy(true);
    setResp(null);
    try {
      const res = await axios({ url, method: f.method, headers: { 'x-api-key': f.apiKey.trim() }, timeout: 20000 });
      setResp({ status: res.status, data: res.data });
    } catch (e) {
      setResp({ status: e.response?.status || 'ERR', data: e.response?.data || e.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold shadow-pop">D</span>
          <span className="text-lg font-bold">DevAPI Hub</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-300 hover:text-white"><ArrowLeft size={15} /> Site</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-500">Dashboard</Link>
              <button onClick={async () => { await logout(); navigate('/'); }} className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold hover:bg-white/10">
                <LogOut size={14} /> Sign out
              </button>
            </>
          ) : (
            <Link to="/register" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-500">Get started <ArrowRight size={14} className="ml-1 inline" /></Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 pb-20 pt-8">
        <h1 className="flex items-center gap-2 text-3xl font-extrabold"><Zap size={26} /> Live demo — no fake data</h1>
        <p className="mt-2 max-w-2xl text-slate-400">This console calls your real gateway. You need one project + one key (30 seconds). Every call below shows up in Logs + Analytics.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-white/10 bg-white/[.03] p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600/20 text-sm font-bold text-brand-300">{s.n}</span>
              <p className="mt-2 font-semibold">{s.title}</p>
              <p className="mt-1 text-xs text-slate-400">{s.desc}</p>
              {s.external ? (
                <a href={s.external} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-brand-300 hover:underline">{s.cta} ↗</a>
              ) : (
                <Link to={s.link} className="mt-3 inline-block text-xs font-semibold text-brand-300 hover:underline">{s.cta} →</Link>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
            <h2 className="font-semibold">Try it — gateway console</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Project ID</label>
                <input value={f.projectId} onChange={(e) => setF((x) => ({ ...x, projectId: e.target.value }))} placeholder="paste from /projects/:id URL" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-500 focus:border-brand-500" />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <select value={f.method} onChange={(e) => setF((x) => ({ ...x, method: e.target.value }))} className="rounded-xl border border-white/10 bg-slate-900 px-2 py-2 font-mono text-xs outline-none">
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input value={f.path} onChange={(e) => setF((x) => ({ ...x, path: e.target.value }))} placeholder="/hello" className="col-span-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500" />
                <input value={f.version} onChange={(e) => setF((x) => ({ ...x, version: e.target.value }))} placeholder="v1" title="?version=" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">API key (x-api-key)</label>
                <input value={f.apiKey} onChange={(e) => setF((x) => ({ ...x, apiKey: e.target.value }))} placeholder="dk_live_…" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-500 focus:border-brand-500" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={send} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-500 disabled:opacity-60">
                  <Play size={14} /> {busy ? 'Calling…' : 'Send request'}
                </button>
                <CopyButton text={`curl "${url}" -H "x-api-key: ${f.apiKey || 'dk_live_…'}"`} label="Copy curl" />
              </div>
              <p className="break-all font-mono text-[11px] text-slate-500">{f.method} {url}</p>
              {err && <p className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{err}</p>}
              {resp && (
                <div>
                  <p className="mb-1 font-mono text-xs text-slate-400">→ {String(resp.status)}</p>
                  <pre className="max-h-72 overflow-auto rounded-xl bg-black/50 p-4 font-mono text-xs text-emerald-200">{typeof resp.data === 'string' ? resp.data : JSON.stringify(resp.data, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5">
              <h2 className="font-semibold">curl equivalent</h2>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-xs leading-relaxed text-slate-300">{`curl "${url}" \\\n  -H "x-api-key: ${f.apiKey || 'dk_live_…'}"`}</pre>
              <p className="mt-2 text-xs text-slate-500">Expect <code className="text-emerald-300">200 + mock response</code> if endpoint <code className="text-slate-300">{f.path}</code> exists in version <code className="text-slate-300">{f.version}</code>, else 404 with available endpoints listed. Wrong/missing key → 401, wrong scope → 403, too many calls → 429.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-5 text-sm text-slate-300">
              <h2 className="font-semibold text-white">After you send</h2>
              <ul className="mt-2 space-y-1 text-xs text-slate-400">
                <li>· <Link to="/logs" className="text-brand-300 hover:underline">Logs</Link> — filter by project / status / endpoint</li>
                <li>· <Link to="/analytics" className="text-brand-300 hover:underline">Analytics</Link> — totals, p95, timeseries update</li>
                <li>· <a href={DOCS_URL} target="_blank" rel="noreferrer" className="text-brand-300 hover:underline">Swagger /api-docs ↗</a> — full REST reference</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
