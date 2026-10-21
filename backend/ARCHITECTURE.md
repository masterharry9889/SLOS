# Student Life OS — Backend Architecture Reference

## Tech Stack
Node.js 20 · TypeScript strict · Fastify 4 · Zod · Prisma (PostgreSQL) · BullMQ (Redis/IORedis) · AWS SDK v3 (S3/MinIO) · bcryptjs · jsonwebtoken · Puppeteer · marked · pino

## Project Layout
```
src/
├── config.ts              # Zod-validated env config
├── app.ts                 # Fastify app factory (plugins + routes)
├── server.ts              # Entry-point with graceful shutdown
├── lib/
│   ├── prisma.ts          # PrismaClient singleton
│   ├── redis.ts           # IORedis singleton
│   ├── errors.ts          # AppError + sub-classes
│   ├── storage.ts         # S3 presigned-URL helpers
│   ├── queue.ts           # BullMQ queue instances
│   ├── hmac.ts            # HMAC-SHA256 sign / verify
│   ├── agentsClient.ts    # HTTP client for agents-service
│   └── pdf.ts             # markdown → HTML → PDF (Puppeteer)
├── plugins/
│   ├── auth.ts            # JWT verify → request.user
│   ├── cors.ts
│   ├── swagger.ts
│   ├── rateLimit.ts
│   └── errorHandler.ts
├── modules/               # feature modules (routes + service + schemas)
│   ├── auth/
│   ├── subjects/
│   ├── documents/
│   ├── topics/
│   ├── notes/
│   ├── artifacts/
│   ├── quizzes/
│   ├── attempts/
│   ├── progress/
│   ├── jobs/
│   ├── chat/
│   ├── exports/
│   └── internal/          # agents callback
└── workers/
    └── jobWorker.ts
```

## Coding Conventions

### Imports — path alias
`@/` maps to `src/` via tsconfig paths + tsx.
```ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { config } from '@/config';
import { AppError } from '@/lib/errors';
```

### Error responses
All errors are returned as:
```json
{ "error": { "code": "NOT_FOUND", "message": "Subject not found" } }
```
Services throw `AppError(statusCode, code, message)`.  
The `errorHandler` plugin catches and formats them.

### Auth
`plugins/auth.ts` decorates `fastify.authenticate` (an onRequest hook).  
It reads the `Authorization: Bearer <jwt>` header, verifies the token,  
and sets `request.user = { id: string; email: string }`.

Module augmentation:
```ts
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: { id: string; email: string };
  }
}
```

### Module pattern
Each module has three files:
| File | Purpose |
|---|---|
| `schemas.ts` | Zod schemas + `z.infer` types |
| `service.ts` | Pure business logic; throws `AppError` |
| `routes.ts`  | Exports `async function(fastify)` that registers routes |

Route registration example:
```ts
export default async function subjectRoutes(fastify: FastifyInstance) {
  fastify.post('/', { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const body = CreateSubjectSchema.parse(req.body);
    const subject = await SubjectService.create(req.user.id, body);
    return reply.status(201).send(subject);
  });
}
```

### Pagination
Query: `{ page?: number (default 1), limit?: number (default 20, max 100) }`  
Response: `{ data: T[], meta: { page, limit, total, totalPages } }`

### Ownership
**Every** query for user-owned data MUST include `userId` in the `where` clause.  
If the resource isn't found, throw `AppError(404, 'NOT_FOUND', '...')`.

### IDs
All IDs are cuid strings (Prisma `@default(cuid())`).

---

## Topic Tree JSON
Returned by agents-service `POST /v1/ingest/parse`, stored on `Document.topicTree`, and used to seed `Topic` rows:
```json
{
  "subject_title": "Data Structures",
  "source_type": "syllabus",
  "units": [
    {
      "title": "Unit 1: Arrays & Linked Lists",
      "chapters": [
        {
          "title": "Arrays",
          "concepts": ["Static arrays", "Dynamic arrays", "Amortized analysis"],
          "source_spans": [{ "page": 1, "start": 0, "end": 120 }]
        }
      ]
    }
  ]
}
```
Mapping to Topic rows:
- Each unit → `Topic(level='unit', order=idx)`
- Each chapter → `Topic(level='chapter', parentId=unit.id, order=idx, sourceSpans=...)`
- Each concept → `Topic(level='concept', parentId=chapter.id, order=idx)`

---

## API Endpoints (all under /api/v1)

### Auth (public except /me and /account)
| Method | Path | Body / Query | Notes |
|---|---|---|---|
| POST | /auth/register | `{ email, password, name }` | Returns `{ user, accessToken }`, sets refresh cookie |
| POST | /auth/login | `{ email, password }` | Same response |
| POST | /auth/refresh | — (cookie) | Rotates refresh token |
| POST | /auth/logout | — (cookie) | Clears refresh token |
| GET  | /auth/me | — | Auth required |
| GET  | /auth/google | — | Redirects to Google |
| GET  | /auth/google/callback | `?code=` | Exchanges code, sets cookie, redirects to frontend |
| DELETE | /auth/account | — | Auth required. Deletes user + all S3 files |

