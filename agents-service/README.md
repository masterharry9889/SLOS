# Student Life OS — Agents Service

FastAPI service for document parsing, study-content generation, assessment grading,
and chat. Generation endpoints accept backend-only requests, return `202`, then
deliver signed results to the backend callback URL.

The service supports per-request Anthropic, OpenAI, Google Gemini, xAI Grok, Groq,
and OpenAI-compatible Local/Ollama provider configurations supplied only by the
authenticated backend. Requests without a user provider configuration use the
optional `ANTHROPIC_API_KEY` server fallback.

Local provider URLs support custom HTTP(S) paths. Remote endpoints must use HTTPS;
for a private LAN inference server, explicitly add its hostname/IP to
`LLM_LOCAL_ALLOWED_HOSTS` in both the backend and agents-service environments.

## Local setup

Requirements: Python 3.11+ and Tesseract OCR (for PNG/JPEG documents). An Anthropic
API key is only needed as the optional server-side fallback.

```sh
cp .env.example .env
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Set `X_SERVICE_KEY` to the same value as backend `AGENTS_SERVICE_API_KEY`, and
`JOB_CALLBACK_SECRET` to the same value as backend `JOB_CALLBACK_SECRET`. Provider
keys configured in Settings are passed by the backend to this service over its
authenticated internal connection; the frontend never calls the provider directly.

## Routes

- `GET /health`
- `POST /v1/ingest/parse`
- `POST /v1/notes/generate`
- `POST /v1/cheatsheets/generate`
- `POST /v1/papers/generate`
- `POST /v1/assessments/evaluate`
- `POST /v1/chat` (SSE)

All routes except health require `X-Service-Key`. The backend worker calls the five
generation routes with `job_id` and `callback_url`. The service signs compact JSON
callback bodies with HMAC-SHA256 and the shared callback secret, then retries failed
callback delivery with exponential backoff.

PDF, DOCX, PNG, and JPEG uploads are supported. PDF extraction uses PyMuPDF, DOCX
text is read from the document XML, and image OCR uses Tesseract via pytesseract.

## Environment

See `.env.example` for service keys, callback signing, optional Anthropic fallback
credentials, and model overrides. Do not commit populated `.env` files.
