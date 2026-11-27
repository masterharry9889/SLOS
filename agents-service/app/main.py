import asyncio
import hashlib
import hmac
import json
import os
import zipfile
from collections.abc import Callable, Iterator
from io import BytesIO
from typing import Any
from xml.etree import ElementTree

import httpx
from fastapi import BackgroundTasks, FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from app.agents.assessment_agent import AssessmentAgent
from app.agents.cheatsheet_agent import CheatSheetAgent
from app.agents.notes_agent import NotesAgent
from app.agents.paper_agent import PaperAgent
from app.agents.parser_agent import ParserAgent
from app.agents.tutor_agent import TutorAgent
from app.core import LLMConfiguration, LLMWrapper, MODEL_TUTOR
from app.schemas import NotesRequest, PaperBlueprint

app = FastAPI(title="Student Life OS - Agents Service")

X_SERVICE_KEY = os.getenv("X_SERVICE_KEY", "")
CALLBACK_SECRET = os.getenv("JOB_CALLBACK_SECRET", "")
MAX_DOCUMENT_BYTES = 25 * 1024 * 1024


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if request.url.path in {"/health", "/docs", "/openapi.json"}:
        return await call_next(request)
    if not X_SERVICE_KEY or not hmac.compare_digest(
        request.headers.get("X-Service-Key", ""), X_SERVICE_KEY
    ):
        return JSONResponse(
            status_code=401,
            content={"error": {"code": "unauthorized", "message": "Missing or invalid X-Service-Key"}},
        )
    return await call_next(request)


@app.get("/health")
async def health():
    return {"status": "ok"}


class JobRequest(BaseModel):
    job_id: str = Field(min_length=1)
    callback_url: str = Field(min_length=1)
    llm: LLMConfiguration | None = None


class ParseRequest(JobRequest):
    document_id: str
    document_url: str
    file_name: str
    subject_title: str
    source_type: str


class NotesJobRequest(JobRequest):
    chapter_id: str
    subject_context: str
    mode: str
    depth: str


class CheatSheetJobRequest(JobRequest):
    scope: str
    scope_title: str
    format: str
    notes: str


class PaperJobRequest(JobRequest):
    chapters: list[str]
    total_marks: int
    duration_min: int
    difficulty_mix: dict[str, int]
    question_types: list[dict[str, int | str]]
    past_paper_pattern: str | None = None


class AssessmentJobRequest(JobRequest):
    attempt_id: str
    questions: list[dict]
    typed_answers: dict[str, str]


def callback_signature(body: bytes) -> str:
    if not CALLBACK_SECRET:
        raise RuntimeError("JOB_CALLBACK_SECRET is required to sign agent callbacks")
    digest = hmac.new(CALLBACK_SECRET.encode("utf-8"), body, hashlib.sha256).hexdigest()
    return f"sha256={digest}"


def callback_headers(body: bytes) -> dict[str, str]:
    return {
        "Content-Type": "application/json",
        "X-Signature": callback_signature(body),
    }


