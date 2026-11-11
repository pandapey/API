const mongoose = require('mongoose');

const apiKeySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    keyHash: { type: String, required: true, unique: true, index: true },
    prefix: { type: String, required: true, index: true },
    last4: { type: String, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiProject', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scopes: { type: [String], default: [] },
    revoked: { type: Boolean, default: false, index: true },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    rateLimitPerMin: { type: Number, default: 60 },
    lastUsedAt: { type: Date, default: null },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

apiKeySchema.index({ project: 1, revoked: 1 });

module.exports = mongoose.model('ApiKey', apiKeySchema);
