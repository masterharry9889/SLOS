import hashlib
import hmac
import json

from fastapi.testclient import TestClient

from app import main


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


def test_health_route_is_public():
    response = TestClient(main.app).get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_generation_routes_require_service_key(monkeypatch):
    monkeypatch.setattr(main, "X_SERVICE_KEY", "expected-service-key")

    response = TestClient(main.app).post("/v1/chat", json={"message": "hello"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "unauthorized"
