import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, Loader2 } from 'lucide-react';
import { registerSchema } from '../schemas/authSchema.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import PasswordInput from '../components/PasswordInput.jsx';
import Toast from '../components/Toast.jsx';

export default function Register() {
  const { register: signup, isAuthenticated, loading } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (v) => {
    setBusy(true);
    try {
      const { name, email, password } = v;
      await signup({ name, email, password });
      toast.success('Account created — welcome!');
      navigate('/dashboard', { replace: true });
    } catch (e) {
      toast.error(extractError(e, 'Registration failed'));
    } finally {
      setBusy(false);
    }
  };

  if (!loading && isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="auth-grid-bg flex min-h-screen items-center justify-center bg-slate-950 px-6 py-10">
      <div className="page-enter w-full max-w-md">
        <Link to="/" className="mb-6 inline-flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 font-bold text-white shadow-pop">D</span>
          <span className="font-bold text-white">DevAPI Hub</span>
        </Link>
        <form onSubmit={handleSubmit(onSubmit)} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-7 shadow-2xl backdrop-blur sm:p-8" noValidate>
          <h1 className="text-2xl font-bold tracking-tight text-white">Create your account</h1>
          <p className="mt-1 text-sm text-slate-400">Free to start. No credit card required.</p>
          <div className="mt-6 space-y-4">
            <div>
              <label htmlFor="reg-name" className="label !text-slate-300">Name</label>
              <input id="reg-name" autoComplete="name" className="input !border-slate-700 !bg-slate-800/80 !text-white" placeholder="Ada Lovelace" aria-invalid={!!errors.name} {...register('name')} />
              {errors.name && <p role="alert" className="form-error">{errors.name.message}</p>}
            </div>
            <div>
              <label htmlFor="reg-email" className="label !text-slate-300">Email</label>
              <input id="reg-email" type="email" autoComplete="email" className="input !border-slate-700 !bg-slate-800/80 !text-white" placeholder="you@company.com" aria-invalid={!!errors.email} {...register('email')} />
              {errors.email && <p role="alert" className="form-error">{errors.email.message}</p>}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="reg-pass" className="label !text-slate-300">Password</label>
                <PasswordInput id="reg-pass" autoComplete="new-password" placeholder="Min. 8 characters" aria-invalid={!!errors.password} {...register('password')} />
                {errors.password && <p role="alert" className="form-error">{errors.password.message}</p>}
              </div>
              <div>
                <label htmlFor="reg-confirm" className="label !text-slate-300">Confirm</label>
                <PasswordInput id="reg-confirm" autoComplete="new-password" placeholder="Repeat password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
                {errors.confirmPassword && <p role="alert" className="form-error">{errors.confirmPassword.message}</p>}
              </div>
            </div>
          </div>
          <button disabled={busy} className="btn-primary mt-6 w-full !py-2.5" aria-busy={busy}>
            {busy ? (<><Loader2 size={16} className="animate-spin" /> Creating…</>) : (<>Create account <ArrowRight size={16} /></>)}
          </button>
          <p className="mt-4 text-center text-sm text-slate-400">Already have an account? <Link to="/login" className="font-semibold text-brand-300 hover:underline">Sign in</Link></p>
          <p className="mt-2 text-center text-xs text-slate-500">Or try the <Link to="/login" className="font-semibold text-slate-300 hover:underline">public demo account</Link> — no signup needed.</p>
        </form>
      </div>
      <Toast />
    </div>
  );
}
