# app/agents/notes_agent.py
"""NotesAgent: generate markdown notes for one chapter.

Input: chapter_id, subject_context, mode ("grounded" | "knowledge"), depth ("brief" | "standard" | "detailed").

Output markdown with: summary, key concepts, definitions, formulas (LaTeX), worked examples,
common mistakes, 5 self-check questions. Any claim not backed by source marked [unverified] in grounded mode.

VerifierAgent does a second pass: checks formulas, definitions, internal consistency.
NotesAgent output only returns after verifier passes (max 2 repair rounds).
"""

import os
import json
from pydantic import ValidationError

from app.core import LLMWrapper
from app.schemas import NotesRequest


class NotesAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm

    def generate(self, req: NotesRequest) -> str:
        """Generate markdown notes for one chapter."""
        mode_clause = ""
        if req.mode == "grounded":
            mode_clause = "\nMODE: grounded — retrieve from student's notes, cite page numbers, mark [unverified] any claim not source-backed"
        elif req.mode == "knowledge":
            mode_clause = "\nMODE: knowledge — use model's internal knowledge, no citations needed"

        depth_clause = ""
        if req.depth == "brief":
            depth_clause = "\nDEPTH: brief — concise summary only"
        elif req.depth == "standard":
            depth_clause = "\nDEPTH: standard — full notes"
        elif req.depth == "detailed":
            depth_clause = "\nDEPTH: detailed — extensive examples and edge cases"

        prompt = f"""Generate comprehensive study notes for a chapter.

CHAPTER CONTEXT: {req.subject_context}
CHAPTER ID: {req.chapter_id}{mode_clause}{depth_clause}

Output markdown with EXACTLY these sections:
1. summary (2-3 sentences)
2. key_concepts (bullet list)
3. definitions (LaTeX where applicable)
4. formulas (LaTeX, each on new line)
5. worked_examples (2-3 bullet-formatted examples)
6. common_mistakes (bullet list)
7. self_check_questions (numbered 1-5)

Return ONLY the markdown, no surrounding analysis or quotes.
"""

        response = self.llm.models["notes"](
            prompt
        )

        # Verify with VerifierAgent
        from app.agents.verifier_agent import VerifierAgent
        verifier = VerifierAgent(self.llm)
        verified = verifier.verify_notes(response)

        if not verified["passed"] and verified.get("repairs") < 2:
            # Repair and re-verify
            repaired = self._repair_notes(response, verified["issues"])
            verified = verifier.verify_notes(repaired)
            if not verified["passed"]:
                # Second repair attempt
                repaired2 = self._repair_notes(repaired, verified["issues"])
                return self._finalize_notes(self.llm.models["notes"](prompt + "\n\nPREVIOUS ISSUES: " + str(verified["issues"]) + "\n\nREPAIR ATTEMPT 2: " + repaired2))

        return self._finalize_notes(response)

    def _repair_notes(self, notes: str, issues: list) -> str:
        """Repair notes based verifier issues."""
        issue_str = "; ".join(issues)
        prompt = f"""Repair the following notes based on these issues:

ISSUES: {issue_str}

NOTES TO REPAIR:
{notes}

Return ONLY the repaired markdown with the same structure, no analysis."""
        return self.llm.models["notes"](prompt)

    def _finalize_notes(self, notes: str) -> str:
        """Finalize notes output."""
        return notes.strip()