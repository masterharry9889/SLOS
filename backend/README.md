# Student Life OS Backend

## Requirements

- Node.js 20+
- PostgreSQL
- Redis (used by the job-processing milestone)

## Local setup

```sh
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate:dev
npm run dev
```

Set `DATABASE_URL`, `REDIS_URL`, `BACKEND_URL`, `AGENTS_SERVICE_URL`, and a private
`JWT_SECRET` of at least 32 characters in `.env`. Configure `AGENTS_SERVICE_API_KEY`
and `JOB_CALLBACK_SECRET` for the worker-to-service callback handshake. Google sign-in
requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; configure the provider callback
URL to match `GOOGLE_CALLBACK_URL`.

Students can configure Anthropic, OpenAI, Gemini, xAI Grok, Groq, or a local
OpenAI-compatible model under Settings. `POST /api/v1/settings/llm/providers` verifies a minimal
generation request before saving a provider. Credentials are encrypted with
AES-256-GCM and are never included in settings responses or data exports. Set a stable,
random `LLM_CREDENTIALS_ENCRYPTION_KEY` of at least 32 characters in production; it is
required when `NODE_ENV=production`. If omitted in development, `JWT_SECRET` is used
as the encryption key source. Rotating the encryption key invalidates saved provider
credentials, which must then be entered again.

Local OpenAI-compatible endpoints accept HTTP(S) URLs with custom path prefixes.
Remote endpoints must use HTTPS and resolve to public addresses. If your local model
is on a private LAN address, add its exact hostname/IP to the comma-separated
`LLM_LOCAL_ALLOWED_HOSTS` setting in both `backend/.env` and `agents-service/.env`.
Loopback and Docker Desktop's `host.docker.internal` are allowed by default.

The API base path is `/api/v1`; the OpenAPI UI is available at `/docs` and its JSON
specification at `/docs/json`.

## Authentication

- `POST /api/v1/auth/register` and `POST /api/v1/auth/login` return a user and access token.
- `POST /api/v1/auth/refresh` rotates the opaque refresh token stored in an httpOnly cookie.
- `POST /api/v1/auth/logout` revokes the refresh token and clears its cookie.
- `GET /api/v1/auth/me` requires `Authorization: Bearer <access-token>`.
- `GET /api/v1/auth/google` begins Google OAuth; Google returns to the configured callback.

Provider settings:

- `POST /api/v1/settings/llm/providers` verifies, saves, and activates a provider.
- `PATCH /api/v1/settings/llm/active` switches to a previously verified provider.
- `DELETE /api/v1/settings/llm/providers/:providerId` removes a saved provider.
- `GET /api/v1/settings` returns provider/model metadata but never API keys.

Refresh tokens are random, high-entropy values. Only their SHA-256 digests are persisted.

## Subjects and documents

Subject CRUD endpoints are available under `/api/v1/subjects`. To upload a document:

1. Request `POST /api/v1/documents/upload-url` with `subjectId`, `fileName`,
   `fileSize`, and `mimeType`.
2. Upload the bytes to the returned `uploadUrl` using the matching `Content-Type`.
3. Register the upload with `POST /api/v1/documents`, including the returned `fileKey`
   and `sourceType` (`syllabus` or `content`).

Uploads are limited to 25 MB and PDF, DOCX, PNG, or JPEG. Registration verifies
the storage object size, content type, and file signature before creating the
document and queueing its parse job. Document downloads use short-lived presigned
URLs. Subject and document reads are scoped to the authenticated user.

## Job pipeline and callbacks

Long-running tasks are queued in Redis and processed by the BullMQ worker. The worker
sends the job to the agents service along with a `callback_url` and `job_id`. The
agents service then POSTs a signed callback payload to
`POST /api/v1/internal/agents/callback` using the `X-Signature` header. The callback
handler verifies the HMAC-SHA256 signature, persists the job result in one transaction,
and emits a job status event for SSE subscribers.

- `GET /api/v1/jobs/:id` returns the current job record.
- `GET /api/v1/jobs/:id/stream` streams status updates as server-sent events.

## Validation

```sh
npm test
npm run build
```
