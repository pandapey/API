const ApiProject = require('../models/ApiProject');
const ApiEndpoint = require('../models/ApiEndpoint');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { getPagination, buildPaginatedResponse } = require('../utils/pagination');
const { canAccess } = require('./projectController');

async function loadProject(req) {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  return project;
}

const list = asyncHandler(async (req, res) => {
  await loadProject(req);
  const { page, limit, skip } = getPagination(req.query);
  const filter = { project: req.params.id };
  if (req.query.version) filter.version = req.query.version;
  if (req.query.method) filter.method = String(req.query.method).toUpperCase();
  if (req.query.search) filter.path = { $regex: String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 120), $options: 'i' };
  const [items, total] = await Promise.all([
    ApiEndpoint.find(filter).sort({ method: 1, path: 1 }).skip(skip).limit(limit),
    ApiEndpoint.countDocuments(filter),
  ]);
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, limit) });
});

const create = asyncHandler(async (req, res) => {
  await loadProject(req);
  const { versionId } = req.body;
  if (versionId) {
    // versionId must belong to THIS project — prevents cross-project data corruption.
    const ApiVersion = require('../models/ApiVersion');
    const version = await ApiVersion.findOne({ _id: versionId, project: req.params.id }).select('_id').lean();
    if (!version) throw new ApiError(400, 'versionId does not belong to this project', 'VALIDATION_ERROR');
  }
  const doc = await ApiEndpoint.create({ ...req.body, project: req.params.id, method: String(req.body.method).toUpperCase() });
  res.status(201).json({ success: true, data: doc });
});

const getOne = asyncHandler(async (req, res) => {
  await loadProject(req);
  const doc = await ApiEndpoint.findOne({ _id: req.params.endpointId, project: req.params.id });
  if (!doc) throw new ApiError(404, 'Endpoint not found', 'NOT_FOUND');
  res.json({ success: true, data: doc });
});

const update = asyncHandler(async (req, res) => {
  await loadProject(req);
  const doc = await ApiEndpoint.findOne({ _id: req.params.endpointId, project: req.params.id });
  if (!doc) throw new ApiError(404, 'Endpoint not found', 'NOT_FOUND');
  if (req.body.method) req.body.method = String(req.body.method).toUpperCase();
  const { versionId } = req.body;
  if (versionId !== undefined) {
    if (versionId === null) {
      req.body.versionId = null;
    } else {
      // versionId must belong to THIS project — prevents cross-project data corruption.
      const ApiVersion = require('../models/ApiVersion');
      const version = await ApiVersion.findOne({ _id: versionId, project: req.params.id }).select('_id').lean();
      if (!version) throw new ApiError(400, 'versionId does not belong to this project', 'VALIDATION_ERROR');
    }
  }
  Object.assign(doc, req.body);
  await doc.save();
  res.json({ success: true, data: doc });
});

const remove = asyncHandler(async (req, res) => {
  await loadProject(req);
  const doc = await ApiEndpoint.findOne({ _id: req.params.endpointId, project: req.params.id });
  if (!doc) throw new ApiError(404, 'Endpoint not found', 'NOT_FOUND');
  await doc.deleteOne();
  res.json({ success: true, data: { message: 'Endpoint deleted' } });
});

module.exports = { list, create, getOne, update, remove };
