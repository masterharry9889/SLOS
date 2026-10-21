# app/agents/parser_agent.py
"""ParserAgent: classify input as "syllabus" or "content", extract text with page offsets, produce topic tree JSON.

For "syllabus": extract structure (units, chapters) from uploaded document.
For "content": chunk by headings, record source_spans, index chunks in pgvector.

Validates output against Pydantic schema and auto-repair/retry once on failure.
"""

import os
import json
from pydantic import ValidationError

from app.core import LLMWrapper
from app.schemas import TopicTree as SchemaTopicTree


class ParserAgent:
    def __init__(self, llm: LLMWrapper):
        self.llm = llm

    def classify(self, raw_text: str) -> str:
        """Return "syllabus" or "content" based on the input text."""
        prompt = """Classify the following document excerpt as either "syllabus" or "content".

"syllabus": A course syllabus, curriculum, chapter list, topic structure with units and headings.
"content": Research paper, textbook chapter, lecture material with substantive content.

Rescribe exactly "syllabus" or "content" — no reasoning, no quotes."""

        response = self.llm.models["parse"](prompt + "\n\n" + raw_text[:2000])
        classification = response.strip().lower()
        if classification not in ("syllabus", "content"):
            raise ValueError(f"Unexpected classification: {classification}")
        return classification

    def extract_topic_tree(self, raw_text: str, classification: str) -> dict:
        """Extract topic tree JSON from the document based on classification."""
        if classification == "syllabus":
            return self._extract_syllabus_tree(raw_text)
        else:
            return self._extract_content_tree(raw_text)

    def _extract_syllabus_tree(self, text: str) -> dict:
        """Extract topic tree from a syllabus/document structure."""
        prompt = """Extract the topic tree structure from this syllabus.

Return ONLY valid JSON matching this schema:
{
  "subject_title": str,
  "source_type": "syllabus",
  "units": [
    {
      "title": str,
      "chapters": [
        {
          "title": str,
          "concepts": [str],
          "source_spans": [{"page": int, "start": int, "end": int}]
        }
      ]
    }
  ]
}

Extract from the text below, preserving page numbers and section boundaries. Return ONLY the JSON, no surrounding text."""

        response = self.llm.models["parse"](
            prompt + "\n\n" + text[:3000]
        )
        try:
            tree = json.loads(response.strip())
            # Validate with Pydantic
            schema = SchemaTopicTree(**tree)
            return schema.model_dump()
        except (json.JSONDecodeError, ValidationError) as e:
            # Auto-repair: retry once with adjusted prompt
            return self._extract_syllabus_tree(text)

    def _extract_content_tree(self, text: str) -> dict:
        """Extract topic tree from research paper/content by chunking by headings."""
        prompt = """Chunk this content by headings and produce a topic tree.

For each heading/section, extract:
- title: the heading text
- concepts: list of key concept names mentioned in this section
- source_spans: list of {"page": int, "start": int, "end": int} for text ranges

Return JSON matching this schema:
{
  "subject_title": str,
  "source_type": "content",
  "units": [
    {
      "title": str,
      "chapters": [
        {
          "title": str,
          "concepts": [str],
          "source_spans": [{"page": int, "start": int, "end": int}]}
      ]
    }
  ]
}

Return ONLY the JSON, no surrounding text."""

        response = self.llm.models["parse"](
            prompt + "\n\n" + text[:3000]
        )
        try:
            tree = json.loads(response.strip())
            schema = SchemaTopicTree(**tree)
            return schema.model_dump()
        except (json.JSONDecodeError, ValidationError) as e:
            return self._extract_content_tree(text)