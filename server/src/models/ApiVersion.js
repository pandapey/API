const mongoose = require('mongoose');

const apiVersionSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiProject', required: true, index: true },
    version: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'deprecated'], default: 'active', index: true },
    description: { type: String, default: '' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

apiVersionSchema.index({ project: 1, version: 1 }, { unique: true });

module.exports = mongoose.model('ApiVersion', apiVersionSchema);
