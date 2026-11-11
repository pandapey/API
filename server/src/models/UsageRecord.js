const mongoose = require('mongoose');

const usageRecordSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiProject', required: true, index: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    year: Number,
    month: Number,
    day: Number,
    hour: Number,
    totalRequests: { type: Number, default: 0 },
    successCount: { type: Number, default: 0 },
    errorCount: { type: Number, default: 0 },
    avgLatencyMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

usageRecordSchema.index({ project: 1, periodStart: 1 }, { unique: true });

module.exports = mongoose.model('UsageRecord', usageRecordSchema);
