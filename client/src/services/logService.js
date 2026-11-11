import api from './api.js';

const unwrap = (res) => res.data?.data ?? res.data;

export const logService = {
  async list(params = {}) {
    const res = await api.get('/logs', { params });
    return unwrap(res);
  },
  // NOTE: there is no GET /api/logs/:id on the server (logs are list-only +
  // CSV export), so no `get(id)` here — a dead method that would 404.
  async exportCsv(params = {}) {
    const clean = { ...params };
    Object.keys(clean).forEach((k) => (clean[k] === '' || clean[k] === undefined || clean[k] === null) && delete clean[k]);
    const res = await api.get('/logs/export', { params: clean, responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `devapi-logs-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  },
};
