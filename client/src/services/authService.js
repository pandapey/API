import api from './api.js';

export const authService = {
  async login(payload) {
    const { data } = await api.post('/auth/login', payload);
    return data?.data ?? data;
  },
  async register(payload) {
    const { data } = await api.post('/auth/register', payload);
    return data?.data ?? data;
  },
  async me() {
    const { data } = await api.get('/auth/me');
    return data?.data ?? data;
  },
  async logout() {
    try {
      await api.post('/auth/logout', {});
    } catch (e) { console.error('[authService logout failed]', e?.response?.data || e.message); }
  },
  async refresh() {
    const { data } = await api.post('/auth/refresh', {});
    return data?.data ?? data;
  },
  async forgotPassword(email) {
    const { data } = await api.post('/auth/forgot', { email });
    return data?.data ?? data;
  },
  async resetPassword(payload) {
    const { data } = await api.post('/auth/reset', payload);
    return data?.data ?? data;
  },
  async updateProfile(payload) {
    const { data } = await api.patch('/auth/me', payload);
    return data?.data ?? data;
  },
};
