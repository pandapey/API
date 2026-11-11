import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotSchema } from '../schemas/authSchema.js';
import { authService } from '../services/authService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Toast from '../components/Toast.jsx';

export default function ForgotPassword() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(forgotSchema) });

  const onSubmit = async ({ email }) => {
    setBusy(true);
    try {
      await authService.forgotPassword(email);
      setSent(true);
      toast.success('Reset link sent — check your inbox');
    } catch (e) {
      toast.error(extractError(e, 'Could not send reset email'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-grid-bg flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <form onSubmit={handleSubmit(onSubmit)} className="page-enter w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur" noValidate>
        <h1 className="text-xl font-bold tracking-tight text-white">Reset password</h1>
        <p className="mt-1 text-sm text-slate-400">{sent ? 'If that email exists, a reset link is on its way.' : 'Enter your account email and we will send a reset link.'}</p>
        {!sent && (
          <>
            <div className="mt-5">
              <label htmlFor="forgot-email" className="label !text-slate-300">Email</label>
              <input id="forgot-email" type="email" autoComplete="email" className="input !border-slate-700 !bg-slate-800/80 !text-white" {...register('email')} placeholder="you@company.com" aria-invalid={!!errors.email} />
              {errors.email && <p role="alert" className="form-error">{errors.email.message}</p>}
            </div>
            <button disabled={busy} className="btn-primary mt-5 w-full" aria-busy={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          </>
        )}
        <div className="mt-4 flex justify-between text-sm">
          <Link to="/login" className="text-brand-600 hover:underline">Back to login</Link>
          <Link to="/reset-password" className="text-slate-500 hover:underline">Have a token?</Link>
        </div>
      </form>
      <Toast />
    </div>
  );
}
