# app/agents/paper_agent.py
"""PaperAgent: generate question paper + answer key from blueprint.

Input: blueprint {chapters, total_marks, duration_min, difficulty_mix, question_types with counts and marks, optional past_paper_pattern}.
Output JSON: sections, questions (id, type, marks, topic_id, difficulty, text, options?), answer_key, marking_scheme.
Ensure marks sum exactly to total_marks and every selected chapter is covered.
Validate programmatically and regenerate on violation.
"""

import os
import json
import re

from pydantic import ValidationError

from app.core import LLMWrapper
from app.schemas import PaperBlueprint, PaperQuestion, PaperOutput


class PaperAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm

    def generate(self, blueprint: PaperBlueprint) -> dict:
        """Generate question paper from blueprint with marks validation."""
        prompt = """Generate a question paper based on this blueprint.

-chapters: """ + str(blueprint.chapters) + """
-total_marks: """ + str(blueprint.total_marks) + """
-duration_min: """ + str(blueprint.duration_min) + """
-difficulty_mix: """ + str(blueprint.difficulty_mix) + """
-question_types: """ + str(blueprint.question_types) + """

Generate questions matching this blueprint EXACTLY.

Output JSON matching this schema:

{
  "sections": [str],  # e.g. ["Section A: MCQ", "Section B: Short Answer"]
  "questions": [
    {
      "id": str,  # e.g. "Q1", "Q2"
      "type": str,  # e.g. "mcq", "short_answer", "long_answer"
      "marks": int
      "topic_id": str,  # references a topic from the topic tree
      "difficulty": str,  # "easy", "medium", "hard"
      "text": str
      "options": dict  # only for MCQ, e.g. {"A": "...", "B": "...", "C": "...", "D": "..."}
    }
  ],
  "answer_key": dict,  # e.g. {"Q1": "A", "Q2": "C"}
  "marking_scheme": dict  # e.g. {"Q1": 1, "Q2": 4}
}

Constraints:
-Marks must sum EXACTLY to total_marks """ + str(blueprint.total_marks) + """
-Every chapter in """ + str(blueprint.chapters) + """ must be covered
-Difficulty distribution should match: """ + str(blueprint.difficulty_mix) + """
-Question type counts must match: """ + str(blueprint.question_types) + """

Return ONLY the JSON, no surrounding analysis or quotes.

"""

        response = self.llm.models["paper"](
            prompt
        )

        try:
            result = json.loads(response.strip())
            # Validate marks sum
            total = sum(q.get("marks", 0) for q in result.get("questions", []))
            if total != blueprint.total_marks:
                return self._regenerate(prompt, "Marks sum " + str(total) + " != required " + str(blueprint.total_marks))
            # Validate chapters coverage
            self._validate_chapters(result, blueprint.chapters)
            return result
        except (json.JSONDecodeError, ValidationError) as e:
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
            self._validate_chapters(result, self._extract_chapters(prompt))
            return result
        except Exception as e:
            return self._regenerate(err_prompt, "Failed to parse: " + str(e))

    def _extract_total_marks(self, prompt: str) -> int:
        """Extract total_marks from the original prompt."""
        m = re.search(r"total_marks:\ *(\d+)", prompt)
        return int(m.group(1)) if m else 0

    def _extract_chapters(self, prompt: str) -> list:
        """Extract chapters list from the original prompt."""
        m = re.search(r"chapters:\ *(\[.*\])", prompt, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1))
            except:
                return []
        return []

    def _validate_chapters(self, result: dict, required_chapters: list) -> None:
        """Validate that all required chapters are covered in the generated questions."""
        question_topics = [q.get("topic_id", "") for q in result.get("questions", [])]
        for chap in required_chapters:
            if chap not in question_topics:
                raise ValueError("Chapter '" + chap + "' not covered in generated questions")
