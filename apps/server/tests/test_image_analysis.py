import json
from urllib import error

import pytest

from app.errors import AppError
from app.services import image_analysis
from app.services.ai_settings import ResolvedAIProviderSettings


@pytest.fixture()
def configure_provider(monkeypatch):
    def _configure(
        *,
        provider: str,
        model_id: str | None,
        api_key: str | None = "test-key",
        provider_source: str = "stored",
        api_key_source: str | None = None,
        legacy_openai_base_url: str | None = None,
    ):
        resolved = ResolvedAIProviderSettings(
            provider=provider,
            model_id=model_id,
            api_key=api_key,
            provider_source=provider_source,
            api_key_source=api_key_source or ("stored" if api_key else None),
            updated_at=None,
            legacy_openai_base_url=legacy_openai_base_url,
        )
        monkeypatch.setattr(image_analysis, "resolve_ai_provider_settings", lambda: resolved)

    return _configure


class _FakeResponse:
    def __init__(self, payload: bytes):
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return self._payload


def _capture_request(captured: dict):
    def fake_urlopen(http_request, timeout=0):
        captured["url"] = http_request.full_url
        captured["headers"] = {key.lower(): value for key, value in http_request.header_items()}
        captured["body"] = json.loads(http_request.data.decode("utf-8"))
        return _FakeResponse(captured["response_bytes"])

    return fake_urlopen


def _analysis_payload(summary: str, tags: list[str]) -> dict[str, object]:
    return {
        "summary": summary,
        "summary_en": summary,
        "summary_zh": f"{summary} 的中文摘要。",
        "prompt_en": f"{summary} in English prompt form.",
        "prompt_zh": f"{summary} 的中文提示词版本。",
        "tags_en": tags,
        "tags_zh": [f"{tag}-zh" for tag in tags],
        "colors": ["#E8E8ED", "#8E8E93", "#1C1C1E"],
    }


def test_analyze_image_uses_openai_responses_api(monkeypatch, configure_provider):
    configure_provider(provider="openai", model_id="gpt-4.1-mini")
    captured = {
        "response_bytes": json.dumps(
            {
                "output_text": json.dumps(
                    _analysis_payload("Minimal living room scene.", ["interior", "minimal", "living room"])
                )
            }
        ).encode("utf-8")
    }
    monkeypatch.setattr(image_analysis.request, "urlopen", _capture_request(captured))

    analysis = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert captured["url"] == "https://api.openai.com/v1/responses"
    assert captured["headers"]["authorization"] == "Bearer test-key"
    assert captured["body"]["model"] == "gpt-4.1-mini"
    assert captured["body"]["text"]["format"]["type"] == "json_schema"
    assert captured["body"]["input"][0]["content"][1]["image_url"].startswith("data:image/png;base64,")
    assert analysis["summary"] == "Minimal living room scene."
    assert analysis["summary_zh"] == "Minimal living room scene. 的中文摘要。"
    assert analysis["tags_en"] == ["interior", "minimal", "living room"]
    assert analysis["prompt_zh"] == "Minimal living room scene. 的中文提示词版本。"


@pytest.mark.parametrize(
    ("legacy_openai_base_url", "expected_url"),
    [
        ("https://api.gptsapi.net/", "https://api.gptsapi.net/v1/responses"),
        ("https://api.gptsapi.net/v1", "https://api.gptsapi.net/v1/responses"),
    ],
)
def test_analyze_image_uses_legacy_openai_base_url_when_present(
    monkeypatch,
    configure_provider,
    legacy_openai_base_url: str,
    expected_url: str,
):
    configure_provider(
        provider="openai",
        model_id="gpt-4.1-mini",
        provider_source="legacy_env",
        api_key_source="legacy_env",
        legacy_openai_base_url=legacy_openai_base_url,
    )
    captured = {
        "response_bytes": json.dumps(
            {
                "output_text": json.dumps(
                    _analysis_payload("Minimal living room scene.", ["interior", "minimal", "living room"])
                )
            }
        ).encode("utf-8")
    }
    monkeypatch.setattr(image_analysis.request, "urlopen", _capture_request(captured))

    image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert captured["url"] == expected_url


