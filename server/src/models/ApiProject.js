const mongoose = require('mongoose');

const apiProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, trim: true },
    description: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft', index: true },
    basePath: { type: String, default: '' },
    upstreamUrl: { type: String, default: '', trim: true },
    rateLimitPerMin: { type: Number, default: 120 },
  },
  { timestamps: true }
);

apiProjectSchema.index({ owner: 1, name: 1 });

module.exports = mongoose.model('ApiProject', apiProjectSchema);
