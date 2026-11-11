# DevAPI Hub

A production-style **API management & API-as-a-service platform** (MERN). Developers create API projects, define versions + endpoints, issue hashed API keys (`dk_live_...`), call a live gateway, and monitor usage with logs, analytics, webhooks, rate limiting, caching, background jobs, and admin controls.

Built as a portfolio-quality MVP demonstrating advanced backend engineering + a polished React dashboard.

## Features

**Auth & accounts**
- Register / login / logout, JWT access (15m) + rotating refresh (7d, httpOnly cookie + DB)
- bcrypt password hashing, forgot / reset password, mock email verification architecture
- Protected routes, role-based authorization (`developer`, `admin`), session/device via RefreshToken collection

**API projects**
- CRUD projects (name, description, baseURL, logo URL, publish/unpublish)
- Versions (create with notes, delete, copy endpoints `v1→v2`, deprecate), endpoints (method, path, authRequired, description)
- Keys list shows project name; logs show latency (`responseTimeMs`) + project name

**API keys**
- `dk_live_<32hex>` — raw shown **once**, only SHA-256 hash stored (+ prefix/last4)
- Name, expiry, scopes (`GET /hello`, `POST /orders`, `*`, blank = all), revoke, rotate, delete
- Gateway enforces scopes → `403 INSUFFICIENT_SCOPE` on mismatch
- Middleware `requireApiKey`: header → hash → lookup → revoked/expiry/scopes → rate limit → log → continue

**Gateway**
- `ANY /gateway/:projectId/*?version=v1` — matches endpoint definitions, enforces auth, returns example/mock response, simulates latency
- Every call logs to `ApiRequestLog` and fires webhook events + Socket.IO updates

**Rate limiting**
- Redis-backed fixed-window (in-memory fallback so app runs without Redis)
- Levels: global, project, key, endpoint (queryable). 429 + `X-RateLimit-Limit/Remaining/Reset`
- Example: 10/min, 100/hour, 10k/month configurable via project/key settings

**Logs / analytics**
- Request logs: timestamp, project, key, endpoint, method, status, latency (`responseTimeMs`), IP, UA, error (no secrets)
- Viewer: project/status (`2xx/4xx/5xx`)/endpoint/from-to filters, clamped pagination, CSV export (`GET /logs/export`)
- Analytics via Mongo aggregation: total, accurate today (midnight) + calendar month, per-endpoint, error rate, avg + p95 + per-day latency, `activeKeys`, `rateLimited (429)`, `mostUsed`, status distribution, timeseries

**Webhooks + jobs**
- Events: `api.request`, `api.error` (+ `webhook.test`)
- HMAC SHA-256 signature (`X-Webhook-Signature`), background delivery with 3x backoff, delivery history
- BullMQ (fallback to inline if no Redis): webhook delivery, emails, usage aggregation, log cleanup (90d, scheduled)

**Caching / docs / realtime**
- Redis cache (fallback Map): project metadata, docs, rate counters; invalidated on writes
- Swagger/OpenAPI at `/api-docs` + in-app Docs page with Try-It (key + params → gateway)
- Socket.IO: `request:logged`, `analytics:update`

**Dashboards**
- Developer: total/today/month, success/failed, avg latency, active keys, rate-limit use, most-used endpoint, recent activity + premium gradient Recharts (area/donut/bars) with today/7d/30d/custom filter
- Admin: users (role/suspend/delete), projects, requests (paginated), errors, health (DB/Redis + metrics), audit trail, settings (global limits)

**Security**
Helmet, CORS, zod validation, mongo-sanitize, HTTP-only cookies, JWT validation, RBAC, key hashing, no stack traces in prod, env-only secrets.

## Tech stack

Frontend: React 18, Vite 5, Router 6, Tailwind 3, Axios, Hook Form + Zod, Recharts, Lucide, socket.io-client
Backend: Node 20, Express 4, Mongoose 8, JWT, bcryptjs, Socket.IO, ioredis, BullMQ, Winston, swagger-ui-express, Zod, Axios
Infra: MongoDB 7, Redis 7, Docker + Compose, Nginx (frontend prod)

## Architecture

```
browser (5173) ──REST /api/*──> express (5000) ──> MongoDB (27017)
       └─ gateway /gateway/* ──┘      ├─> Redis (6379) [+ in-memory fallback]
       └─ socket.io realtime <────────┘      └─> BullMQ queues (fallback inline)
```

