# app/agents/tutor_agent.py
"""TutorAgent (chat): retrieves from student's notes/chunks, answers with citations, supports levels (simple | exam | advanced), streams tokens via SSE."""

import os
from app.core import LLMWrapper


class TutorAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm

    def answer(self, query: str, chapter_context: str, level: str = "simple") -> str:
        """Answer a student query using their notes with citations."""
        level_clause = {
            "simple": "\nLEVEL: simple — direct answers, no jargon",
            "exam": "\nLEVEL: exam — exam-focused, expect derivations and examples",
            "advanced": "\nLEVEL: advanced — deep theoretical exploration"
        }.get(level, "")

        prompt = (
            "Answer the student's question using the provided chapter context.\"
            "Cite page numbers for any factual claim from the notes.\n"
            level_clause + "\n\n"
            "CHAPTER CONTEXT:\n" + chapter_context + "\n\n"
            "STUDENT QUESTION: " + query + "\n\n"
            "Answer with: (1) direct answer, (2) supporting evidence with page citations, "
            "(3) if level=exam or advanced, include a short derivation/example.\n"
            "Return ONLY the answer, no surrounding analysis or quotes."
        )

        response = self.llm.models["tutor"](
            prompt
        )

        return response.strip()