### Subjects (auth required)
CRUD: `POST /`, `GET /`, `GET /:id`, `PATCH /:id`, `DELETE /:id`

### Documents (auth required)
| POST | /documents/upload-url | `{ fileName, fileSize, mimeType, subjectId }` | Returns `{ uploadUrl, fileKey }` |
| POST | /documents | `{ subjectId, fileName, fileKey, fileSize, mimeType, sourceType }` | Registers + enqueues parse job → `{ document, job }` |
| GET  | /documents/:id | | |

### Topics (auth required)
| GET  | /subjects/:subjectId/topics | | Full tree |
| PATCH | /topics/:id | `{ title?, order?, parentId?, status? }` | |
| DELETE | /topics/:id | | Cascades |
| POST | /subjects/:subjectId/topics/confirm | | Sets `confirmed=true` |

### Notes (auth required)
| POST | /topics/:chapterId/notes/generate | `{ depth?, mode? }` | Enqueues → `{ job }` |
| GET  | /topics/:chapterId/notes | | Latest note |
| GET  | /topics/:chapterId/notes/versions | | All versions |
| PATCH | /notes/:id | `{ content }` | Creates new version |

### Artifacts (auth required)
| POST | /artifacts/cheatsheet | `{ topicId?, subjectId?, scope }` | Enqueues → `{ job }` |
| POST | /artifacts/question-paper | `{ subjectId, blueprint }` | Enqueues → `{ job }` |
| GET  | /artifacts | `?subjectId=&type=` | Paginated |
| GET  | /artifacts/:id | | |
| GET  | /artifacts/:id/pdf | | Generate/cache PDF, return presigned URL |

### Quizzes (auth required)
| POST | /quizzes | `{ subjectId, topicIds, title? }` | Enqueues → `{ job }` |
| GET  | /quizzes | `?subjectId=` | Paginated |
| GET  | /quizzes/:id | | |

### Attempts (auth required)
| POST | /attempts | `{ quizId }` | Creates in_progress attempt |
| POST | /attempts/:id/submit | `{ answers }` | Enqueues grading → `{ attempt, job }` |
| GET  | /attempts/:id | | |
| GET  | /attempts | `?quizId=` | Paginated |

### Chat (auth required)
| POST | /chat | `{ message, subjectId?, topicId? }` | SSE stream proxied from agents-service |

### Progress (auth required)
| POST | /progress/events | `{ type, topicId?, durationMin?, metadata? }` | |
| GET  | /progress/dashboard | `?subjectId=` | Aggregated analytics |

Dashboard shape:
```json
{
  "completion": { "overall": 0.45, "bySubject": [{ "subjectId", "title", "percentage", "byUnit": [...] }] },
  "quizScoreTrend": [{ "date": "2026-10-10", "avgScore": 0.78 }],
  "weakTopics": [{ "topicId", "title", "accuracy": 0.35 }],
  "streak": { "current": 5, "longest": 12 },
  "studyMinutesPerDay": [{ "date": "2026-10-10", "minutes": 45 }],
  "examCountdown": [{ "subjectId", "title", "daysRemaining": 30 }]
}
```

### Jobs (auth required)
| GET | /jobs/:id | | Job status |
| GET | /jobs/:id/stream | | SSE status updates (subscribe Redis pub/sub `job:{id}`) |

### Internal (HMAC-verified, no user auth)
| POST | /internal/agents/callback | `{ job_id, status, result?, error? }` | Verify `X-Signature`, idempotent by job_id |

---

## Job Flow
1. Create `Job` row (status=`queued`), add to BullMQ queue
2. Worker picks up → update status=`processing`, call agents-service with `{ ..., job_id, callback_url }`
3. Agents-service finishes → POSTs result to `callback_url` with `X-Signature` (HMAC-SHA256 of raw body)
4. Internal callback endpoint verifies HMAC, persists results in one Prisma transaction, marks job `completed`
5. Publishes status event to Redis pub/sub → SSE subscribers get notified

## Config (src/config.ts)
Validate with Zod at startup: PORT, HOST, NODE_ENV, LOG_LEVEL, DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_ACCESS_EXPIRES_IN, JWT_REFRESH_EXPIRES_IN, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET, S3_FORCE_PATH_STYLE, AGENTS_SERVICE_URL, AGENTS_SERVICE_KEY, HMAC_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL, CORS_ORIGIN, CALLBACK_BASE_URL.

## Refresh Token
Hash refresh tokens with bcrypt before storing. Cookie: `httpOnly`, `secure` (prod), `sameSite: lax`, `path: /api/v1/auth`, maxAge 7 days.

## Rate Limiting
Default: 100 req/min keyed by user ID (or IP if unauthenticated).  
Generation endpoints: 10 req/min.

## S3 Keys
Format: `{userId}/{documentId}/{fileName}` for uploads.  
PDF artifacts: `{userId}/pdf/{artifactId}.pdf`.
