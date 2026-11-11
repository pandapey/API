export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:5000/gateway';
export const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'http://localhost:5000/api-docs';

export const RANGES = [
  { value: 'today', label: 'Today' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'custom', label: 'Custom' },
];

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export const STATUS_COLORS = {
  success: '#22c55e',
  failed: '#ef4444',
  '2xx': '#22c55e',
  '4xx': '#f59e0b',
  '5xx': '#ef4444',
};
