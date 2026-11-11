const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiProject', required: true, index: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    url: { type: String, required: true, trim: true },
    events: { type: [String], default: ['api.request'] },
    secret: { type: String, default: null },
    isActive: { type: Boolean, default: true },
    headers: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

webhookSchema.index({ project: 1, isActive: 1 });

module.exports = mongoose.model('Webhook', webhookSchema);
