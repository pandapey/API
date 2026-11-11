export function formatNumber(n) {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return '—';
  const num = Number(n);
  if (Math.abs(num) >= 1_000_000) return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (Math.abs(num) >= 1_000) return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return num.toLocaleString();
}

export function formatMs(ms) {
  if (ms === null || ms === undefined || ms === '') return '—';
  const n = Number(ms);
  if (Number.isNaN(n)) return String(ms);
  if (n < 1000) return `${Math.round(n)} ms`;
  return `${(n / 1000).toFixed(2)} s`;
}

export function formatDate(v) {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDateShort(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function formatPercent(ratio) {
  if (ratio === null || ratio === undefined || Number.isNaN(Number(ratio))) return '—';
  return `${(Number(ratio) * 100).toFixed(1)}%`;
}

export function truncate(s, len = 48) {
  if (!s) return '';
  const str = String(s);
  return str.length > len ? `${str.slice(0, len)}…` : str;
}

export function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}
