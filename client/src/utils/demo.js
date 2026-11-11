/**
 * Public demo account — intentionally public credentials for demonstration only.
 * Stored here so the login page can display + autofill them.
 * This is NOT a secret. Must remain a low-privilege "developer" account.
 * Render ONLY on the login page (see components/DemoLogin.jsx).
 */
export const DEMO_CREDENTIALS = {
  email: 'demo@devapihub.dev',
  password: 'DemoPass123!',
  label: 'Demo Access',
  hint: 'Explore dashboards, gateway, logs & analytics without signing up.',
};

export const DEMO_PERMISSIONS_NOTE =
  'Demo role: developer — can create projects, keys & webhooks. No admin access.';
