import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  ArrowLeft, ArrowRight, CheckCircle2, KeyRound, Loader2,
  LogOut, Play, Rocket, Zap,
} from 'lucide-react';
import { GATEWAY_URL, DOCS_URL } from '../utils/constants.js';
import { DEMO_CREDENTIALS } from '../utils/demo.js';
import { useAuth } from '../context/AuthContext.jsx';
import { projectService } from '../services/projectService.js';
import { keyService } from '../services/keyService.js';
import { extractError } from '../services/api.js';
import CopyButton from '../components/CopyButton.jsx';

const DEMO_SLUG = 'demo-weather-api';

const STEPS = [
  { n: '1', title: 'One click, zero setup', desc: '“Launch demo” signs into a public demo account and opens a working project for you.', link: '/login', cta: 'Also on the login page' },
  { n: '2', title: 'Real gateway, real data', desc: 'Calls hit the actual gateway. Every request lands in Logs and Analytics — no fake charts.', link: '/logs', cta: 'See logs' },
  { n: '3', title: 'Keys, scopes & limits', desc: 'A fresh demo key is issued per session. Wrong key → 401, wrong scope → 403, floods → 429.', link: '/keys', cta: 'Key manager' },
  { n: '4', title: 'Full reference', desc: 'Swagger UI documents every REST + gateway endpoint, including auth and errors.', external: DOCS_URL, cta: 'Open Swagger' },
];

const BOOT_STEPS = [
  'Signing in to the demo account…',
  'Loading the demo project…',
  'Issuing a fresh demo API key…',
  'Calling the gateway…',
];

