# app/agents/paper_agent.py
"""PaperAgent: generate question paper + answer key from blueprint."""

import os
import json
import re

from app.core import LLMWrapper


class PaperAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm

    def generate(self, blueprint) -> dict:
        """Generate question paper from blueprint with marks validation."""
        prompt = (
            "Generate a question paper based on this blueprint.\n"
            "- chapters: " + str(blueprint.chapters) + "\n"
            "- total_marks: " + str(blueprint.total_marks) + "\n"
            "- duration_min: " + str(blueprint.duration_min) + "\n"
            "- difficulty_mix: " + str(blueprint.difficulty_mix) + "\n"
            "- question_types: " + str(blueprint.question_types) + "\n\n"
            "Generate questions matching this blueprint EXACTLY.\n\n"
            "Output JSON matching this schema:\n"
            "{\n"
            '  "sections": [str],  # e.g. ["Section A: MCQ", "Section B: Short Answer]\n'
            '  "questions": [\n'
            '    {\n'
            '      "id": str,  # e.g. "Q1", "Q2"\n'
            '      "type": str,  # e.g. "mcq", "short_answer", "long_answer"\n'
            '      "marks": int\n'
            '      "topic_id": str,  # references a topic from the topic tree\n'
            '      "difficulty": str,  # "easy", "medium", "hard"\n'
            '      "text": str\n'
            '      "options": dict,  # only for MCQ, e.g. {"A": "...", "B": "...", "C": "...", "D": "..."}\n'
            '    }\n'
            '  ],\n'
            '  "answer_key": dict,  # e.g. {"Q1": "A", "Q2": "C"}\n'
            '  "marking_scheme": dict  # e.g. {"Q1": 1, "Q2": 4}\n'
            "}\n\n"
            "Constraints:\n"
            "- Marks must sum EXACTLY to total_marks " + str(blueprint.total_marks) + "\n"
            "- Every chapter in " + str(blueprint.chapters) + " must be covered\n"
            "- Difficulty distribution should match: " + str(blueprint.difficulty_mix) + "\n"
            "- Question type counts must match: " + str(blueprint.question_types) + "\n\n"
            "Return ONLY the JSON, no surrounding analysis or quotes."
        )

        response = self.llm.models["paper"](
            prompt
        )

        try:
            result = json.loads(response.strip())
            # Validate marks sum
            total = sum(q.get("marks", 0) for q in result.get("questions", []))
            if total != blueprint.total_marks:
                return self._regenerate(prompt, "Marks sum " + str(total) + " != required " + str(blueprint.total_marks))
            return result
        except (json.JSONDecodeError,) as e:
            return self._regenerate(prompt, str(e))

    def _regenerate(self, prompt: str, error: str) -> dict:
        """Regenerate paper with error correction info."""
        err_prompt = prompt + (
            "\n\nERROR FROM PREVIOUS ATTEMPT: " + error +
            "\n\nEnsure marks sum exactly to total_marks and all chapters are covered. Return ONLY valid JSON."
        )

        try:
            response = self.llm.models["paper"](err_prompt)
            result = json.loads(response.strip())
            total = sum(q.get("marks", 0) for q in result.get("questions", []))
            if total != self._extract_total_marks(prompt):
                return self._regenerate(err_prompt, "Still marks sum " + str(total) + " != required")
            return result
        except Exception as e:
            return self._regenerate(err_prompt, "Failed to parse: " + str(e))

    def _extract_total_marks(self, prompt: str) -> int:
        """Extract total_marks from the original prompt."""
        m = re.search(r"total_marks: (\d+)", prompt)
        return int(m.group(1)) if m else 0

    def _validate_chapters(self, result: dict, required_chapters: list) -> None:
        """Validate that all required chapters are covered in the generated questions."""
        question_topics = [q.get("topic_id", "") for q in result.get("questions", [])]
        for chap in required_chapters:
            if chap not in question_topics:
                raise ValueError("Chapter '" + chap + "' not covered in generated questions")