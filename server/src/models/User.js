const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['user', 'developer', 'admin'], default: 'developer', index: true },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, default: null },
    resetToken: { type: String, default: null },
    resetExpires: { type: Date, default: null },
    suspended: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    isVerified: this.isVerified,
    suspended: this.suspended,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
