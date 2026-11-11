import { Suspense, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';
import Toast from './Toast.jsx';
import PageTransition from './PageTransition.jsx';
import { RouteFallback } from './Skeleton.jsx';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen bg-slate-100 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.07),transparent_55%)] dark:bg-slate-950 dark:bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.12),transparent_55%)]">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="lg:pl-64">
        <Topbar onMenu={() => setMobileOpen(true)} mobileOpen={mobileOpen} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
          {/* Inner boundary: lazy page loads keep the sidebar/topbar visible
              instead of flashing a full-page skeleton over the whole shell. */}
          <Suspense fallback={<RouteFallback />}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </Suspense>
        </main>
      </div>
      <Toast />
    </div>
  );
}
