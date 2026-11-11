import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetSchema } from '../schemas/authSchema.js';
import { authService } from '../services/authService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import PasswordInput from '../components/PasswordInput.jsx';
import Toast from '../components/Toast.jsx';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: params.get('token') || '' },
  });

  const onSubmit = async (v) => {
    setBusy(true);
    try {
      await authService.resetPassword(v);
      toast.success('Password updated — please sign in');
      navigate('/login');
    } catch (e) {
      toast.error(extractError(e, 'Reset failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-grid-bg flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <form onSubmit={handleSubmit(onSubmit)} className="page-enter w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur" noValidate>
        <h1 className="text-xl font-bold tracking-tight text-white">Set new password</h1>
        <div className="mt-5 space-y-4">
          <div>
            <label htmlFor="reset-token" className="label !text-slate-300">Reset token</label>
            <input id="reset-token" className="input font-mono !border-slate-700 !bg-slate-800/80 !text-white" {...register('token')} placeholder="paste token from email" aria-invalid={!!errors.token} />
            {errors.token && <p role="alert" className="form-error">{errors.token.message}</p>}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="reset-pass" className="label !text-slate-300">New password</label>
              <PasswordInput id="reset-pass" autoComplete="new-password" placeholder="Min. 8 characters" aria-invalid={!!errors.password} {...register('password')} />
              {errors.password && <p role="alert" className="form-error">{errors.password.message}</p>}
            </div>
            <div>
              <label htmlFor="reset-confirm" className="label !text-slate-300">Confirm</label>
              <PasswordInput id="reset-confirm" autoComplete="new-password" placeholder="Repeat password" aria-invalid={!!errors.confirmPassword} {...register('confirmPassword')} />
              {errors.confirmPassword && <p role="alert" className="form-error">{errors.confirmPassword.message}</p>}
            </div>
          </div>
        </div>
        <button disabled={busy} className="btn-primary mt-5 w-full" aria-busy={busy}>{busy ? 'Updating…' : 'Update password'}</button>
        <Link to="/login" className="mt-4 block text-center text-sm text-brand-300 hover:underline">Back to login</Link>
      </form>
      <Toast />
    </div>
  );
}
