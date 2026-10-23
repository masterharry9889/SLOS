# 🎓 Student Life OS (SLOS)

> **The Intelligent, AI-Powered Academic Operating System for Students**  
> Transform messy syllabi, lecture slides, and textbooks into structured learning journeys, revision cheat sheets, exam practice papers, and interactive AI tutoring.

---

## 📌 Overview

**Student Life OS (SLOS)** is a modern, full-stack academic copilot and learning workspace built for university and high school students. It bridges the gap between static course materials and active recall by automating the ingestion, organization, generation, and assessment of academic content.

### ✨ Key Features

- 📑 **Automated Syllabus & Document Ingestion**: Upload course syllabi or reading materials (PDF, DOCX) and automatically parse them into structured topic trees (Units &rarr; Chapters &rarr; Concepts) with exact source-span tracking.
- 📝 **Dual-Mode Study Notes Generator**: Generate structured revision notes grounded directly in your uploaded course materials or expanded with comprehensive AI knowledge across multiple depth levels (*brief*, *standard*, *detailed*).
- ⚡ **High-Yield Cheat Sheets & Formula Cards**: Instantly create targeted one-page cheat sheets, formula lists, or last-minute exam review sheets.
- 🎯 **Exam Paper & Blueprint Generator**: Generate mock exam papers and detailed answer keys with strict rubric and marks-sum validation tailored to specified difficulty mixes and topic weightings.
- 📊 **Intelligent Assessment & Grading**: Submit practice answers for automated grading against rubrics, with constructive diagnostic feedback and weak-point analysis.
- 💬 **Context-Aware Study Tutor**: Real-time SSE streaming chat tutor grounded in your personal course documents and notes.
- 📈 **Mastery & Analytics Dashboard**: Track learning streaks, daily study minutes, exam countdowns, quiz score trends, and concept-level mastery.
- 📄 **High-Fidelity PDF Export**: Render clean, print-ready PDF summaries and question papers via a headless browser engine.

---

## 🏗️ System Architecture

SLOS is designed as a distributed, decoupled multi-service system:

```mermaid
flowchart TD
    subgraph Client["Frontend (Next.js 16)"]
        UI["Web App (React 19 + Tailwind v4)"]
        Zustand["State Management (Zustand)"]
        ReactQuery["Server State (TanStack Query)"]
    end

    subgraph Core["Backend API (Fastify + Node 20)"]
        API["Fastify 4 REST & SSE API"]
        Auth["JWT & OAuth2 Auth"]
        Prisma["Prisma ORM"]
        Queue["BullMQ Queue Producer"]
        Worker["BullMQ Worker"]
        PDF["Puppeteer PDF Generator"]
    end

    subgraph Agents["Agents Microservice (FastAPI + Python 3.11)"]
        FastAPI["FastAPI App (/v1/*)"]
        ParserAgent["ParserAgent (Topic Tree)"]
        NotesAgent["NotesAgent & Verifier"]
        PaperAgent["PaperAgent (Blueprint Engine)"]
        TutorAgent["TutorAgent (Doubt Solver)"]
        RAG["pgvector Vector Search"]
    end

    subgraph Storage["Storage & Infrastructure"]
        PG[("PostgreSQL 16 + pgvector")]
        Redis[("Redis 7 (BullMQ & Cache)")]
        MinIO[("MinIO / S3 Object Storage")]
    end

    UI -->|REST / SSE| API
    API --> Prisma --> PG
    API --> Queue --> Redis
    Worker --> Redis
    Worker -->|Signed HTTP Request| FastAPI
    FastAPI -->|Async Background Tasks| ParserAgent & NotesAgent & PaperAgent & TutorAgent
    FastAPI -->|HMAC-SHA256 Signed Callback| API
    Agents -->|Embeddings & Retrieval| PG
    API -->|Presigned URLs / Uploads| MinIO
```

### 🧱 Tech Stack

