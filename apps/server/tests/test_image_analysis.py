import json
from urllib import error

import pytest

from app.errors import AppError
from app.services import image_analysis


@pytest.fixture()
def configured_provider(monkeypatch):
    monkeypatch.setenv("BOWER_AI_PROVIDER", "openai")
    monkeypatch.setenv("BOWER_OPENAI_API_KEY", "test-key")


class _FakeResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return self._payload


def _analysis_response_bytes() -> bytes:
    return json.dumps(
        {
            "output_text": json.dumps(
                {
                    "summary": "Minimal living room scene.",
                    "tags": ["interior", "minimal", "living room"],
                }
            )
        }
    ).encode("utf-8")


def _analysis_response_bytes_from_output_content() -> bytes:
    return json.dumps(
        {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                {
                                    "summary": "Editorial monochrome fashion image.",
                                    "tags": ["editorial", "monochrome", "fashion"],
                                }
                            ),
                        }
                    ],
                }
            ]
        }
    ).encode("utf-8")


def test_analyze_image_uses_default_openai_base_url(monkeypatch, configured_provider):
    captured = {}

    def fake_urlopen(http_request, timeout=0):
        captured["url"] = http_request.full_url
        return _FakeResponse(_analysis_response_bytes())

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    summary, tags = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert captured["url"] == "https://api.openai.com/v1/responses"
    assert summary == "Minimal living room scene."
    assert tags == ["interior", "minimal", "living room"]


def test_analyze_image_uses_configured_openai_base_url_without_v1(monkeypatch, configured_provider):
    captured = {}
    monkeypatch.setenv("BOWER_OPENAI_BASE_URL", "https://api.gptsapi.net/")

    def fake_urlopen(http_request, timeout=0):
        captured["url"] = http_request.full_url
        return _FakeResponse(_analysis_response_bytes())

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert captured["url"] == "https://api.gptsapi.net/v1/responses"


def test_analyze_image_uses_configured_openai_base_url_with_v1(monkeypatch, configured_provider):
    captured = {}
    monkeypatch.setenv("BOWER_OPENAI_BASE_URL", "https://api.gptsapi.net/v1")

    def fake_urlopen(http_request, timeout=0):
        captured["url"] = http_request.full_url
        return _FakeResponse(_analysis_response_bytes())

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert captured["url"] == "https://api.gptsapi.net/v1/responses"


def test_analyze_image_maps_timeout_to_app_error(monkeypatch, configured_provider):
    def raise_timeout(*args, **kwargs):
        raise TimeoutError("timed out")

    monkeypatch.setattr(image_analysis.request, "urlopen", raise_timeout)

    with pytest.raises(AppError) as exc_info:
        image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert exc_info.value.status_code == 502
    assert exc_info.value.code == "AI_ANALYSIS_FAILED"
    assert exc_info.value.message == "AI provider request timed out"


def test_analyze_image_maps_transport_failure_to_app_error(monkeypatch, configured_provider):
    def raise_transport_error(*args, **kwargs):
        raise error.URLError("connection reset")

    monkeypatch.setattr(image_analysis.request, "urlopen", raise_transport_error)

    with pytest.raises(AppError) as exc_info:
        image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert exc_info.value.status_code == 502
    assert exc_info.value.code == "AI_ANALYSIS_FAILED"
    assert exc_info.value.message == "AI provider request failed: connection reset"


def test_analyze_image_reads_json_from_output_content(monkeypatch, configured_provider):
    def fake_urlopen(http_request, timeout=0):
        return _FakeResponse(_analysis_response_bytes_from_output_content())

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    summary, tags = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert summary == "Editorial monochrome fashion image."
    assert tags == ["editorial", "monochrome", "fashion"]