def test_analyze_image_uses_anthropic_messages_api(monkeypatch, configure_provider):
    configure_provider(provider="anthropic", model_id="claude-3-5-haiku-latest")
    captured = {
        "response_bytes": json.dumps(
            {
                "content": [
                    {
                        "type": "tool_use",
                        "name": "inspiration_analysis",
                        "input": {
                            **_analysis_payload("Editorial monochrome fashion image.", ["editorial", "monochrome", "fashion"]),
                        },
                    }
                ]
            }
        ).encode("utf-8")
    }
    monkeypatch.setattr(image_analysis.request, "urlopen", _capture_request(captured))

    analysis = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/jpeg")

    assert captured["url"] == "https://api.anthropic.com/v1/messages"
    assert captured["headers"]["x-api-key"] == "test-key"
    assert captured["headers"]["anthropic-version"] == "2023-06-01"
    assert captured["body"]["model"] == "claude-3-5-haiku-latest"
    assert captured["body"]["tool_choice"] == {"type": "tool", "name": "inspiration_analysis"}
    assert captured["body"]["tools"][0]["input_schema"]["required"] == [
        "summary",
        "summary_en",
        "summary_zh",
        "prompt_en",
        "prompt_zh",
        "tags_en",
        "tags_zh",
        "colors",
    ]
    assert captured["body"]["messages"][0]["content"][0]["source"]["media_type"] == "image/jpeg"
    assert analysis["summary"] == "Editorial monochrome fashion image."
    assert analysis["tags_en"] == ["editorial", "monochrome", "fashion"]


def test_analyze_image_uses_google_generate_content(monkeypatch, configure_provider):
    configure_provider(provider="google", model_id="gemini-2.5-flash")
    captured = {
        "response_bytes": json.dumps(
            {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        _analysis_payload("Muted product hero image.", ["product", "muted", "hero"])
                                    )
                                }
                            ]
                        }
                    }
                ]
            }
        ).encode("utf-8")
    }
    monkeypatch.setattr(image_analysis.request, "urlopen", _capture_request(captured))

    analysis = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/webp")

    assert captured["url"] == "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
    assert captured["headers"]["x-goog-api-key"] == "test-key"
    assert captured["body"]["generationConfig"]["responseMimeType"] == "application/json"
    assert captured["body"]["generationConfig"]["responseJsonSchema"]["required"] == [
        "summary",
        "summary_en",
        "summary_zh",
        "prompt_en",
        "prompt_zh",
        "tags_en",
        "tags_zh",
        "colors",
    ]
    assert captured["body"]["contents"][0]["parts"][0]["inlineData"]["mimeType"] == "image/webp"
    assert analysis["summary"] == "Muted product hero image."
    assert analysis["tags_zh"] == ["product-zh", "muted-zh", "hero-zh"]


def test_analyze_image_uses_volcengine_chat_completions(monkeypatch, configure_provider):
    configure_provider(provider="volcengine", model_id="ep-20260331-vision")
    captured = {
        "response_bytes": json.dumps(
            {
                "choices": [
                    {
                        "message": {
                                "content": json.dumps(
                                    _analysis_payload("Warm editorial still life.", ["warm", "editorial", "still life"])
                                )
                            }
                        }
                ]
            }
        ).encode("utf-8")
    }
    monkeypatch.setattr(image_analysis.request, "urlopen", _capture_request(captured))

    analysis = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert captured["url"] == "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
    assert captured["headers"]["authorization"] == "Bearer test-key"
    assert captured["body"]["model"] == "ep-20260331-vision"
    assert captured["body"]["messages"][0]["content"][1]["image_url"]["url"].startswith("data:image/png;base64,")
    assert analysis["summary"] == "Warm editorial still life."
    assert analysis["colors"] == ["#E8E8ED", "#8E8E93", "#1C1C1E"]