Request flow (gateway): `x-api-key` → hash lookup → revoked/expiry/scope → rate-limit (Redis) → endpoint match → mock response → ApiRequestLog → UsageRecord agg → webhook jobs → socket emit.

## Folder structure

```
Developer API/
  docker-compose.yml
  package.json (install:all, dev, test:server, test:client)
  .env.example
  server/
    src/config/ (db, env, redis, swagger, logger)
    src/models/ (User, ApiProject, ApiVersion, ApiEndpoint, ApiKey, ApiRequestLog, Webhook, WebhookDelivery, UsageRecord, RefreshToken, Notification, SystemSetting)
    src/middleware/ (auth, apiKey, rateLimit, requestLogger, validate, cache, sanitize, errorHandler)
    src/validators/ (zod)
    src/controllers/ + src/routes/ (auth, projects, versions, endpoints, keys, logs, analytics, webhooks, admin, gateway, docs)
    src/services/ (analytics, webhook, usage)
    src/jobs/ (queues, workers, scheduler)
    src/app.js src/server.js
  client/
    src/services/ (axios + domain services)
    src/context/ (Auth, Theme, Toast) src/hooks/ src/schemas/ (zod) src/utils/
    src/components/ (Layout, Sidebar, Topbar, Card, StatCard, Table, Modal, Toast, Badge, ChartCard, ProtectedRoute, ApiKeyModal…)
    src/pages/ (Landing, Login, Register, Dashboard, Projects, ProjectDetail, Keys, Logs, Webhooks, Docs, Analytics, Profile, Admin*)
    src/routes/
```

## Environment variables

`server/.env` (see `server/.env.example`):
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/devapi-hub
JWT_ACCESS_SECRET=… JWT_REFRESH_SECRET=… JWT_ACCESS_EXPIRES=15m JWT_REFRESH_EXPIRES=7d
REDIS_URL=redis://localhost:6379
FRONTEND_URL=http://localhost:5173
GLOBAL_RATE_WINDOW_MS=60000 GLOBAL_RATE_MAX=300
```
`client/.env` (see `client/.env.example`):
```
VITE_API_URL=http://localhost:5000/api
VITE_GATEWAY_URL=http://localhost:5000/gateway
VITE_SOCKET_URL=http://localhost:5000
VITE_DOCS_URL=http://localhost:5000/api-docs
```

## Local installation

Prereqs: Node 20+, MongoDB (local or `docker run -d -p 27017:27017 mongo:7`), Redis optional (`docker run -d -p 6379:6379 redis:7-alpine` — app works without it via fallback).

```powershell
# 1) install
npm run install:all
# or: npm --prefix server install; npm --prefix client install

# 2) env
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env

# 3) run (two terminals)
npm run dev:server  # http://localhost:5000/health + /api-docs
npm run dev:client  # http://localhost:5173
```

Verify: open `http://localhost:5000/health`, `http://localhost:5000/api-docs`, register a new account, create project → version → endpoints → API key (copy once) → call `GET http://localhost:5000/gateway/<projectId>/users` with `x-api-key: dk_live_…` → see Logs + Dashboard update.

## Docker installation

```powershell
Copy-Item server/.env.example server/.env
# edit server/.env for compose (MONGO_URI=mongodb://mongodb:27017/devapi-hub, REDIS_URL=redis://redis:6379)
docker compose up --build
# backend http://localhost:5000, frontend http://localhost:8080
```

Services: `frontend` (nginx), `backend` (node), `mongodb`, `redis`.

## API documentation

Swagger UI: `http://localhost:5000/api-docs` (JSON at `/api-docs.json`). In-app Docs page embeds it + Try-It console.

Key endpoints:
- Auth: `POST /api/auth/register|login|refresh|logout`, `GET /api/auth/me`, `POST /api/auth/forgot|reset`
- Projects: `GET|POST /api/projects`, `GET|PUT|DELETE /api/projects/:id`, `POST /api/projects/:id/publish|unpublish`
- Versions: `GET|POST /api/projects/:id/versions`, `PUT|DELETE /api/projects/:id/versions/:vid`, `POST .../deprecate`
- Endpoints: `GET|POST /api/projects/:id/endpoints`, `PUT|DELETE /api/projects/:id/endpoints/:eid`
- Keys: `GET /api/keys`, `POST /api/projects/:id/keys` (returns raw once), `POST /api/keys/:id/revoke|rotate`, `DELETE /api/keys/:id`
- Logs: `GET /api/logs?projectId&status&method&search&page&limit&from&to`
- Analytics: `GET /api/analytics/overview|endpoints|status?projectId&range&from&to`
- Webhooks: `GET|POST /api/projects/:id/webhooks`, `GET /api/webhooks/:id/deliveries`, `POST /api/webhooks/:id/test`
- Gateway: `ANY /gateway/:projectId/*` (header `x-api-key`)
- Admin: `GET /api/admin/overview|users|projects|keys|requests|errors|health|settings`

