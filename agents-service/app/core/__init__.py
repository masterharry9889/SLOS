# app/core/__init__.py
"""LLM wrapper with timeouts, retries, token/cost logging, and prompt versioning.
Prompts stored in app/prompts/*.md, NOT inline."""

import os

MODEL_PARSER = os.getenv("MODEL_PARSER", "anthropic-default")
MODEL_NOTES = os.getenv("MODEL_NOTES", "anthropic-default")
MODEL_ASSESS = os.getenv("MODEL_ASSESS", "anthropic-default")
MODEL_CHEATSHEET = os.getenv("MODEL_CHEATSHEET", "anthropic-default")
MODEL_PAPER = os.getenv("MODEL_PAPER", "anthropic-default")
MODEL_TUTOR = os.getenv("MODEL_TUTOR", "anthropic-default")

class LLMWrapper:
    def __init__(self):
        self.models = {
            "parse": MODEL_PARSER,
            "notes": MODEL_NOTES,
            "assess": MODEL_ASSESS,
            "cheatsheet": MODEL_CHEATSHEET,
            "paper": MODEL_PAPER,
            "tutor": MODEL_TUTOR,
        }