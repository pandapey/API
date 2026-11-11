import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { authService } from '../services/authService.js';
import { useToast } from '../context/ToastContext.jsx';
import { extractError } from '../services/api.js';
import Badge from '../components/Badge.jsx';

export default function Profile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);

  // Sync form once async user loads (fetchMe) without clobbering edits.
  useEffect(() => {
    setForm((f) => ({
      name: f.name || user?.name || '',
      email: user?.email || '',
    }));
  }, [user?.email, user?.name]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await authService.updateProfile({ name: form.name });
      const u = res?.user ?? res;
      if (u) setUser({ ...user, ...u });
      toast.success('Profile updated');
    } catch (err) {
      toast.error(extractError(err, 'Update failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-sm text-slate-500">Manage your developer identity.</p>
      </div>
      <div className="card flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-xl font-bold text-white">
          {(user?.name || user?.email || 'D')[0].toUpperCase()}
        </span>
        <div>
          <p className="font-semibold text-slate-900 dark:text-white">{user?.name}</p>
          <p className="text-sm text-slate-500">{user?.email}</p>
          <div className="mt-1"><Badge tone={user?.role === 'admin' ? 'purple' : 'blue'}>{user?.role || 'developer'}</Badge></div>
        </div>
      </div>
      <form onSubmit={save} className="card space-y-4 p-5">
        <div>
          <label htmlFor="profile-name" className="label">Display name</label>
          <input id="profile-name" ref={nameRef} className="input" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} autoComplete="name" />
        </div>
        <div>
          <label htmlFor="profile-email" className="label">Email (read-only)</label>
          <input id="profile-email" className="input opacity-60" value={form.email} disabled readOnly />
        </div>
        <button disabled={busy} className="btn-primary" aria-busy={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
      </form>
      <div className="card p-5 text-sm text-slate-500 dark:text-slate-400">
        <p className="font-semibold text-slate-900 dark:text-white">Session</p>
        <p className="mt-1 text-sm">Signed in as <span className="font-medium text-slate-900 dark:text-white">{user?.email}</span> with role <span className="font-medium">{user?.role || 'developer'}</span>.</p>
        <p className="mt-2 text-xs">Access token is kept in memory + httpOnly refresh cookie with automatic rotation on 401. Tokens are never displayed here.</p>
      </div>
    </div>
  );
}
