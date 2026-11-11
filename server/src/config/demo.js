/**
 * Public demo account — intentionally public credentials for demonstration only.
 * This is NOT a secret. Never use real admin/production credentials here.
 * The demo account has role "developer" (no admin privileges).
 */
module.exports = {
  DEMO_CREDENTIALS: {
    name: 'Demo Developer',
    email: 'demo@devapihub.dev',
    password: 'DemoPass123!',
    role: 'developer',
  },
};
