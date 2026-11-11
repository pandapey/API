import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Check, FlaskConical, KeyRound, LogOut, PlayCircle, ShieldCheck, Webhook, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import useReveal from '../hooks/useReveal.js';

const features = [
  { icon: Zap, title: 'Blazing gateway', desc: 'Route, throttle and cache upstream APIs through one managed gateway with per-key rate limits.' },
  { icon: KeyRound, title: 'API keys & scopes', desc: 'Issue revocable keys per project with expiry, quotas and instant rotation.' },
  { icon: BarChart3, title: 'Live analytics', desc: 'Requests over time, status mix, latency p95 and per-endpoint breakdowns.' },
  { icon: ShieldCheck, title: 'Logs & audit', desc: 'Searchable request logs with status, latency and payload inspection.' },
  { icon: Webhook, title: 'Webhooks', desc: 'Fire signed events on key lifecycle, errors and traffic spikes.' },
  { icon: Check, title: 'Docs & Try-it', desc: 'Auto-generated docs with an in-browser console that calls the gateway.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  useReveal();

  const goPrimary = (fallback) => navigate(isAuthenticated ? '/dashboard' : fallback);
  const goPlan = (planName) => {
    if (planName === 'Enterprise') return navigate('/contact');
    if (isAuthenticated) return navigate('/dashboard');
    return navigate('/register');
  };
  const goDocs = () => navigate(isAuthenticated ? '/docs' : '/login');
  return (
    <div className="auth-grid-bg min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 font-bold shadow-pop">D</span>
            <span className="text-lg font-bold tracking-tight">DevAPI Hub</span>
          </div>
          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <span className="hidden px-2 text-sm text-slate-300 sm:block">Hi, {user?.name || user?.email || 'Developer'}</span>
                <button onClick={() => navigate('/dashboard')} className="rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold shadow-pop transition hover:brightness-110 active:scale-95">
                  Dashboard
                </button>
                <button onClick={async () => { await logout(); navigate('/'); }} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-semibold transition hover:bg-white/10">
                  <LogOut size={14} /> Sign out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-300 transition hover:text-white">Sign in</Link>
                <button onClick={() => navigate('/login')} className="hidden items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/20 sm:inline-flex" title="Sign in with the public demo account — no signup needed">
                  <FlaskConical size={15} /> Demo account
                </button>
                <button onClick={() => navigate('/register')} className="rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-4 py-2 text-sm font-semibold shadow-pop transition hover:brightness-110 active:scale-95">
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-14 text-center">
        <p className="fade-up mx-auto inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-brand-200">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> v1 API platform for modern teams
        </p>
        <h1 className="fade-up mx-auto mt-5 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl" style={{ '--reveal-delay': '80ms' }}>
          Ship, monitor &amp; scale your <span className="bg-gradient-to-r from-brand-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">developer APIs</span>
        </h1>
        <p className="fade-up mx-auto mt-4 max-w-2xl text-slate-400" style={{ '--reveal-delay': '160ms' }}>
          One dashboard for projects, keys, gateway traffic, logs, webhooks and analytics. Built like Stripe — clean, fast, API-first.
        </p>
        <div className="fade-up mt-8 flex flex-col justify-center gap-3 sm:flex-row" style={{ '--reveal-delay': '240ms' }}>
          <button onClick={() => goPrimary('/register')} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 px-6 py-3 font-semibold shadow-pop transition hover:brightness-110 hover:shadow-glow active:scale-95">
            {isAuthenticated ? 'Open dashboard' : 'Start building free'} <ArrowRight size={18} />
          </button>
          <button onClick={() => navigate('/demo')} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-6 py-3 font-semibold transition hover:-translate-y-px hover:bg-white/10">
            Explore gateway console
          </button>
        </div>
        {!isAuthenticated && (
          <button onClick={() => navigate('/login')} className="fade-up mx-auto mt-4 inline-flex items-center gap-2 text-sm text-emerald-200/90 transition hover:text-emerald-100 hover:underline" style={{ '--reveal-delay': '300ms' }}>
            <FlaskConical size={15} /> No signup? Sign in with the public demo account →
          </button>
        )}
        <Link to="/demo" className="fade-up mx-auto mt-1.5 inline-flex items-center gap-2 text-sm text-brand-200/90 transition hover:text-brand-100 hover:underline" style={{ '--reveal-delay': '360ms' }}>
          <PlayCircle size={15} /> Or try the one-click live demo console →
        </Link>
        <div className="reveal mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 shadow-2xl backdrop-blur">
          <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-2 font-mono text-xs text-slate-400">curl — gateway request</span>
          </div>
          <pre className="overflow-x-auto p-5 text-left font-mono text-[13px] leading-relaxed text-slate-300">
{`curl https://api.devapihub.dev/gateway/demo-weather-api/current \\
  -H "x-api-key: dk_live_9f2..." \\
  -H "Content-Type: application/json"\n\n# → 200 OK · 42ms · rate-limit 119/120 remaining`}
          </pre>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-6 pb-16 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <div key={f.title} className="reveal group rounded-2xl border border-white/10 bg-white/[.03] p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-500/40 hover:bg-white/[.05] hover:shadow-glow" style={{ '--reveal-delay': `${(i % 3) * 90}ms` }}>
            <span className="inline-flex rounded-xl bg-gradient-to-br from-brand-600/30 to-violet-600/20 p-2.5 text-brand-200 transition group-hover:scale-110"><f.icon size={20} /></span>
            <h3 className="mt-3 font-semibold tracking-tight">{f.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-slate-400">{f.desc}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: 'Starter', price: '$0', cta: 'Start free', feats: ['2 projects', '10k req/mo', '7-day log retention', 'Community support'] },
            { name: 'Pro', price: '$29', cta: 'Start 14-day trial', hot: true, feats: ['Unlimited projects', '1M req/mo', '90-day retention', 'Webhooks + alerts', 'Priority support'] },
            { name: 'Enterprise', price: 'Custom', cta: 'Talk to sales', feats: ['SSO/SAML', 'Dedicated gateway', 'Audit logs', 'SLA 99.99%'] },
          ].map((p) => (
            <div key={p.name} className={`rounded-2xl border p-6 ${p.hot ? 'border-brand-500 bg-brand-600/10' : 'border-white/10 bg-white/[.03]'}`}>
              <p className="text-sm font-semibold text-slate-300">{p.name}</p>
              <p className="mt-1 text-3xl font-extrabold">{p.price}<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {p.feats.map((f) => <li key={f} className="flex items-center gap-2"><Check size={15} className="text-emerald-400" />{f}</li>)}
              </ul>
              <button onClick={() => goPlan(p.name)} className={`mt-5 w-full rounded-xl px-4 py-2.5 text-sm font-semibold ${p.hot ? 'bg-brand-600 hover:bg-brand-500' : 'border border-white/15 bg-white/5 hover:bg-white/10'}`}>{p.cta}</button>
            </div>
          ))}
        </div>
        <footer className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 DevAPI Hub. Built for developers.</p>
          <div className="flex gap-4"><Link to="/demo" className="transition hover:text-white">Live demo</Link><button onClick={goDocs} className="transition hover:text-white">Docs</button><Link to="/status" className="transition hover:text-white">Status</Link><Link to="/contact" className="transition hover:text-white">Contact</Link></div>
        </footer>
      </section>
    </div>
  );
}
