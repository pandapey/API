import api from './api.js';

const unwrap = (res) => res.data?.data ?? res.data;

export const webhookService = {
  async list(projectId) {
    const res = await api.get(`/projects/${projectId}/webhooks`);
    return unwrap(res);
  },
  async create(projectId, payload) {
    const res = await api.post(`/projects/${projectId}/webhooks`, payload);
    return unwrap(res);
  },
  async update(projectId, webhookId, payload) {
    const res = await api.put(`/projects/${projectId}/webhooks/${webhookId}`, payload);
    return unwrap(res);
  },
  async remove(projectId, webhookId) {
    const res = await api.delete(`/projects/${projectId}/webhooks/${webhookId}`);
    return unwrap(res);
  },
  async test(projectId, webhookId) {
    // server exposes test on top-level router: POST /api/webhooks/:id/test
    void projectId;
    const res = await api.post(`/webhooks/${webhookId}/test`, {});
    return unwrap(res);
  },
};
