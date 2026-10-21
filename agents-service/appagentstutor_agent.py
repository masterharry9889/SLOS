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
            "simple": "LEVEL: simple — direct answers, no jargon",
            "exam": "LEVEL: exam — exam-focused, expect derivations and examples",
            "advanced": "LEVEL: advanced — deep theoretical exploration"
        }.get(level, "")

        prompt = "Answer the student's question using the provided chapter context. "
        prompt += "Cite page numbers for any factual claim from the notes. "
        prompt += level_clause + "\n\n"
        prompt += "CHAPTER CONTEXT:\n" + chapter_context + "\n\n"
        prompt += "STUDENT QUESTION: " + query + "\n\n"
        prompt += "Answer with: (1) direct answer, (2) supporting evidence with page citations, "
        prompt += "3) if level=exam or advanced, include a short derivation/example.\n"
        prompt += "Return ONLY the answer, no surrounding analysis or quotes."

        response = self.llm.models["tutor"](
            prompt
        )

        return response.strip()
