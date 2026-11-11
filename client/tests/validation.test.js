import { describe, expect, it } from 'vitest';
import { loginSchema, registerSchema } from '../src/schemas/authSchema.js';
import { projectSchema } from '../src/schemas/projectSchema.js';
import { endpointSchema } from '../src/schemas/endpointSchema.js';
import { keySchema } from '../src/schemas/keySchema.js';
import { webhookSchema } from '../src/schemas/webhookSchema.js';

describe('auth schemas', () => {
  it('accepts valid login', () => {
    expect(() => loginSchema.parse({ email: 'a@b.com', password: 'secret12' })).not.toThrow();
  });
  it('rejects bad login', () => {
    expect(() => loginSchema.parse({ email: 'nope', password: 'x' })).toThrow();
  });
});

describe('key scopes', () => {
  it('accepts comma scopes', () => {
    expect(() => keySchema.parse({ name: 'kk', projectId: 'p', scopes: 'GET /hello, POST /orders' })).not.toThrow();
  });
});

describe('endpoint schema', () => {
  it('accepts GET /hello', () => {
    expect(() => endpointSchema.parse({ method: 'GET', path: '/hello' })).not.toThrow();
  });
});

describe('webhook schema', () => {
  it('events optional (checkbox UI)', () => {
    expect(() => webhookSchema.parse({ url: 'https://x.dev/h' })).not.toThrow();
  });
});

describe('project schema', () => {
  it('accepts valid project', () => {
    expect(() => projectSchema.parse({ name: 'My API', basePath: '/v1' })).not.toThrow();
  });
});
