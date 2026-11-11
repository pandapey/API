import api from './api.js';

const unwrap = (res) => res.data?.data ?? res.data;

export const analyticsService = {
  async overview(params = {}) {
    const res = await api.get('/analytics/overview', { params });
    return unwrap(res);
  },
  async timeseries(params = {}) {
    const res = await api.get('/analytics/timeseries', { params });
    return unwrap(res);
  },
  async byEndpoint(params = {}) {
    const res = await api.get('/analytics/endpoints', { params });
    return unwrap(res);
  },
  async byStatus(params = {}) {
    const res = await api.get('/analytics/status', { params });
    return unwrap(res);
  },
  async latency(params = {}) {
    const res = await api.get('/analytics/latency', { params });
    return unwrap(res);
  },
};