export default function Demo() {
  const { isAuthenticated, user, login, logout } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ projectId: '', method: 'GET', path: '/forecast', version: 'v1', apiKey: '' });
  const [resp, setResp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [bootStep, setBootStep] = useState(-1); // -1 idle, 0..3 running steps
  const [bootErr, setBootErr] = useState('');
  const [booted, setBooted] = useState(false);

  const projectRef = (f.projectId || '<demo-weather-api>').trim();
  const url = `${GATEWAY_URL}/${projectRef}${f.path.startsWith('/') ? f.path : `/${f.path}`}?version=${f.version || 'v1'}`;

  const callGateway = async ({ method, url: u, apiKey }) => {
    try {
      const res = await axios({
        url: u,
        method,
        ...(apiKey ? { headers: { 'x-api-key': apiKey } } : {}),
        timeout: 20000,
      });
      return { status: res.status, data: res.data };
    } catch (e) {
      return { status: e.response?.status || 'ERR', data: e.response?.data || e.message };
    }
  };

  const send = async () => {
    setBusy(true);
    setResp(null);
    const out = await callGateway({ method: f.method, url, apiKey: f.apiKey.trim() });
    setResp(out);
    setBusy(false);
  };

  /**
   * One-click demo boot: sign in as the public demo account, locate the
   * seeded project, issue a fresh key and auto-call an auth-required
   * endpoint. Credentials come from utils/demo.js but are never displayed
   * here (they render ONLY on /login, via components/DemoLogin.jsx).
   */
  const launch = async () => {
    setBootErr('');
    setResp(null);
    setBootStep(0);
    try {
      if (!isAuthenticated || user?.email !== DEMO_CREDENTIALS.email) {
        await login({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
      }
      setBootStep(1);
      const list = await projectService.list({ limit: 50 }).then((r) => r?.items || r?.projects || (Array.isArray(r) ? r : r?.data) || []).catch(() => []);
      const demo = list.find((p) => p.slug === DEMO_SLUG)
        || list.find((p) => (p.name || '').toLowerCase().includes('demo weather'))
        || list[0];
      if (!demo) throw new Error('Demo project not found — the server seed has not run yet. Start the backend and retry.');
      const pid = demo._id || demo.id;
      const ref = demo.slug || pid;
      setBootStep(2);
      let key = '';
      try {
        const k = await keyService.create(pid, { name: `Demo console ${new Date().toISOString().slice(0, 10)}` });
        key = k?.apiKey || k?.key || k?.plainKey || '';
      } catch {
        // Non-fatal: /current is public, the console still works without a key.
      }
      setBootStep(3);
      setF({ projectId: ref, method: 'GET', path: key ? '/forecast' : '/current', version: 'v1', apiKey: key });
      const first = await callGateway({
        method: 'GET',
        url: `${GATEWAY_URL}/${ref}/${key ? 'forecast' : 'current'}?version=v1`,
        apiKey: key,
      });
      setResp(first);
      setBooted(true);
      setBootStep(-1);
    } catch (e) {
      setBootErr(extractError(e, 'Could not start the demo. Is the backend running?'));
      setBootStep(-1);
    }
  };

  const booting = bootStep >= 0;
  const sameDemoUser = user?.email === DEMO_CREDENTIALS.email;

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
        <h1 className="flex items-center gap-2 text-3xl font-extrabold"><Zap size={26} /> Live demo — no signup, no fake data</h1>
        <p className="mt-2 max-w-2xl text-slate-400">
          One click signs you into a shared demo workspace, issues a fresh API key and calls the real gateway.
          Everything you see in Logs and Analytics afterwards is real traffic.
        </p>

        {/* One-click demo launcher */}
        <section className="mt-8 overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-brand-950/60 via-slate-900 to-slate-900 p-6 sm:p-8" aria-busy={booting}>
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h2 className="flex items-center gap-2 text-xl font-bold"><Rocket size={20} className="text-brand-300" /> Try it in one click</h2>
              <p className="mt-2 text-sm text-slate-400">
                {isAuthenticated && !sameDemoUser
                  ? 'Heads up: this switches your current session to the shared demo account.'
                  : 'Runs fully client-side against this server: sign-in → project → fresh key → gateway call.'}
              </p>
              <ol className="mt-4 space-y-1.5 text-xs text-slate-400" aria-label="What the launcher does">
                {BOOT_STEPS.map((s, i) => (
                  <li key={s} className="flex items-center gap-2">
                    {booted ? (
                      <CheckCircle2 size={13} className="text-emerald-400" aria-hidden="true" />
                    ) : booting && bootStep === i ? (
                      <Loader2 size={13} className="motion-safe:animate-spin text-brand-300" aria-hidden="true" />
                    ) : (
                      <span className="inline-block h-3.5 w-3.5 rounded-full border border-slate-600" aria-hidden="true" />
                    )}
                    <span className={booted || (booting && bootStep >= i) ? 'text-slate-300' : ''}>{s}</span>
                  </li>
                ))}
              </ol>
              {bootErr && <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{bootErr}</p>}
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2">
              <button
                onClick={launch}
                disabled={booting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-brand-500 to-violet-500 px-8 py-4 text-base font-bold text-white shadow-pop transition duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {booting ? <Loader2 size={18} className="motion-safe:animate-spin" /> : <Play size={18} />}
                {booting ? 'Starting…' : booted ? 'Restart demo' : 'Launch demo'}
              </button>
              <Link to="/register" className="text-center text-xs font-semibold text-slate-400 hover:text-white">
                Prefer your own workspace? Register →
              </Link>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
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
            <h2 className="font-semibold">Gateway console</h2>
            <p className="mt-1 text-xs text-slate-500">
              Prefilled after launch — or explore with your own project &amp; key. Project accepts the slug or id.
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <div>
                <label htmlFor="demo-project" className="mb-1 block text-xs font-semibold text-slate-300">Project (slug or id)</label>
                <input id="demo-project" value={f.projectId} onChange={(e) => setF((x) => ({ ...x, projectId: e.target.value }))} placeholder="demo-weather-api" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-500 focus:border-brand-500" autoComplete="off" spellCheck={false} />
              </div>
              <div className="grid grid-cols-4 gap-2">
                <select aria-label="HTTP method" value={f.method} onChange={(e) => setF((x) => ({ ...x, method: e.target.value }))} className="rounded-xl border border-white/10 bg-slate-900 px-2 py-2 font-mono text-xs outline-none">
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input aria-label="Endpoint path" value={f.path} onChange={(e) => setF((x) => ({ ...x, path: e.target.value }))} placeholder="/current" className="col-span-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500" autoComplete="off" spellCheck={false} />
                <input aria-label="Version" value={f.version} onChange={(e) => setF((x) => ({ ...x, version: e.target.value }))} placeholder="v1" title="?version=" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none focus:border-brand-500" autoComplete="off" spellCheck={false} />
              </div>
              <div>
                <label htmlFor="demo-key" className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-300"><KeyRound size={12} /> API key (x-api-key)</label>
                <input id="demo-key" value={f.apiKey} onChange={(e) => setF((x) => ({ ...x, apiKey: e.target.value }))} placeholder="issued automatically at launch" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 font-mono text-xs outline-none placeholder:text-slate-500 focus:border-brand-500" autoComplete="off" spellCheck={false} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={send} disabled={busy} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold hover:bg-brand-500 disabled:opacity-60">
                  <Play size={14} /> {busy ? 'Calling…' : 'Send request'}
                </button>
                <CopyButton text={`curl "${url}"${f.apiKey ? ` -H "x-api-key: ${f.apiKey}"` : ''}`} label="Copy curl" />
              </div>
              <p className="break-all font-mono text-[11px] text-slate-500">{f.method} {url}</p>
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
              <pre className="mt-3 overflow-x-auto rounded-xl bg-black/50 p-4 font-mono text-xs leading-relaxed text-slate-300">{`curl "${url}"${f.apiKey ? ` \\\n  -H "x-api-key: ${f.apiKey}"` : ''}`}</pre>
              <p className="mt-2 text-xs text-slate-500">
                Demo endpoints: <code className="text-brand-300">GET /current</code> (public), <code className="text-brand-300">GET /forecast</code> and <code className="text-brand-300">POST /alerts</code> (key required).
                Wrong/missing key → 401, wrong scope → 403, too many calls → 429.
              </p>
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
