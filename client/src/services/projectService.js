import api from './api.js';

function unwrap(res) {
  return res.data?.data ?? res.data;
}

export const projectService = {
  async list(params = {}) {
    const res = await api.get('/projects', { params });
    return unwrap(res);
  },
  async get(id) {
    const res = await api.get(`/projects/${id}`);
    return unwrap(res);
  },
  async create(payload) {
    const res = await api.post('/projects', payload);
    return unwrap(res);
  },
  async update(id, payload) {
    const res = await api.put(`/projects/${id}`, payload);
    return unwrap(res);
  },
  async remove(id) {
    const res = await api.delete(`/projects/${id}`);
    return unwrap(res);
  },
  async publish(id) {
    const res = await api.post(`/projects/${id}/publish`);
    return unwrap(res);
  },
  async unpublish(id) {
    const res = await api.post(`/projects/${id}/unpublish`);
    return unwrap(res);
  },
  // versions
  async listVersions(projectId) {
    const res = await api.get(`/projects/${projectId}/versions`);
    return unwrap(res);
  },
  async createVersion(projectId, payload) {
    const res = await api.post(`/projects/${projectId}/versions`, payload);
    return unwrap(res);
  },
  async deleteVersion(projectId, versionId) {
    const res = await api.delete(`/projects/${projectId}/versions/${versionId}`);
    return unwrap(res);
  },
  // endpoints
  async listEndpoints(projectId, params = {}) {
    const res = await api.get(`/projects/${projectId}/endpoints`, { params });
    return unwrap(res);
  },
  async createEndpoint(projectId, payload) {
    const res = await api.post(`/projects/${projectId}/endpoints`, payload);
    return unwrap(res);
  },
  async updateEndpoint(projectId, endpointId, payload) {
    const res = await api.put(`/projects/${projectId}/endpoints/${endpointId}`, payload);
    return unwrap(res);
  },
  async deleteEndpoint(projectId, endpointId) {
    const res = await api.delete(`/projects/${projectId}/endpoints/${endpointId}`);
    return unwrap(res);
  },
};
