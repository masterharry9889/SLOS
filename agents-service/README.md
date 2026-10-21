# Student Life OS — agents-service

## Stack
- Python 3.11, FastAPI, Pydantic v2, uvicorn, httpx (async)
- Anthropic Python SDK for LLM calls
- Document parsing: pymupdf, python-docx, OCR fallback (pytesseract)
- Vector store: Postgres + pgvector (schema "rag"), swappable embeddings interface
- Tests: pytest

## App layout
- app/main.py — FastAPI entry point
- app/api/ — routers
- app/agents/ — one module per agent
- app/core/ — LLM client, config, retries, logging
- app/rag/ — chunking, embeddings, retrieval
- app/schemas/ — Pydantic models
- app/jobs/ — async runner + signed callbacks

## Auth
- Reject requests without a valid X-Service-Key header

## Async jobs
- Endpoints return 202 {job_id} immediately
- Run work in a background task
- POST the result to callback_url with X-Signature (HMAC-SHA256 of the body)
- Retry callbacks with exponential backoff

## Deliverables
- full code, requirements.txt, Dockerfile, .env.example, README (run locally + curl example for each endpoint)
- Tests for chunking, schema validation, marks-sum validation and callback signing

## Build order
1. core + config
2. ParserAgent
3. NotesAgent + Verifier
4. PaperAgent
5. CheatSheetAgent
6. AssessmentAgent
7. TutorAgent