Auth: `Authorization: Bearer <accessToken>` (+ refresh cookie auto-handled). Gateway: `x-api-key: dk_live_…`.

## Authentication / API key / rate limiting

- Passwords bcrypt (10 rounds), never returned. Access JWT 15m in memory/localStorage, refresh 7d httpOnly + DB rotation with reuse detection.
- API keys random 32 hex, `sha256` stored. Scopes checked per endpoint. Revoked/expired → 401. Rotation issues new raw + invalidates old.
- Rate limits: `rateLimit({windowMs, max, keyGenerator})` using `INCR + EXPIRE` in Redis (or Map). Headers always set; 429 `{success:false, errorCode:'RATE_LIMIT_EXCEEDED'}` + webhook `api.limit.reached`.

## Database schema overview

- `User {name, email(unique, lowercase), passwordHash, role: user|developer|admin, isVerified, verificationToken, resetToken, resetExpires, suspended}`
- `ApiProject {owner, name, slug(unique-ish), description, status: draft|published|archived, basePath, upstreamUrl, rateLimitPerMin=120}`
- `ApiVersion {project, version, status: active|deprecated, description, isDefault}`
- `ApiEndpoint {project, versionId, version, method, path, description, authRequired=true, rateLimitPerMin, exampleResponse, latencyMs, isActive}` index `(project, method, path)`
- `ApiKey {project, owner, name, keyHash(unique, indexed), prefix, last4, scopes[], revoked, revokedAt, expiresAt, rateLimitPerMin=60, lastUsedAt, usageCount}` — hash never leaves the server
- `ApiRequestLog {project, apiKey, keyPrefix, endpoint, method, path, statusCode, responseTimeMs, ip, userAgent, errorMessage, timestamp}` indexes on `project/statusCode/method/timestamp`
- `Webhook {project, owner, url, events[], secret, isActive, headers}` + `WebhookDelivery {webhook, project, event, payload, status: pending|success|failed, attempts, responseStatus, error, nextRetryAt}`
- `UsageRecord {project, periodStart, periodEnd, totalRequests, successCount, errorCount, avgLatencyMs}` + `RefreshToken {user, tokenHash(unique), jti, expiresAt, revoked}` + `Notification {user, email, type, subject, body, read}` + `SystemSetting {key(unique), value, updatedBy}`

Enforced admin settings (`SystemSetting`, 15s-cached): `maintenanceMode` (gateway 503s), `globalRateMax` (platform rate ceiling), `defaultProjectRateLimit`, `logRetentionDays` (daily cleanup), `allowRegistration` (signup kill-switch).

## Deployment

Backend is stateless (JWT + Mongo + Redis) — deploy to Render/Fly/Railway with `MONGO_URI` (Atlas), `REDIS_URL` (Upstash), `FRONTEND_URL`, secrets. Frontend `npm run build` → static to Vercel/Netlify/Nginx with `VITE_*` set. Compose file is prod-ready (nginx + node + mongo + redis).

## Screenshots (placeholders)

- `docs/screenshots-landing.png` — Landing
- `docs/screenshots-dashboard.png` — Developer dashboard + charts
- `docs/screenshots-logs.png` — Request logs
- `docs/screenshots-docs.png` — Swagger + Try-It
- `docs/screenshots-admin.png` — Admin overview/health

## Architectural decisions

- Redis/BullMQ optional with fallbacks → one-command local run, real infra in Docker/prod.
- Hashed keys, never logged; raw shown once via modal.
- Analytics in Mongo pipelines (not Node) for scale; p95 computed in aggregation.
- Gateway mocks responses from endpoint definitions so platform is usable without upstream APIs; swap `gatewayController` to proxy `targetUpstream` to go live.
- Consistent `{success, data|message+errorCode}` envelope + centralized handler.
