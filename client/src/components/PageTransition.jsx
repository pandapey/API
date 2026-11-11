import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import useReveal from '../hooks/useReveal.js';

export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  useReveal([pathname]);

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
