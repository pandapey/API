import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Mail, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Contact() {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', topic: 'Sales', message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (!form.message.trim()) next.message = 'Message is required';
    else if (form.message.trim().length < 10) next.message = 'Tell us a little more (min 10 chars)';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    // Demo-only form: no backend yet — store locally and show success honestly.
    setSent(true);
  };

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
        <h1 className="flex items-center gap-2 text-3xl font-extrabold"><MessageSquare size={26} /> Contact us</h1>
        <p className="mt-2 text-slate-400">Sales, support or enterprise — we reply within 1 business day.</p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <form onSubmit={onSubmit} className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
            {sent ? (
              <div className="py-8 text-center" role="status">
                <span className="success-pop mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><Send size={22} /></span>
                <h2 className="mt-3 font-bold">Message noted (demo only)</h2>
                <p className="mt-1 text-sm text-slate-400">Thanks {form.name || 'there'} — this demo does not send email yet. For a real reply, write to support@devapihub.dev.</p>
                <button type="button" onClick={() => { setSent(false); setErrors({}); setForm({ name: '', email: '', topic: 'Sales', message: '' }); }} className="mt-5 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold hover:bg-white/10">
                  Send another
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="mb-1 block text-xs font-semibold text-slate-300">Name</label>
                    <input id="contact-name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ada Lovelace" aria-invalid={!!errors.name} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-brand-500" />
                    {errors.name && <p role="alert" className="mt-1 text-xs text-rose-400">{errors.name}</p>}
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="mb-1 block text-xs font-semibold text-slate-300">Email</label>
                    <input id="contact-email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@company.com" aria-invalid={!!errors.email} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-brand-500" />
                    {errors.email && <p role="alert" className="mt-1 text-xs text-rose-400">{errors.email}</p>}
                  </div>
                </div>
                <div className="mt-3">
                  <label htmlFor="contact-topic" className="mb-1 block text-xs font-semibold text-slate-300">Topic</label>
                  <select id="contact-topic" value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500">
                    <option>Sales</option>
                    <option>Support</option>
                    <option>Enterprise / SSO</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="mt-3">
                  <label htmlFor="contact-message" className="mb-1 block text-xs font-semibold text-slate-300">Message</label>
                  <textarea id="contact-message" required value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={5} placeholder="Tell us about your use-case, volume, timeline…" aria-invalid={!!errors.message} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm outline-none placeholder:text-slate-500 focus:border-brand-500" />
                  {errors.message && <p role="alert" className="mt-1 text-xs text-rose-400">{errors.message}</p>}
                </div>
                <button type="submit" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-brand-500 active:scale-[0.98]">
                  <Send size={15} /> Send message
                </button>
                <p className="mt-2 text-center text-[11px] text-slate-500">Demo form — no backend yet. Your message is not sent anywhere; email us directly for a reply.</p>
              </>
            )}
          </form>

          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6">
              <p className="flex items-center gap-2 font-semibold"><Mail size={17} /> Direct email</p>
              <a href="mailto:support@devapihub.dev" className="mt-1 block font-mono text-sm text-brand-300 hover:underline">support@devapihub.dev</a>
              <p className="mt-1 text-xs text-slate-500">For sales add subject “Enterprise — &lt;company&gt;”.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[.03] p-6 text-sm text-slate-300">
              <p className="font-semibold text-white">Prefer self-serve?</p>
              <ul className="mt-2 space-y-1.5 text-slate-400">
                <li>· <Link to="/demo" className="text-brand-300 hover:underline">Try the live demo</Link> without an account</li>
                <li>· <Link to="/status" className="text-brand-300 hover:underline">Check system status</Link></li>
                <li>· <Link to="/register" className="text-brand-300 hover:underline">Start building free</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
