from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import httpx
import hmac
import hashlib
import os
import json

app = FastAPI(title="Student Life OS - Agents Service")

X_SERVICE_KEY = os.getenv("X_SERVICE_KEY")

# Auth: reject without valid X-Service-Key (exempt /health and docs)
@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path in ["/health", "/docs", "/openapi.json"]:
        return await call_next(request)
    if X_SERVICE_KEY:
        key = request.headers.get("X-Service-Key")
        if not key or key != X_SERVICE_KEY:
            return JSONResponse(
                status_code=401,
                content={"error": {"code": "unauthorized", "message": "Missing or invalid X-Service-Key"}}
            )
    return await call_next(request)

# Health endpoint
@app.get("/health")
async def health():
    return {"status": "ok"}

# ---- Async job helper ----
def sign_callback(body: bytes) -> str:
    secret = (X_SERVICE_KEY or "dev-secret").encode()
    return hmac.new(secret, body, hashlib.sha256).hexdigest()

async def run_background_job(job_id: str, coro):
    """Run a coroutine in background and POST result to callback."""
    try:
        result = await coro
        body = json.dumps(result).encode()
        signature = sign_callback(body)
        async_post(callback_url, json={"job_id": job_id, "result": result}, headers={"X-Signature": signature})
    except Exception as e:
        body = json.dumps({"error": str(e)}).encode()
        signature = sign_callback(body)
        async_post(callback_url, json={"job_id": job_id, "error": str(e)}, headers={"X-Signature": signature})

# ---- Router: topic tree ingestion ----
class TopicTree(BaseModel):
    subject_title: str
    source_type: str  # "syllabus" | "content"
    units: list  # [{title, chapters: [{title, concepts: [str], source_spans: [{"page", "start", "end"}]}]}]

@app.post("/v1/ingest/parse")
async def parse_topic_tree(tree: TopicTree):
    """Accept a topic tree, validate schema, index chunks."""
    # TODO: implement chunking and pgvector indexing
    return {"status": "accepted", "subject": tree.subject_title, "units": len(tree.units)}

# ---- Router: notes generation ----
class NotesRequest(BaseModel):
    chapter_id: str
    subject_context: str
    mode: str  # "grounded" | "knowledge"
    depth: str  # "brief" | "standard" | "detailed"

@app.post("/v1/notes/generate")
async def generate_notes(req: NotesRequest):
    """Generate markdown notes for one chapter."""
    # TODO: implement NotesAgent with grounded/knowledge modes
    return {"status": "stub", "chapter": req.chapter_id}

# ---- Router: cheat sheet generation ----
class CheatSheetRequest(BaseModel):
    scope: str  # "chapter" | "unit" | "subject"
    format: str  # "one_page" | "formulas_only" | "last_minute"

@app.post("/v1/cheatsheets/generate")
async def generate_cheatsheet(req: CheatSheetRequest):
    """Generate cheat sheet for a scope."""
    return {"status": "stub", "scope": req.scope}

# ---- Router: question paper generation ----
class PaperBlueprint(BaseModel):
    chapters: list
    total_marks: int
    duration_min: int
    difficulty_mix: str  # "easy" | "medium" | "hard"
    question_types: dict  # {type: {"count": int, "marks": int}}
    past_paper_pattern: str = Field(default=None)

@app.post("/v1/papers/generate")
async def generate_paper(blueprint: PaperBlueprint):
    """Generate question paper + answer key from blueprint."""
    # TODO: implement PaperAgent with marks-sum validation
    return {"status": "stub", "chapters": len(blueprint.chapters)}

# ---- Router: assessment evaluation ----
class AssessmentRequest(BaseModel):
    attempt_id: str
    typed_answers: dict

@app.post("/v1/assessments/evaluate")
async def evaluate_assessment(req: AssessmentRequest):
    """Grade attempts / typed answers against a rubric."""
    return {"status": "stub", "attempt_id": req.attempt_id}

# ---- Router: chat streaming ----
@app.post("/v1/chat")
async def chat_stream():
    """Streaming doubt-solver grounded in student's notes."""
    return {"status": "stub"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)