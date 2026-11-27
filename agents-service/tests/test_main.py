import hashlib
import hmac
import json
from unittest.mock import Mock, patch

import pytest
from fastapi.testclient import TestClient

from app import main
from app.core import LLMConfiguration, LLMWrapper


def test_callback_signature_uses_shared_sha256_secret(monkeypatch):
    monkeypatch.setattr(main, "CALLBACK_SECRET", "test-callback-secret")
    body = json.dumps(
        main.normalize_callback_json({"job_id": "job-1", "score": 1.0}),
        separators=(",", ":"),
    ).encode()

    signature = main.callback_signature(body)
    expected = hmac.new(b"test-callback-secret", body, hashlib.sha256).hexdigest()

    assert signature == f"sha256={expected}"
    assert body == b'{"job_id":"job-1","score":1}'


def test_callback_headers_do_not_duplicate_sha256_prefix(monkeypatch):
    monkeypatch.setattr(main, "CALLBACK_SECRET", "test-callback-secret")
    body = b'{"job_id":"job-1","status":"completed"}'

    headers = main.callback_headers(body)

    assert headers["X-Signature"].startswith("sha256=")
    assert not headers["X-Signature"].startswith("sha256=sha256=")


def test_health_route_is_public():
    response = TestClient(main.app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_generation_routes_require_service_key(monkeypatch):
    monkeypatch.setattr(main, "X_SERVICE_KEY", "expected-service-key")

    response = TestClient(main.app).post("/v1/chat", json={"message": "hello"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"


def test_openai_compatible_provider_uses_configured_model_and_key():
    response = Mock()
    response.json.return_value = {"choices": [{"message": {"content": "ready"}}]}
    config = LLMConfiguration(
        provider="openai",
        api_key="private-test-key",
        model="gpt-test",
    )

    with patch("app.core.httpx.post", return_value=response) as post:
        result = LLMWrapper(config).models["tutor"]("hello")

    assert result == "ready"
    response.raise_for_status.assert_called_once()
    assert post.call_args.kwargs["headers"] == {
        "Authorization": "Bearer private-test-key",
    }
    assert post.call_args.kwargs["json"]["model"] == "gpt-test"


def test_groq_provider_uses_groq_openai_compatible_endpoint():
    response = Mock()
    response.json.return_value = {"choices": [{"message": {"content": "ready"}}]}
    config = LLMConfiguration(
        provider="groq",
        api_key="private-test-key",
        model="llama-3.3-70b-versatile",
    )

    with patch("app.core.httpx.post", return_value=response) as post:
        result = LLMWrapper(config).models["tutor"]("hello")

    assert result == "ready"
    response.raise_for_status.assert_called_once()
    assert post.call_args.args[0] == (
        "https://api.groq.com/openai/v1/chat/completions"
    )
    assert post.call_args.kwargs["headers"] == {
        "Authorization": "Bearer private-test-key",
    }
    assert post.call_args.kwargs["json"]["model"] == "llama-3.3-70b-versatile"


def test_gemini_provider_uses_google_api_key_header():
    response = Mock()
    response.json.return_value = {
        "candidates": [{"content": {"parts": [{"text": "ready"}]}}],
    }
    config = LLMConfiguration(
        provider="gemini",
        api_key="private-test-key",
        model="gemini-test",
    )

    with patch("app.core.httpx.post", return_value=response) as post:
        result = LLMWrapper(config).models["tutor"]("hello")

    assert result == "ready"
    assert post.call_args.kwargs["headers"] == {"x-goog-api-key": "private-test-key"}
    assert post.call_args.args[0].endswith("/gemini-test:generateContent")


def test_local_provider_supports_openai_compatible_endpoints_without_a_key():
    response = Mock()
    response.json.return_value = {"choices": [{"message": {"content": "ready"}}]}
    config = LLMConfiguration(
        provider="local",
        model="llama-test",
        base_url="http://host.docker.internal:11434/v1",
    )

    with patch("app.core.httpx.post", return_value=response) as post:
        result = LLMWrapper(config).models["tutor"]("hello")

    assert result == "ready"
    assert post.call_args.args[0] == "http://host.docker.internal:11434/v1/chat/completions"
    assert post.call_args.kwargs["headers"] == {}


def test_local_provider_accepts_custom_https_host_and_base_path(monkeypatch):
    monkeypatch.setattr(
        "app.core.socket.getaddrinfo",
        lambda *args, **kwargs: [(None, None, None, None, ("8.8.8.8", 443))],
    )
    config = LLMConfiguration(
        provider="local",
        model="custom-model",
        base_url="https://inference.example.com/custom/gateway/v1",
    )

    assert LLMWrapper(config)._openai_url() == (
        "https://inference.example.com/custom/gateway/v1/chat/completions"
    )


def test_local_provider_rejects_private_remote_dns_results(monkeypatch):
    monkeypatch.setattr(
        "app.core.socket.getaddrinfo",
        lambda *args, **kwargs: [(None, None, None, None, ("10.0.0.5", 443))],
    )
    config = LLMConfiguration(
        provider="local",
        model="custom-model",
        base_url="https://inference.example.com/v1",
    )

    with pytest.raises(RuntimeError, match="LLM_LOCAL_ALLOWED_HOSTS"):
        LLMWrapper(config)._openai_url()
