const mongoose = require('mongoose');

const apiEndpointSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiProject', required: true, index: true },
    versionId: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiVersion', default: null },
    version: { type: String, default: 'v1' },
    method: {
      type: String,
      required: true,
      uppercase: true,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
      index: true,
    },
    path: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    authRequired: { type: Boolean, default: true },
    rateLimitPerMin: { type: Number, default: null },
    exampleResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    latencyMs: { type: Number, default: 40 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

apiEndpointSchema.index({ project: 1, method: 1, path: 1, version: 1 });

module.exports = mongoose.model('ApiEndpoint', apiEndpointSchema);
