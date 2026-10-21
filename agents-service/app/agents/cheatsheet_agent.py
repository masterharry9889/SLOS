# app/agents/cheatsheet_agent.py
"""CheatSheetAgent: compress notes for a scope into a dense sheet.

Formats: one_page, formulas_only, last_minute.
Output markdown designed for a 2-3 column print layout.
"""

import os
from app.core import LLMWrapper


class CheatSheetAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm

    def generate(self, notes: str, scope: str, format: str = "one_page") -> str:
        """Generate cheat sheet from notes for a given scope and format."""
        format_clause = {
            "one_page": "\nLAYOUT: one-page dense summary, suitable for printing",
            "formulas_only": "\nLAYOUT: formulas only, concise references",
            "last_minute": "\nLAYOUT: last-minute quick review, prioritized facts"
        }.get(format, "")

        prompt = f"""Compress the following study notes into a cheat sheet.

SCOPE: {scope}
FORMAT: {format}{format_clause}

Output markdown designed for 2-3 column print layout with:
- Most critical formulas and definitions
- Key concepts (bullet-formatted)
- Important examples (minimal)
- Quick-reference layout

Return ONLY the markdown cheat sheet, no surrounding analysis or quotes.
"""

        response = self.llm.models["cheatsheet"](
            prompt + "\n\nNOTES:\n" + notes[:3000]
        )

        return response.strip()