import api from './api.js';

const unwrap = (res) => res.data?.data ?? res.data;

export const keyService = {
  async list(params = {}) {
    const res = await api.get('/keys', { params });
    return unwrap(res);
  },
  async listByProject(projectId) {
    const res = await api.get('/keys', { params: { projectId } });
    return unwrap(res);
  },
  async create(projectId, payload) {
    if (!projectId) throw new Error('projectId is required');
    const res = await api.post(`/projects/${projectId}/keys`, payload);
    return unwrap(res);
  },
  async revoke(id) {
    const res = await api.post(`/keys/${id}/revoke`);
    return unwrap(res);
  },
  async rotate(id) {
    const res = await api.post(`/keys/${id}/rotate`);
    return unwrap(res);
  },
  async delete(id) {
    const res = await api.delete(`/keys/${id}`);
    return unwrap(res);
  },
};
