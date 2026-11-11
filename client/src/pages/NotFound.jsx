import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function NotFound() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="fade-up mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="gradient-border flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500/15 to-violet-500/15 text-brand-600 dark:text-brand-300">
        <Compass size={28} />
      </span>
      <h1 className="mt-5 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white">404</h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">This route doesn&apos;t exist or you don&apos;t have access to it.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link to={isAuthenticated ? '/dashboard' : '/'} className="btn-primary">
          <Home size={16} /> {isAuthenticated ? 'Back to dashboard' : 'Back home'}
        </Link>
        {!isAuthenticated && (
          <Link to="/login" className="btn-secondary">Sign in</Link>
        )}
      </div>
    </div>
  );
}
