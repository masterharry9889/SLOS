# app/api/routers.py
"""API routers for agents-service."""

import os
from fastapi import FastAPI

from app.agents.parser_agent import ParserAgent
from app.agents.notes_agent import NotesAgent
from app.agents.verifier_agent import VerifierAgent
from app.agents.cheatsheet_agent import CheatSheetAgent
from app.agents.paper_agent import PaperAgent
from app.agents.assessment_agent import AssessmentAgent
from app.agents.tutor_agent import TutorAgent

from app.schemas import (
    TopicTree,
    NotesRequest,
    CheatSheetRequest,
    PaperBlueprint,
    AssessmentRequest,
)
from app.core import LLMWrapper


def setup_routers(app: FastAPI):
    """Set up all API routers."""
    llm = LLMWrapper()

    parser_agent = ParserAgent(llm)
    notes_agent = NotesAgent(llm)
    verifier = VerifierAgent(llm)
    cheatsheet_agent = CheatSheetAgent(llm)
    paper_agent = PaperAgent(llm)
    assessment_agent = AssessmentAgent(llm)
    tutor_agent = TutorAgent(llm)

    # ---- /v1/ingest/parse ----
    @app.post("/v1/ingest/parse")
    async def parse_topic_tree(tree: TopicTree):
        """Accept a topic tree, validate schema, index chunks."""
        classification = parser_agent.classify(tree.subject_title + " " + str(tree.units))
        result = parser_agent.extract_topic_tree(tree.subject_title + " " + str(tree.units), classification)
        return result

    # ---- /v1/notes/generate ----
    @app.post("/v1/notes/generate")
    async def generate_notes(req: NotesRequest):
        """Generate markdown notes for one chapter."""
        notes = notes_agent.generate(req)
        return {"notes": notes}

    # ---- /v1/cheatsheets/generate ----
    @app.post("/v1/cheatsheets/generate")
    async def generate_cheatsheet(req: CheatSheetRequest):
        """Generate cheat sheet for a scope."""
        # First generate notes if not already available
        # In production, notes would come from the cache/db
        notes = "Sample notes for " + req.scope + " chapter content"
        cheatsheet = cheatsheet_agent.generate(notes, req.scope, req.format)
        return {"cheatsheet": cheatsheet}

    # ---- /v1/papers/generate ----
    @app.post("/v1/papers/generate")
    async def generate_paper(blueprint: PaperBlueprint):
        """Generate question paper + answer key from blueprint."""
        result = paper_agent.generate(blueprint)
        return result

    # ---- /v1/assessments/evaluate ----
    @app.post("/v1/assessments/evaluate")
    async def evaluate_assessment(req: AssessmentRequest):
        """Grade attempts / typed answers against a rubric."""
        # In production, would use stored rubric and attempt data
        result = assessment_agent.topic_weakness_stats([{"topic_id": "ch1", "missing_points": ["sample error"]}])
        return result

    # ---- /v1/chat ----
    @app.post("/v1/chat")
    async def chat_endpoint():
        """Streaming doubt-solver grounded in student's notes."""
        # In production, would retrieve relevant notes and stream
        return {"status": " streaming endpoint ready"}
