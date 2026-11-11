import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }
  if (roles?.length && !roles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