| Component | Technologies |
|---|---|
| **Frontend** | [Next.js 16](https://nextjs.org/) (App Router), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/), [TypeScript](https://www.typescriptlang.org/), [Zustand](https://zustand-demo.pmnd.rs/), [TanStack Query v5](https://tanstack.com/query/latest), [KaTeX](https://katex.org/), [Lucide React](https://lucide.dev/), [MSW](https://mswjs.io/) |
| **Backend API** | [Node.js 20+](https://nodejs.org/), [Fastify 4](https://fastify.dev/), [Prisma ORM](https://www.prisma.io/), [BullMQ](https://bullmq.io/), [Redis](https://redis.io/), [Zod](https://zod.dev/), [Puppeteer](https://pptr.dev/), [AWS SDK v3](https://aws.amazon.com/sdk-for-javascript/) (S3/MinIO), [Vitest](https://vitest.dev/) |
| **Agents Service** | [Python 3.11](https://www.python.org/), [FastAPI](https://fastapi.tiangolo.com/), [Pydantic v2](https://docs.pydantic.dev/), [Anthropic Python SDK](https://github.com/anthropics/anthropic-sdk-python), [pgvector](https://github.com/pgvector/pgvector-python), [PyMuPDF](https://pymupdf.readthedocs.io/), [python-docx](https://python-docx.readthedocs.io/), [Tesseract OCR](https://github.com/tesseract-ocr/tesseract) |
| **Data & Infra** | [PostgreSQL 16](https://www.postgresql.org/), [Redis 7](https://redis.io/), [MinIO](https://min.io/) (S3-compatible Object Storage), [Docker Compose](https://docs.docker.com/compose/) |

---

## 📁 Repository Structure

```
SLOS/
├── .gitignore                     # Monorepo root gitignore
├── README.md                      # Project overview and run guide
├── backend/                       # Node.js / Fastify backend service
│   ├── docker-compose.yml         # Local Postgres, Redis, and MinIO services
│   ├── package.json               # Backend dependencies and scripts
│   ├── tsconfig.json              # TypeScript configuration
│   ├── ARCHITECTURE.md            # Detailed backend architectural documentation
│   ├── .env.example               # Backend environment variable template
│   ├── .gitignore                 # Backend-specific ignore rules
│   └── prisma/
│       └── schema.prisma          # Database schema (PostgreSQL)
├── agents-service/                # Python / FastAPI AI agents microservice
│   ├── app/
│   │   ├── main.py                # FastAPI entry point & routers
│   │   ├── agents/                # LLM agents (parser, notes, paper, tutor, etc.)
│   │   ├── core/                  # LLM wrappers, config, retries, and logging
│   │   ├── jobs/                  # Background worker & signed callbacks
│   │   ├── prompts/               # Prompt templates
│   │   ├── rag/                   # Chunking, vector indexing & semantic search
│   │   └── schemas/               # Pydantic v2 data models
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Agents service environment variable template
│   ├── .gitignore                 # Python-specific ignore rules
│   └── README.md                  # Agents service specification
└── frontend/                      # Next.js 16 frontend application
    ├── src/
    │   ├── app/                   # Next.js App Router (auth, dashboard, chat, subjects)
    │   ├── components/            # Reusable UI components & layouts
    │   ├── hooks/                 # Custom React hooks
    │   ├── lib/                   # API clients & utilities
    │   ├── mocks/                 # MSW mock handlers
    │   ├── store/                 # Zustand global stores
    │   └── types/                 # TypeScript interfaces and schemas
    ├── public/                    # Static assets & SVG icons
    ├── package.json               # Frontend dependencies and scripts
    ├── next.config.ts             # Next.js configuration
    └── .env.example               # Frontend environment template
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v20.x` or higher and `npm`
- **Python**: `3.11.x`
- **Docker & Docker Compose**: For local PostgreSQL, Redis, and MinIO instances
- **Anthropic API Key**: For Claude LLM generation

---

### Step 1: Clone the Repository

```bash
git clone https://github.com/masterharry9889/SLOS.git
cd SLOS
```

---

### Step 2: Spin Up Infrastructure (Postgres, Redis, MinIO)

Run the bundled Docker Compose stack inside `backend/`:

```bash
docker compose -f backend/docker-compose.yml up -d
```

This starts:
- **PostgreSQL 16** on `localhost:5432` (`slos` / `slos_dev_password`)
- **Redis 7** on `localhost:6379`
- **MinIO S3** on `localhost:9000` (API) and `localhost:9001` (Web Console: `minioadmin` / `minioadmin`)
- **MinIO Init**: Automatically creates the default bucket `slos-uploads`.

---

### Step 3: Configure Environment Variables

Create the `.env` configuration files for each service from their provided examples:

#### 1. Backend (`backend/.env`)
```bash
cp backend/.env.example backend/.env
```
Key defaults in `backend/.env`:
```env
PORT=3001
DATABASE_URL=postgresql://slos:slos_dev_password@localhost:5432/slos
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret-random-jwt-key-min-64-characters-long
AGENTS_SERVICE_URL=http://localhost:8000
AGENTS_SERVICE_KEY=change-me-agents-service-key
HMAC_SECRET=change-me-hmac-secret-at-least-32-chars
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=slos-uploads
```

#### 2. Agents Service (`agents-service/.env`)
```bash
cp agents-service/.env.example agents-service/.env
```
Key configurations in `agents-service/.env`:
```env
PORT=8000
X_SERVICE_KEY=change-me-agents-service-key
DATABASE_URL=postgresql://slos:slos_dev_password@localhost:5432/slos
ANTHROPIC_API_KEY=your-anthropic-api-key-here
```

#### 3. Frontend (`frontend/.env.local`)
```bash
cp frontend/.env.example frontend/.env.local
```
Configure your API target:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_ENABLE_MOCKS=false
```

---

### Step 4: Run the Backend Service

1. Navigate to `backend/` and install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Run Prisma migrations and generate the client:
   ```bash
   npm run db:push
   npm run db:generate
   ```

3. Start the API server in development mode:
   ```bash
   npm run dev
   ```
   *The Fastify API server will be available at [http://localhost:3001](http://localhost:3001).*

4. *(Optional / Recommended)* In a separate terminal, start the background worker:
   ```bash
   cd backend
   npm run worker
   ```

---

### Step 5: Run the Agents Service

1. Open a new terminal and navigate to `agents-service/`:
   ```bash
   cd agents-service
   ```

2. Create and activate a Python 3.11 virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the FastAPI service:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *Agents API will be available at [http://localhost:8000](http://localhost:8000) (Interactive Swagger Docs at [http://localhost:8000/docs](http://localhost:8000/docs)).*

---

### Step 6: Run the Frontend Application

1. Open a new terminal and navigate to `frontend/`:
   ```bash
   cd frontend
   npm install
   ```

2. Start the Next.js development server:
   ```bash
   npm run dev
   ```
   *Frontend will be running at [http://localhost:3000](http://localhost:3000).*

---

## 🔄 Core Asynchronous Job Flow

To maintain fast API response times when running long LLM operations (such as multi-page parsing or exam blueprint generation), SLOS uses an asynchronous job & signed callback pattern:

```mermaid
sequenceDiagram
    autonumber
    actor Student as User / Frontend
    participant Backend as Backend API (Fastify)
    participant Queue as BullMQ (Redis)
    participant Worker as Backend Worker
    participant Agents as Agents Service (FastAPI)

    Student->>Backend: POST /api/v1/documents (Upload Document)
    Backend->>Backend: Create Document & Job row (status='queued')
    Backend->>Queue: Push parse job
    Backend-->>Student: 202 Accepted { documentId, jobId }

    Queue->>Worker: Consume job
    Worker->>Agents: POST /v1/ingest/parse with callback_url & job_id
    Agents-->>Worker: 202 Accepted { status: "processing" }

    Note over Agents: LLM extracts Topic Tree<br/>Chunks & indexes vectors

    Agents->>Backend: POST /api/v1/internal/agents/callback<br/>Headers: X-Signature (HMAC-SHA256)<br/>Body: { job_id, status: "completed", result }
    Backend->>Backend: Verify HMAC signature
    Backend->>Backend: Persist Units, Chapters, Concepts in DB
    Backend->>Student: Push SSE update /job:{id}/stream
```

---

## 📡 API Overview (Backend `/api/v1`)

| Module | Method | Endpoint | Description |
|---|---|---|---|
| **Auth** | `POST` | `/auth/register` | Create account & receive JWT session |
| | `POST` | `/auth/login` | Email/password login |
| | `POST` | `/auth/refresh` | Rotate access token via HTTP-only cookie |
| | `GET` | `/auth/me` | Retrieve authenticated profile |
| **Subjects** | `GET` / `POST` | `/subjects` | List subjects / create new subject |
| | `GET` / `PATCH` / `DELETE` | `/subjects/:id` | Manage individual subject |
| **Documents** | `POST` | `/documents/upload-url` | Generate S3/MinIO presigned upload URL |
| | `POST` | `/documents` | Register uploaded file & trigger parse job |
| **Topics** | `GET` | `/subjects/:subjectId/topics`| Fetch hierarchical topic tree |
| | `POST` | `/subjects/:subjectId/topics/confirm` | Confirm parsed topic structure |
| **Notes** | `POST` | `/topics/:chapterId/notes/generate` | Request LLM notes generation |
| | `GET` | `/topics/:chapterId/notes` | Get latest markdown notes & versions |
| **Artifacts** | `POST` | `/artifacts/cheatsheet` | Trigger cheat sheet generation |
| | `POST` | `/artifacts/question-paper` | Trigger exam paper generation |
| | `GET` | `/artifacts/:id/pdf` | Generate & retrieve presigned PDF link |
| **Quizzes** | `POST` | `/quizzes` | Create practice quiz from topics |
| | `POST` | `/attempts/:id/submit` | Submit answers for automated grading |
| **Chat** | `POST` | `/chat` | SSE stream for real-time course tutor chat |
| **Progress** | `GET` | `/progress/dashboard` | Aggregated analytics & mastery statistics |

---

## 🧪 Testing

### Backend Unit & Integration Tests
```bash
cd backend
npm run test
```

### Agents Service Tests
```bash
cd agents-service
pytest
```

### Frontend Lint & E2E Tests
```bash
cd frontend
npm run lint
npx playwright test
```

---

## 🛡️ Security & Best Practices

- **Strict HMAC Signatures**: All background communication between `agents-service` and `backend` is verified via HMAC-SHA256 signatures (`X-Signature`), preventing unauthorized internal callbacks.
- **Tenant Isolation**: Every database query enforces ownership checks scoped to the authenticated user ID (`userId`).
- **Secure File Storage**: Documents are uploaded directly to MinIO/S3 using short-lived presigned URLs.
- **Credential Hygiene**: Sensitive secrets and API keys are managed through `.env` files and strictly excluded from Git tracking via `.gitignore`.

---

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
