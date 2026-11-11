export const API_URL = import.meta.env.VITE_API_URL || '/api';
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || '/gateway';
export const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://localhost:5000/api-docs';

export const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
];