async def post_callback(callback_url: str, payload: dict) -> None:
    body = json.dumps(
        normalize_callback_json(payload),
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    canonical_body = json.dumps(
        normalize_callback_json(payload),
        sort_keys=True,
        separators=(",", ":"),
        ensure_ascii=False,
    ).encode("utf-8")
    async with httpx.AsyncClient(timeout=20) as client:
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                response = await client.post(
                    callback_url,
                    content=body,
                    headers=callback_headers(canonical_body),
                )
                response.raise_for_status()
                return
            except (httpx.HTTPError, httpx.TimeoutException) as error:
                last_error = error
                if attempt < 2:
                    await asyncio.sleep(2**attempt)
        raise RuntimeError(f"Unable to deliver job callback after retries: {last_error}")


def normalize_callback_json(value: Any) -> Any:
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, list):
        return [normalize_callback_json(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_callback_json(item) for key, item in value.items()}
    return value


async def run_background_job(job_id: str, callback_url: str, operation: Callable[[], dict]) -> None:
    try:
        result = await asyncio.to_thread(operation)
        await post_callback(callback_url, {"job_id": job_id, "status": "completed", "result": result})
    except Exception as error:
        try:
            await post_callback(
                callback_url,
                {"job_id": job_id, "status": "failed", "error": str(error)[:1_000]},
            )
        except Exception:
            # The callback retry failure is logged by the application server; BullMQ can retry the request.
            import logging

            logging.getLogger("agents.callback").exception("Could not deliver failed-job callback", extra={"job_id": job_id})


async def extract_document_text(file_url: str, file_name: str) -> str:
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        async with client.stream("GET", file_url) as response:
            response.raise_for_status()
            body = bytearray()
            async for chunk in response.aiter_bytes():
                body.extend(chunk)
                if len(body) > MAX_DOCUMENT_BYTES:
                    raise ValueError("Document exceeds the 25 MB processing limit")

    extension = file_name.lower().rsplit(".", 1)[-1]
    if extension == "pdf":
        import fitz

        with fitz.open(stream=bytes(body), filetype="pdf") as pdf:
            pages = [f"[PAGE {index + 1}]\n{page.get_text()}" for index, page in enumerate(pdf)]
        text = "\n\n".join(pages)
    elif extension == "docx":
        with zipfile.ZipFile(BytesIO(body)) as archive:
            xml = ElementTree.fromstring(archive.read("word/document.xml"))
        text = "\n".join(
            "".join(node.text or "" for node in paragraph.iter() if node.tag.endswith("}t"))
            for paragraph in xml.iter()
            if paragraph.tag.endswith("}p")
        )
    elif extension in {"png", "jpg", "jpeg"}:
        from PIL import Image
        import pytesseract

        text = await asyncio.to_thread(
            pytesseract.image_to_string,
            Image.open(BytesIO(body)),
        )
    else:
        raise ValueError("Unsupported document format")

    if not text.strip():
        raise ValueError("No readable text was found in the uploaded document")
    return text


@app.post("/v1/ingest/parse", status_code=202)
async def parse_topic_tree(req: ParseRequest, background_tasks: BackgroundTasks):
    async def parse() -> dict:
        text = await extract_document_text(req.document_url, req.file_name)
        parser = ParserAgent(LLMWrapper(req.llm))
        tree = await asyncio.to_thread(parser.extract_topic_tree, text, req.source_type)
        tree["subject_title"] = req.subject_title
        tree["source_type"] = req.source_type
        return {"document_id": req.document_id, "topicTree": tree}

    async def finish_parse() -> None:
        try:
            result = await parse()
            await post_callback(req.callback_url, {"job_id": req.job_id, "status": "completed", "result": result})
        except Exception as error:
            try:
                await post_callback(
                    req.callback_url,
                    {"job_id": req.job_id, "status": "failed", "error": str(error)[:1_000]},
                )
            except Exception:
                import logging

                logging.getLogger("agents.callback").exception("Could not deliver parse callback", extra={"job_id": req.job_id})

    background_tasks.add_task(finish_parse)
    return {"job_id": req.job_id, "status": "accepted"}


@app.post("/v1/notes/generate", status_code=202)
async def generate_notes(req: NotesJobRequest, background_tasks: BackgroundTasks):
    def generate() -> dict:
        agent = NotesAgent(LLMWrapper(req.llm))
        notes = NotesRequest(
            chapter_id=req.chapter_id,
            subject_context=req.subject_context,
            mode="grounded" if req.mode == "grounded" else "knowledge",
            depth=req.depth,
        )
        return {"topic_id": req.chapter_id, "content": agent.generate(notes), "depth": req.depth, "mode": req.mode}

    background_tasks.add_task(run_background_job, req.job_id, req.callback_url, generate)
    return {"job_id": req.job_id, "status": "accepted"}


@app.post("/v1/cheatsheets/generate", status_code=202)
async def generate_cheatsheet(req: CheatSheetJobRequest, background_tasks: BackgroundTasks):
    def generate() -> dict:
        content = CheatSheetAgent(LLMWrapper(req.llm)).generate(req.notes, req.scope_title, req.format)
        return {
            "type": "cheatsheet",
            "scope": req.scope,
            "title": f"{req.scope_title} cheat sheet",
            "content": content,
            "metadata": {"format": req.format},
        }

    background_tasks.add_task(run_background_job, req.job_id, req.callback_url, generate)
    return {"job_id": req.job_id, "status": "accepted"}


@app.post("/v1/papers/generate", status_code=202)
async def generate_paper(req: PaperJobRequest, background_tasks: BackgroundTasks):
    def generate() -> dict:
        question_types = {
            item["type"]: {"count": item["count"], "marks": item["marks_each"]}
            for item in req.question_types
        }
        blueprint = PaperBlueprint(
            chapters=req.chapters,
            total_marks=req.total_marks,
            duration_min=req.duration_min,
            difficulty_mix=json.dumps(req.difficulty_mix),
            question_types=question_types,
            past_paper_pattern=req.past_paper_pattern,
        )
        result = PaperAgent(LLMWrapper(req.llm)).generate(blueprint)
        if result.get("error"):
            raise ValueError(str(result["error"]))
        return {
            "type": "question_paper",
            "scope": "subject",
            "title": "Generated question paper",
            "content": json.dumps(result, ensure_ascii=False, indent=2),
            "metadata": result,
        }

    background_tasks.add_task(run_background_job, req.job_id, req.callback_url, generate)
    return {"job_id": req.job_id, "status": "accepted"}


@app.post("/v1/assessments/evaluate", status_code=202)
async def evaluate_assessment(req: AssessmentJobRequest, background_tasks: BackgroundTasks):
    def evaluate() -> dict:
        agent = AssessmentAgent(LLMWrapper(req.llm))
        graded = []
        score = 0.0
        max_score = 0.0
        for question in req.questions:
            question_id = str(question.get("id", ""))
            answer = req.typed_answers.get(question_id, "")
            marks = float(question.get("marks", 1))
            max_score += marks
            if question.get("answer_key") is not None or question.get("correct_answer") is not None:
                key = str(question.get("answer_key", question.get("correct_answer", "")))
                result = agent.grade_mcq(question, answer, key)
                awarded = marks if result["is_correct"] else 0
            else:
                rubric = question.get("marking_scheme", {"max_score": marks, "expected_answer": question.get("answer", "")})
                result = agent.grade_written(question, answer, rubric)
                awarded = min(marks, max(0, float(result.get("score", 0))))
            score += awarded
            graded.append({
                "question_id": question_id,
                "topic_id": question.get("topic_id"),
                "score": awarded,
                "max_score": marks,
                "explanation": result.get("feedback", ""),
                "missing_points": result.get("missing_points", []),
            })
        return {"attempt_id": req.attempt_id, "score": score, "max_score": max_score, "feedback": graded}

    background_tasks.add_task(run_background_job, req.job_id, req.callback_url, evaluate)
    return {"job_id": req.job_id, "status": "accepted"}


class ChatRequest(BaseModel):
    subject_title: str
    subject_context: str = ""
    message: str
    level: str = "simple"
    agent_id: str = "tutor"
    llm: LLMConfiguration | None = None
    history: list[dict[str, str]] = Field(default_factory=list)


def chat_tokens(req: ChatRequest) -> Iterator[str]:
    level = req.level if req.level in {"simple", "exam", "advanced"} else "simple"
    persona = {
        "tutor": "Explain concepts clearly and ask helpful follow-up questions.",
        "notes": "Focus on organizing information into concise, structured study notes.",
        "cheatsheet": "Focus on concise key facts, formulas, and quick revision cues.",
        "paper": "Focus on exam-style questions and assessment strategy.",
        "assessment": "Focus on evaluating reasoning and correcting misunderstandings.",
        "verifier": "Focus on checking accuracy and identifying unsupported claims.",
    }.get(req.agent_id, "Explain concepts clearly and ask helpful follow-up questions.")
    context = req.subject_context.strip() or f"Subject: {req.subject_title}"
    history = "\n".join(f"{item['role']}: {item['content']}" for item in req.history[-20:])
    prompt = (
        f"You are a study assistant. {persona} Answer using the student's provided study notes as the primary source. "
        "If the notes do not contain the answer, say so. Do not invent page citations.\n"
        f"Response level: {level}.\n\nSTUDY NOTES:\n{context}\n\n"
        f"CONVERSATION:\n{history}\n\nSTUDENT QUESTION:\n{req.message}"
    )
    yield from LLMWrapper(req.llm).stream(MODEL_TUTOR, prompt)


@app.post("/v1/chat")
async def chat_stream(req: ChatRequest):
    def events():
        try:
            for token in chat_tokens(req):
                yield f"data: {json.dumps({'type': 'chat_token', 'token': token}, ensure_ascii=False)}\n\n"
            yield 'data: {"type":"chat_done"}\n\n'
        except Exception:
            yield 'data: {"type":"chat_error","error":"Chat generation failed"}\n\n'

    return StreamingResponse(events(), media_type="text/event-stream")
