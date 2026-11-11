import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Menu, Moon, Sun, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useSocket } from '../hooks/useSocket.js';

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { connected } = useSocket([]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open ]);

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
        <button onClick={onMenu} className="btn-ghost !p-2 lg:hidden" aria-label="Open menu" aria-expanded="false">
          <Menu size={20} />
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <span
            title={connected ? 'Realtime connected' : 'Realtime offline — data refreshes on navigation'}
            className={`mr-1 hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold sm:flex ${connected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} /> {connected ? 'Live' : 'Offline'}
          </span>
          <button onClick={toggle} className="btn-ghost !p-2 transition active:scale-90" aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'} title="Toggle theme">
            {isDark ? <Sun size={19} /> : <Moon size={19} />}
          </button>
          <button onClick={() => navigate('/logs')} className="btn-ghost !p-2 transition active:scale-90" aria-label="View request logs" title="Request logs">
            <Bell size={19} />
          </button>
          <div className="relative">
            <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-violet-600 text-sm font-bold text-white shadow-pop">
                {(user?.name || user?.email || 'D')[0].toUpperCase()}
              </span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block max-w-[140px] truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name || 'Developer'}</span>
                <span className="block text-[11px] capitalize text-slate-500">{user?.role || 'developer'}</span>
              </span>
              <ChevronDown size={15} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)} aria-hidden="true" />
                <div role="menu" className="absolute right-0 z-20 mt-2 w-48 scale-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <button role="menuitem" onClick={() => { setOpen(false); navigate('/profile'); }} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition hover:bg-slate-50 dark:hover:bg-slate-800">
                    <User size={15} /> Profile
                  </button>
                  <button role="menuitem" onClick={doLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 dark:hover:bg-rose-950/40">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
