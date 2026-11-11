const mongoose = require('mongoose');

const apiRequestLogSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiProject', required: true, index: true },
    apiKey: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiKey', default: null },
    keyPrefix: { type: String, default: null },
    endpoint: { type: String, default: '' },
    method: { type: String, required: true, index: true },
    path: { type: String, required: true },
    statusCode: { type: Number, required: true, index: true },
    responseTimeMs: { type: Number, required: true },
    ip: { type: String, default: '' },
    userAgent: { type: String, default: '' },
    errorMessage: { type: String, default: null },
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { timestamps: false }
);

apiRequestLogSchema.index({ project: 1, timestamp: -1 });
apiRequestLogSchema.index({ timestamp: -1 });
apiRequestLogSchema.index({ project: 1, statusCode: 1 });
apiRequestLogSchema.index({ project: 1, method: 1 });
apiRequestLogSchema.index({ project: 1, responseTimeMs: 1 });

module.exports = mongoose.model('ApiRequestLog', apiRequestLogSchema);
