const ApiProject = require('../models/ApiProject');
const ApiVersion = require('../models/ApiVersion');
const { asyncHandler, ApiError } = require('../utils/asyncHandler');
const { canAccess } = require('./projectController');

async function loadProject(req) {
  const project = await ApiProject.findById(req.params.id);
  if (!project) throw new ApiError(404, 'Project not found', 'NOT_FOUND');
  if (!canAccess(project, req.user)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN');
  return project;
}

const list = asyncHandler(async (req, res) => {
  await loadProject(req);
  const items = await ApiVersion.find({ project: req.params.id }).sort({ createdAt: 1 });
  res.json({ success: true, data: items });
});

const create = asyncHandler(async (req, res) => {
  const project = await loadProject(req);
  const { version, description, isDefault, copyFrom } = req.body;
  if (!version || typeof version !== 'string') throw new ApiError(400, 'version required', 'VALIDATION_ERROR');
  const cleanVersion = String(version).trim().slice(0, 40);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,39}$/.test(cleanVersion)) {
    throw new ApiError(400, 'version must be 1-40 chars: letters, numbers, . _ - (e.g. v1, v2)', 'VALIDATION_ERROR');
  }
  const existing = await ApiVersion.findOne({ project: project._id, version: cleanVersion });
  if (existing) throw new ApiError(409, `Version ${cleanVersion} already exists`, 'VERSION_EXISTS');
  if (isDefault) await ApiVersion.updateMany({ project: project._id }, { $set: { isDefault: false } });
  const doc = await ApiVersion.create({ project: project._id, version: cleanVersion, description: String(description || '').slice(0, 500), isDefault: !!isDefault });
  let copied = 0;
  if (copyFrom) {
    const ApiEndpoint = require('../models/ApiEndpoint');
    const src = await ApiEndpoint.find({ project: project._id, version: String(copyFrom) }).lean();
    if (src.length) {
      const bulk = src.map((e) => ({
        project: project._id,
        versionId: doc._id,
        version: cleanVersion,
        method: e.method,
        path: e.path,
        description: e.description,
        authRequired: e.authRequired,
        rateLimitPerMin: e.rateLimitPerMin,
        exampleResponse: e.exampleResponse,
        latencyMs: e.latencyMs,
        isActive: e.isActive,
      }));
      try {
        const inserted = await ApiEndpoint.insertMany(bulk, { ordered: false });
        copied = inserted.length;
      } catch (err) {
        // Partial copy: count what succeeded, surface clean error
        if (err?.insertedDocs) copied = err.insertedDocs.length;
        else throw new ApiError(400, 'Failed to copy endpoints (possible duplicates)', 'COPY_FAILED');
      }
    }
  }
  res.status(201).json({ success: true, data: { ...doc.toObject(), copiedEndpoints: copied } });
});

const getOne = asyncHandler(async (req, res) => {
  await loadProject(req);
  const doc = await ApiVersion.findOne({ _id: req.params.versionId, project: req.params.id });
  if (!doc) throw new ApiError(404, 'Version not found', 'NOT_FOUND');
  res.json({ success: true, data: doc });
});

const update = asyncHandler(async (req, res) => {
  await loadProject(req);
  const doc = await ApiVersion.findOne({ _id: req.params.versionId, project: req.params.id });
  if (!doc) throw new ApiError(404, 'Version not found', 'NOT_FOUND');
  const ALLOWED = ['version', 'description', 'isDefault', 'status'];
  for (const k of ALLOWED) {
    if (req.body[k] !== undefined) doc[k] = req.body[k];
  }
  if (req.body.isDefault) await ApiVersion.updateMany({ project: doc.project, _id: { $ne: doc._id } }, { $set: { isDefault: false } });
  await doc.save();
  res.json({ success: true, data: doc });
});

const remove = asyncHandler(async (req, res) => {
  await loadProject(req);
  const doc = await ApiVersion.findOne({ _id: req.params.versionId, project: req.params.id });
  if (!doc) throw new ApiError(404, 'Version not found', 'NOT_FOUND');
  const ApiEndpoint = require('../models/ApiEndpoint');
  await ApiEndpoint.deleteMany({ project: req.params.id, $or: [{ versionId: doc._id }, { version: doc.version }] });
  await doc.deleteOne();
  res.json({ success: true, data: { message: 'Version deleted' } });
});

const deprecate = asyncHandler(async (req, res) => {
  await loadProject(req);
  const doc = await ApiVersion.findOne({ _id: req.params.versionId, project: req.params.id });
  if (!doc) throw new ApiError(404, 'Version not found', 'NOT_FOUND');
  doc.status = 'deprecated';
  await doc.save();
  res.json({ success: true, data: doc });
});

module.exports = { list, create, getOne, update, remove, deprecate };
