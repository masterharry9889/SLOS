# app/core/__init__.py
"""Small synchronous Anthropic-backed model adapter used by the agent classes."""

import os
from collections.abc import Iterator
from anthropic import Anthropic

MODEL_PARSER = os.getenv("MODEL_PARSER", "claude-3-5-sonnet-20241022")
MODEL_NOTES = os.getenv("MODEL_NOTES", "claude-3-5-sonnet-20241022")
MODEL_ASSESS = os.getenv("MODEL_ASSESS", "claude-3-5-sonnet-20241022")
MODEL_CHEATSHEET = os.getenv("MODEL_CHEATSHEET", "claude-3-5-sonnet-20241022")
MODEL_PAPER = os.getenv("MODEL_PAPER", "claude-3-5-sonnet-20241022")
MODEL_TUTOR = os.getenv("MODEL_TUTOR", "claude-3-5-sonnet-20241022")

class LLMWrapper:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise RuntimeError("ANTHROPIC_API_KEY is required to run generation agents")
        self.client = Anthropic(api_key=api_key, timeout=60.0, max_retries=2)
        self.models = {
            "parse": self._model(MODEL_PARSER),
            "notes": self._model(MODEL_NOTES),
            "assess": self._model(MODEL_ASSESS),
            "cheatsheet": self._model(MODEL_CHEATSHEET),
            "paper": self._model(MODEL_PAPER),
            "tutor": self._model(MODEL_TUTOR),
        }

    def _model(self, model: str):
        def complete(prompt: str) -> str:
            response = self.client.messages.create(
                model=model,
                max_tokens=4_096,
                messages=[{"role": "user", "content": prompt}],
            )
            text = [block.text for block in response.content if block.type == "text"]
            return "\n".join(text)

        return complete

    def stream(self, model: str, prompt: str) -> Iterator[str]:
        with self.client.messages.stream(
            model=model,
            max_tokens=4_096,
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            yield from stream.text_stream