def test_analyze_image_maps_timeout_to_app_error(monkeypatch, configure_provider):
    configure_provider(provider="openai", model_id="gpt-4.1-mini")

    def raise_timeout(*args, **kwargs):
        raise TimeoutError("timed out")

    monkeypatch.setattr(image_analysis.request, "urlopen", raise_timeout)

    with pytest.raises(AppError) as exc_info:
        image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert exc_info.value.status_code == 502
    assert exc_info.value.code == "AI_ANALYSIS_FAILED"
    assert exc_info.value.message == "AI provider request timed out"


def test_analyze_image_maps_transport_failure_to_app_error(monkeypatch, configure_provider):
    configure_provider(provider="openai", model_id="gpt-4.1-mini")

    def raise_transport_error(*args, **kwargs):
        raise error.URLError("connection reset")

    monkeypatch.setattr(image_analysis.request, "urlopen", raise_transport_error)

    with pytest.raises(AppError) as exc_info:
        image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert exc_info.value.status_code == 502
    assert exc_info.value.code == "AI_ANALYSIS_FAILED"
    assert exc_info.value.message == "AI provider request failed: connection reset"


def test_analyze_image_prefers_json_candidate_when_openai_output_contains_extra_text(monkeypatch, configure_provider):
    configure_provider(provider="openai", model_id="gpt-4.1-mini")
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
                                _analysis_payload("Soft neutral workspace photo.", ["workspace", "neutral", "soft"])
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

    analysis = image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert analysis["summary"] == "Soft neutral workspace photo."
    assert analysis["tags_en"] == ["workspace", "neutral", "soft"]


def test_analyze_image_rejects_ambiguous_multiple_openai_json_candidates(monkeypatch, configure_provider):
    configure_provider(provider="openai", model_id="gpt-4.1-mini")
    response_bytes = json.dumps(
        {
            "output": [
                {
                    "type": "message",
                    "content": [
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                _analysis_payload("First result.", ["one", "two", "three"])
                            ),
                        },
                        {
                            "type": "output_text",
                            "text": json.dumps(
                                _analysis_payload("Second result.", ["four", "five", "six"])
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


def test_analyze_image_requires_provider_settings(monkeypatch):
    monkeypatch.setattr(image_analysis, "resolve_ai_provider_settings", lambda: None)

    with pytest.raises(AppError) as exc_info:
        image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "AI_PROVIDER_NOT_CONFIGURED"


@pytest.mark.parametrize(
    ("provider", "model_id", "api_key"),
    [
        ("openai", "gpt-4.1-mini", None),
        ("volcengine", None, "test-key"),
    ],
)
def test_analyze_image_requires_complete_provider_settings(
    monkeypatch,
    provider: str,
    model_id: str | None,
    api_key: str | None,
):
    resolved = ResolvedAIProviderSettings(
        provider=provider,
        model_id=model_id,
        api_key=api_key,
        provider_source="stored",
        api_key_source="stored" if api_key else None,
        updated_at=None,
    )
    monkeypatch.setattr(image_analysis, "resolve_ai_provider_settings", lambda: resolved)

    with pytest.raises(AppError) as exc_info:
        image_analysis.analyze_image(payload=b"image-bytes", mime_type="image/png")

    assert exc_info.value.status_code == 503
    assert exc_info.value.code == "AI_PROVIDER_NOT_CONFIGURED"


def test_test_provider_connection_uses_openai(monkeypatch):
    captured = {"response_bytes": json.dumps({"output": []}).encode("utf-8")}
    monkeypatch.setattr(image_analysis.request, "urlopen", _capture_request(captured))

    message = image_analysis.test_provider_connection(
        provider="openai",
        model_id="gpt-4.1-mini",
        api_key="test-key",
    )

    assert message == "OpenAI connection successful"
    assert captured["url"] == "https://api.openai.com/v1/responses"
    assert captured["body"]["input"] == "Reply with OK"
