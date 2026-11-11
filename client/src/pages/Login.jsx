import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2, ShieldCheck, Zap, BarChart3 } from 'lucide-react';
import { loginSchema } from '../schemas/authSchema.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import { DEMO_CREDENTIALS } from '../utils/demo.js';
import PasswordInput from '../components/PasswordInput.jsx';
import DemoLogin from '../components/DemoLogin.jsx';
import Toast from '../components/Toast.jsx';

export default function Login() {
  const { login, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const loc = useLocation();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values) => {
    setBusy(true);
    try {
      await login(values);
      toast.success('Welcome back!');
      navigate(loc.state?.from || '/dashboard', { replace: true });
    } catch (e) {
      toast.error(extractError(e, 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  const useDemo = () => {
    setValue('email', DEMO_CREDENTIALS.email, { shouldValidate: true });
    setValue('password', DEMO_CREDENTIALS.password, { shouldValidate: true });
    toast.success('Demo credentials filled — hit Sign in');
  };

  const loginAsDemo = async () => {
    setBusy(true);
    try {
      setValue('email', DEMO_CREDENTIALS.email, { shouldValidate: true });
      setValue('password', DEMO_CREDENTIALS.password, { shouldValidate: true });
      await login({ email: DEMO_CREDENTIALS.email, password: DEMO_CREDENTIALS.password });
      toast.success('Welcome to the demo workspace!');
      navigate(loc.state?.from || '/dashboard', { replace: true });
    } catch (e) {
      toast.error(extractError(e, 'Demo login failed — is the demo account seeded?'));
    } finally {
      setBusy(false);
    }
  };

  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-grid-bg flex min-h-screen bg-slate-950">
      {/* Left marketing panel */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-800 to-violet-950 p-10 text-white lg:flex">
        <div className="animate-gradient-pan pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-500/20 via-transparent to-cyan-400/10" aria-hidden="true" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-72 w-72 rounded-full bg-brand-400/20 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" aria-hidden="true" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 font-bold shadow-pop backdrop-blur">D</span>
          <span className="text-lg font-bold tracking-tight">DevAPI Hub</span>
        </div>
        <div className="fade-up relative">
          <div className="chip !border-white/20 !bg-white/10 !text-white/90">API management · Gateway · Analytics</div>
          <h2 className="mt-4 max-w-md text-4xl font-extrabold leading-[1.1] tracking-tight">
            Every request, key &amp; latency — <span className="text-gradient">in one place.</span>
          </h2>
          <div className="mt-6 grid max-w-md gap-2.5 text-sm">
            {[
              { icon: Zap, text: 'Live gateway with mock + proxy modes' },
              { icon: ShieldCheck, text: 'Hashed keys, scopes & rate limits' },
              { icon: BarChart3, text: 'Logs, p95 latency & webhook events' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 backdrop-blur">
                <f.icon size={16} className="shrink-0 text-emerald-300" />
                <span className="text-white/90">{f.text}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 max-w-md rounded-2xl border border-white/15 bg-black/40 p-4 font-mono text-xs leading-relaxed text-emerald-200 shadow-2xl">
            <span className="text-white/50">$</span> curl -H &quot;x-api-key: dk_live_…&quot; gateway/demo-weather/current
            <br />
            <span className="text-emerald-300">→ 200 · 18ms · logged · webhook fired</span>
          </div>
        </div>
        <p className="relative text-xs text-white/60">Trusted by API teams shipping at scale · SOC2-friendly patterns</p>
      </div>

      {/* Right auth panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <div className="page-enter w-full max-w-md">
          <Link to="/" className="mb-6 inline-flex items-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 font-bold text-white shadow-pop">D</span>
            <span className="font-bold text-white">DevAPI Hub</span>
          </Link>
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl backdrop-blur sm:p-8">
            <h1 className="text-2xl font-bold tracking-tight text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-slate-400">Sign in to your developer workspace.</p>
            <form onSubmit={handleSubmit(onSubmit)} className="mt-6" noValidate>
              <div className="space-y-4">
                <div>
                  <label htmlFor="login-email" className="label !text-slate-300">Email</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    className="input !border-slate-700 !bg-slate-800/80 !text-white"
                    placeholder="you@company.com"
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && <p role="alert" className="form-error">{errors.email.message}</p>}
                </div>
                <div>
                  <label htmlFor="login-password" className="label !text-slate-300">Password</label>
                  <PasswordInput
                    id="login-password"
                    placeholder="••••••••"
                    aria-invalid={!!errors.password}
                    {...register('password')}
                  />
                  {errors.password && <p role="alert" className="form-error">{errors.password.message}</p>}
                </div>
              </div>
              <button disabled={busy} className="btn-primary mt-6 w-full !py-2.5" aria-busy={busy}>
                {busy ? (<><Loader2 size={16} className="animate-spin" /> Signing in…</>) : (<>Sign in <ArrowRight size={16} /></>)}
              </button>
            </form>
            <div className="mt-6">
              <DemoLogin onUseDemo={useDemo} onLoginAsDemo={loginAsDemo} busy={busy} />
            </div>
            <div className="mt-5 flex items-center justify-between text-sm">
              <Link to="/forgot-password" className="font-medium text-brand-300 transition hover:text-brand-200 hover:underline">Forgot password?</Link>
              <Link to="/register" className="font-medium text-slate-300 transition hover:text-white hover:underline">Create account</Link>
            </div>
            <Link to="/" className="mt-5 block text-center text-xs text-slate-500 transition hover:text-slate-300 hover:underline">← Back to site</Link>
          </div>
          <p className="mt-4 text-center text-[11px] text-slate-500">Protected by rate limiting · JWT rotation · hashed API keys</p>
        </div>
      </div>
      <Toast />
    </div>
  );
}
