"""Provider adapters used by the academic agents."""

import json
import ipaddress
import os
import socket
from collections.abc import Iterator
from typing import Literal
from urllib.parse import urlparse

import httpx
from anthropic import Anthropic
from pydantic import BaseModel, Field

MODEL_PARSER = os.getenv("MODEL_PARSER", "claude-3-5-sonnet-20241022")
MODEL_NOTES = os.getenv("MODEL_NOTES", "claude-3-5-sonnet-20241022")
MODEL_ASSESS = os.getenv("MODEL_ASSESS", "claude-3-5-sonnet-20241022")
MODEL_CHEATSHEET = os.getenv("MODEL_CHEATSHEET", "claude-3-5-sonnet-20241022")
MODEL_PAPER = os.getenv("MODEL_PAPER", "claude-3-5-sonnet-20241022")
MODEL_TUTOR = os.getenv("MODEL_TUTOR", "claude-3-5-sonnet-20241022")


class LLMConfiguration(BaseModel):
    provider: Literal["anthropic", "openai", "gemini", "grok", "groq", "local"]
    api_key: str = Field(default="", max_length=4_096)
    model: str = Field(min_length=1, max_length=200)
    base_url: str | None = Field(default=None, max_length=500)


class LLMWrapper:
    def __init__(self, configuration: LLMConfiguration | None = None):
        self.configuration = configuration
        self.provider = configuration.provider if configuration else "anthropic"
        self.api_key = (
            configuration.api_key if configuration else os.getenv("ANTHROPIC_API_KEY", "")
        )
        self.model = configuration.model if configuration else None
        self.client: Anthropic | None = None

        if self.provider == "anthropic":
            if not self.api_key:
                raise RuntimeError("An Anthropic API key is required to run generation agents")
            self.client = Anthropic(api_key=self.api_key, timeout=60.0, max_retries=2)

        models = {
            "parse": MODEL_PARSER,
            "notes": MODEL_NOTES,
            "assess": MODEL_ASSESS,
            "cheatsheet": MODEL_CHEATSHEET,
            "paper": MODEL_PAPER,
            "tutor": MODEL_TUTOR,
        }
        self.models = {
            name: self._model(self.model or model)
            for name, model in models.items()
        }

    def _openai_url(self) -> str:
        if self.provider in {"openai", "grok", "groq"}:
            base_url = {
                "openai": "https://api.openai.com/v1",
                "grok": "https://api.x.ai/v1",
                "groq": "https://api.groq.com/openai/v1",
            }[self.provider]
        else:
            base_url = self.configuration.base_url if self.configuration else None
        if not base_url:
            raise RuntimeError("A base URL is required for this LLM provider")
        parsed = urlparse(base_url)
        hostname = (parsed.hostname or "").lower().rstrip(".")
        if (
            parsed.scheme not in {"http", "https"}
            or not hostname
            or parsed.username
            or parsed.password
            or parsed.query
            or parsed.fragment
        ):
            raise RuntimeError("The LLM provider base URL is invalid")
        allowed_hosts = {
            "localhost",
            "host.docker.internal",
            *(
                host.strip().lower().rstrip(".")
                for host in os.getenv("LLM_LOCAL_ALLOWED_HOSTS", "").split(",")
                if host.strip()
            ),
        }
        try:
            is_loopback_ip = ipaddress.ip_address(hostname).is_loopback
        except ValueError:
            is_loopback_ip = False
        is_loopback = (
            hostname in allowed_hosts
            or hostname.endswith(".localhost")
            or is_loopback_ip
        )
        if not is_loopback:
            if parsed.scheme != "https":
                raise RuntimeError("Custom remote provider URLs must use HTTPS")
            try:
                addresses = {
                    item[4][0]
                    for item in socket.getaddrinfo(
                        hostname,
                        parsed.port or 443,
                        type=socket.SOCK_STREAM,
                    )
                }
            except OSError as error:
                raise RuntimeError("The LLM provider host could not be resolved") from error
            if not addresses or any(
                not ipaddress.ip_address(address).is_global for address in addresses
            ):
                raise RuntimeError(
                    "Private provider hosts must be added to LLM_LOCAL_ALLOWED_HOSTS"
                )
        path = parsed.path.rstrip("/")
        if not path.lower().endswith("/chat/completions"):
            path = f"{path}/chat/completions"
        return f"{parsed.scheme}://{parsed.netloc}{path}"

    def _complete(self, prompt: str, model: str) -> str:
        if self.provider == "anthropic":
            if not self.client:
                raise RuntimeError("Anthropic client is not configured")
            response = self.client.messages.create(
                model=model,
                max_tokens=4_096,
                messages=[{"role": "user", "content": prompt}],
            )
            text = [block.text for block in response.content if block.type == "text"]
            return "\n".join(text)

        if self.provider == "gemini":
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            response = httpx.post(
                url,
                headers={"x-goog-api-key": self.api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=60.0,
            )
            response.raise_for_status()
            payload = response.json()
            return "".join(
                part.get("text", "")
                for candidate in payload.get("candidates", [])
                for part in candidate.get("content", {}).get("parts", [])
            )

        response = httpx.post(
            self._openai_url(),
            headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
            json={
                "model": model,
                "max_tokens": 4_096,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60.0,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            return "".join(
                part.get("text", "") for part in content if isinstance(part, dict)
            )
        raise RuntimeError("The selected provider returned an unsupported response")

    def _model(self, model: str):
        def complete(prompt: str) -> str:
            return self._complete(prompt, model)

        return complete

    def stream(self, model: str, prompt: str) -> Iterator[str]:
        model = self.model or model
        if self.provider == "anthropic":
            if not self.client:
                raise RuntimeError("Anthropic client is not configured")
            with self.client.messages.stream(
                model=model,
                max_tokens=4_096,
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                yield from stream.text_stream
            return

        if self.provider == "gemini":
            url = (
                "https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:streamGenerateContent?alt=sse"
            )
            with httpx.stream(
                "POST",
                url,
                headers={"x-goog-api-key": self.api_key},
                json={"contents": [{"parts": [{"text": prompt}]}]},
                timeout=60.0,
            ) as response:
                response.raise_for_status()
                for line in response.iter_lines():
                    if not line.startswith("data:"):
                        continue
                    payload = json.loads(line[5:].strip())
                    for candidate in payload.get("candidates", []):
                        for part in candidate.get("content", {}).get("parts", []):
                            if part.get("text"):
                                yield part["text"]
            return

        with httpx.stream(
            "POST",
            self._openai_url(),
            headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
            json={
                "model": model,
                "max_tokens": 4_096,
                "stream": True,
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=60.0,
        ) as response:
            response.raise_for_status()
            for line in response.iter_lines():
                if not line.startswith("data:"):
                    continue
                data = line[5:].strip()
                if data == "[DONE]":
                    break
                payload = json.loads(data)
                for choice in payload.get("choices", []):
                    content = choice.get("delta", {}).get("content")
                    if isinstance(content, str) and content:
                        yield content
