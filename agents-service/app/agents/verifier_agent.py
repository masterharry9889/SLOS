# app/agents/verifier_agent.py
"""VerifierAgent: second pass over generated notes.

Checks: formulas, definitions, internal consistency.
Returns: list of issues and a corrected version.
NotesAgent output only returns after verifier passes (max 2 repair rounds).
"""

import os
import re
import json

from app.core import LLMWrapper


class VerifierAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm
        self.repair_count = 0

    def verify_notes(self, notes: str) -> dict:
        """Verify notes and return {passed, issues, repairs}.

Checks for:
- Formula consistency (LaTeX matching)
- Definition completeness
- Internal consistency (no contradictory statements)
- Section structure present
"""

        prompt = """You are a verifier for study notes. Check the following markdown notes for:

1. Formula correctness: Are all LaTeX formulas correct and properly formed?
2. Definition completeness: Are all key definitions present and complete?
3. Internal consistency: Are there any contradictory statements?
4. Section structure: Are all required sections present (summary, key_concepts, definitions, formulas, worked_examples, common_mistakes, self_check_questions)?

Return JSON with this schema:
{{
  "passed": bool,
  "issues": [str],  // list of specific issues found, empty if passed
  "repairs": int,  // current repair round (0, 1, or 2)
  "corrected_notes": str  // notes with fixes applied
}}

Be precise but concise. If everything is fine, passed=true and issues=[].
"""

        response = self.llm.models["notes"](
            prompt + "\n\nNOTES:\n" + notes
        )

        try:
            result = json.loads(response.strip())
            # Ensure required fields
            if "passed" not in result:
                result["passed"] = False
            if "issues" not in result:
                result["issues"] = []
            if "repairs" not in result:
                result["repairs"] = 0
            if "corrected_notes" not in result:
                result["corrected_notes"] = notes
            return result
        except json.JSONDecodeError:
            # If JSON parse fails, treat as failures
            return {
                "passed": False,
                "issues": ["Verification: could not parse verifier output"],
                "repairs": 0,
                "corrected_notes": notes
            }

    def check_formulas(self, notes: str) -> list:
        """Check LaTeX formulas in notes."""
        # Extract LaTeX formulas (between $$ or \$)
        formulas = re.findall(r'\\$(.*?)\$', notes)
        issues = []
        for i, formula in enumerate(formulas):
            # Basic check: ensure it doesn't have unmatched parens
            if formula.count("(") != formula.count(")"):
                issues.append(f"Formula {i+1} has unbalanced parentheses: {formula}")
        return issues

    def check_sections(self, notes: str) -> list:
        """Check required sections are present."""
        required = ["summary", "key_concepts", "definitions", "formulas", "worked_examples", "common_mistakes", "self_check_issues"]
        issues = []
        lower_notes = notes.lower()
        for section in required:
            if section not in lower_notes:
                issues.append(f"Missing section: {section}")
        return issues