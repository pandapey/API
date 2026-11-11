import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  BarChart3,
  BookOpen,
  FileText,
  Gauge,
  HeartPulse,
  KeyRound,
  LayoutDashboard,
  FolderKanban,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  Webhook,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const mainNav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/endpoints', label: 'Endpoints', icon: Gauge },
  { to: '/keys', label: 'API Keys', icon: KeyRound },
  { to: '/logs', label: 'Logs', icon: ScrollText },
  { to: '/webhooks', label: 'Webhooks', icon: Webhook },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/docs', label: 'Docs', icon: BookOpen },
];

const adminNav = [
  { to: '/admin', label: 'Overview', icon: ShieldCheck },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/projects', label: 'All Projects', icon: FileText },
  { to: '/admin/requests', label: 'Requests', icon: Activity },
  { to: '/admin/health', label: 'Health', icon: HeartPulse },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

function linkCls({ isActive }) {
  return `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition duration-200 ${
    isActive
      ? 'bg-gradient-to-r from-brand-600 to-violet-600 text-white shadow-pop'
      : 'text-slate-600 hover:translate-x-0.5 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
  }`;
}

export default function Sidebar({ mobileOpen, onClose }) {
  const { isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  const doLogout = async () => {
    await logout();
    navigate('/login');
  };
  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          onKeyDown={(e) => e.key === 'Escape' && onClose?.()}
          role="button"
          tabIndex={0}
          aria-label="Close menu"
        />
      )}
      <aside
        aria-label="Primary navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white/95 backdrop-blur transition-transform duration-300 dark:border-slate-800 dark:bg-slate-900/95 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 font-bold text-white shadow-pop">D</span>
            <span className="text-left leading-tight">
              <span className="block text-[15px] font-bold text-slate-900 dark:text-white">DevAPI Hub</span>
              <span className="block text-[11px] font-medium text-slate-500">Developer Platform</span>
            </span>
          </button>
          <button onClick={onClose} className="btn-ghost !p-1.5 lg:hidden" aria-label="Close menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Workspace</p>
          {mainNav.map((n) => (
            <NavLink key={n.to} to={n.to} className={linkCls} onClick={onClose}>
              <n.icon size={18} />
              {n.label}
            </NavLink>
          ))}
          {isAdmin && (
            <>
              <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Administration</p>
              {adminNav.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === '/admin'} className={linkCls} onClick={onClose}>
                  <n.icon size={18} />
                  {n.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <div className="gradient-border relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-violet-600 p-4 text-white">
            <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15 blur-xl" aria-hidden="true" />
            <p className="text-sm font-semibold">Explore the live demo</p>
            <p className="mt-0.5 text-xs text-white/80">Try gateway, keys & analytics with sample data.</p>
            <button onClick={() => { onClose?.(); navigate('/docs'); }} className="mt-3 w-full rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur transition hover:bg-white/25 active:scale-[0.98]">
              Open API docs
            </button>
          </div>
          <button onClick={doLogout} className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 active:scale-[0.98] dark:border-slate-700 dark:text-rose-400 dark:hover:bg-rose-950/40">
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
