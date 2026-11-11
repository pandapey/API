import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { formatMs, formatNumber, truncate } from '../src/utils/format.js';

describe('format utils (smoke)', () => {
  it('formats numbers', () => {
    expect(formatNumber(1500)).toBe('1.5k');
    expect(formatNumber(500)).toBe('500');
  });
  it('formats ms', () => {
    expect(formatMs(42)).toBe('42 ms');
    expect(formatMs(1500)).toContain('s');
  });
  it('truncates', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcde…');
  });
});

describe('route map smoke', () => {
  it('all core routes are defined', () => {
    const file = path.resolve(__dirname, '../src/routes/index.jsx');
    const text = fs.readFileSync(file, 'utf8');
    for (const p of ['/dashboard', '/projects', '/keys', '/logs', '/analytics', '/admin']) {
      expect(text).toContain(p);
    }
  });
  it('all page components exist', () => {
    const pages = [
      'Landing.jsx', 'Login.jsx', 'Register.jsx', 'Dashboard.jsx', 'Projects.jsx',
      'ProjectDetail.jsx', 'Endpoints.jsx', 'Keys.jsx', 'Logs.jsx', 'Webhooks.jsx',
      'Docs.jsx', 'Analytics.jsx', 'Profile.jsx', 'NotFound.jsx',
    ];
    for (const p of pages) {
      expect(fs.existsSync(path.resolve(__dirname, '../src/pages', p))).toBe(true);
    }
  });
});
