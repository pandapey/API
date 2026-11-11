import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Never-hide debug buffer: bypasses DevTools "N hidden" filter.
// Type window.__devapi_logs in Console input to see everything even if filtered.
if (!window.__devapi_logs) {
  window.__devapi_logs = [];
  const push = (type, args) => {
    try {
      window.__devapi_logs.push({ at: new Date().toISOString(), type, msg: args.map((a) => { try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch { return String(a); } }).join(' ') });
      if (window.__devapi_logs.length > 200) window.__devapi_logs = window.__devapi_logs.slice(-200);
    } catch {}
  };
  for (const t of ['error', 'warn']) {
    const orig = console[t].bind(console);
    console[t] = (...args) => { push(t, args); orig(...args); };
  }
  window.addEventListener('error', (e) => push('error', ['window.onerror', e.message, e.filename, e.lineno]));
  window.addEventListener('unhandledrejection', (e) => push('error', ['unhandledrejection', String(e.reason?.message || e.reason)]));
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
