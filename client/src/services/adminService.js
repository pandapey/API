import api from './api.js';

const unwrap = (res) => res.data?.data ?? res.data;

export const adminService = {
  async overview() {
    const res = await api.get('/admin/overview');
    return unwrap(res);
  },
  async users(params = {}) {
    const res = await api.get('/admin/users', { params });
    return unwrap(res);
  },
  async updateUserRole(id, role) {
    const res = await api.patch(`/admin/users/${id}`, { role });
    return unwrap(res);
  },
  async suspend(id, suspended) {
    const res = await api.put(`/admin/users/${id}/suspend`, { suspended });
    return unwrap(res);
  },
  async deleteUser(id) {
    const res = await api.delete(`/admin/users/${id}`);
    return unwrap(res);
  },
  async projects(params = {}) {
    const res = await api.get('/admin/projects', { params });
    return unwrap(res);
  },
  async requests(params = {}) {
    const res = await api.get('/admin/requests', { params });
    return unwrap(res);
  },
  async health() {
    const res = await api.get('/admin/health');
    return unwrap(res);
  },
  async audit(params = {}) {
    const res = await api.get('/admin/audit', { params });
    return unwrap(res);
  },
  async settings() {
    const res = await api.get('/admin/settings');
    return unwrap(res);
  },
  async updateSettings(payload) {
    const res = await api.put('/admin/settings', payload);
    return unwrap(res);
  },
};