def test_analyze_image_prefers_json_candidate_when_output_contains_extra_text(monkeypatch, configured_provider):
    response_bytes = json.dumps(
        {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {"type": "output_text", "text": "Working on your request..."},
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                {
                                    "summary": "Soft neutral workspace photo.",
                                    "tags": ["workspace", "neutral", "soft"],
                                }
                            ),
                        },
                    ],
                }
            ]
        }
    ).encode("utf-8")

    def fake_urlopen(http_request, timeout=0):
        return _FakeResponse(response_bytes)

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    summary, tags = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert summary == "Soft neutral workspace photo."
    assert tags == ["workspace", "neutral", "soft"]


def test_analyze_image_prefers_nested_json_when_top_level_output_text_is_non_json(monkeypatch, configured_provider):
    response_bytes = json.dumps(
        {
            "output_text": "Working on your request...",
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                {
                                    "summary": "Muted product hero image.",
                                    "tags": ["product", "muted", "hero"],
                                }
                            ),
                        }
                    ],
                }
            ],
        }
    ).encode("utf-8")

    def fake_urlopen(http_request, timeout=0):
        return _FakeResponse(response_bytes)

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    summary, tags = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert summary == "Muted product hero image."
    assert tags == ["product", "muted", "hero"]


def test_analyze_image_rejects_ambiguous_multiple_json_candidates(monkeypatch, configured_provider):
    response_bytes = json.dumps(
        {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                {
                                    "summary": "First result.",
                                    "tags": ["one", "two", "three"],
                                }
                            ),
                        },
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                {
                                    "summary": "Second result.",
                                    "tags": ["four", "five", "six"],
                                }
                            ),
                        },
                    ],
                }
            ]
        }
    ).encode("utf-8")

    def fake_urlopen(http_request, timeout=0):
        return _FakeResponse(response_bytes)

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    with pytest.raises(AppError) as exc_info:
        image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert exc_info.value.status_code == 502
    assert exc_info.value.code == "AI_ANALYSIS_FAILED"
    assert exc_info.value.message == "AI provider returned ambiguous analysis output"


def test_analyze_image_prefers_valid_nested_json_over_invalid_braced_top_level_text(monkeypatch, configured_provider):
    response_bytes = json.dumps(
        {
            "output_text": "{not json}",
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                {
                                    "summary": "Warm editorial still life.",
                                    "tags": ["warm", "editorial", "still life"],
                                }
                            ),
                        }
                    ],
                }
            ],
        }
    ).encode("utf-8")

    def fake_urlopen(http_request, timeout=0):
        return _FakeResponse(response_bytes)

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    summary, tags = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert summary == "Warm editorial still life."
    assert tags == ["warm", "editorial", "still life"]


def test_analyze_image_accepts_same_json_in_output_text_and_nested_output(monkeypatch, configured_provider):
    analysis_json = json.dumps(
        {
            "summary": "Clean monochrome poster reference.",
            "tags": ["poster", "monochrome", "clean"],
        }
    )
    response_bytes = json.dumps(
        {
            "output_text": analysis_json,
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": analysis_json,
                        }
                    ],
                }
            ],
        }
    ).encode("utf-8")

    def fake_urlopen(http_request, timeout=0):
        return _FakeResponse(response_bytes)

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    summary, tags = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert summary == "Clean monochrome poster reference."
    assert tags == ["poster", "monochrome", "clean"]


def test_analyze_image_accepts_logically_identical_json_with_different_key_order(monkeypatch, configured_provider):
    response_bytes = json.dumps(
        {
            "output_text": '{"summary":"Quiet neutral product shot.","tags":["neutral","product","quiet"]}',
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": '{"tags":["neutral","product","quiet"],"summary":"Quiet neutral product shot."}',
                        }
                    ],
                }
            ],
        }
    ).encode("utf-8")

    def fake_urlopen(http_request, timeout=0):
        return _FakeResponse(response_bytes)

    monkeypatch.setattr(image_analysis.request, "urlopen", fake_urlopen)

    summary, tags = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert summary == "Quiet neutral product shot."
    assert tags == ["neutral", "product", "quiet"]
