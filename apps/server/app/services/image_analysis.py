import base64
import json
import os
import socket
from urllib import error, request

from app.errors import AppError


def _error(status_code: int, code: str, message: str) -> AppError:
    return AppError(status_code=status_code, code=code, message=message)


def _require_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise _error(503, "AI_PROVIDER_NOT_CONFIGURED", "AI analysis provider is not configured")
    return value


def _normalize_result(payload: object) -> tuple[str, list[str]]:
    if not isinstance(payload, dict):
        raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned an invalid analysis payload")

    summary = str(payload.get("summary", "")).strip()
    raw_tags = payload.get("tags", [])

    if not summary or not isinstance(raw_tags, list):
        raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned an incomplete analysis payload")

    tags: list[str] = []
    for tag in raw_tags:
        normalized = str(tag).strip()
        if normalized and normalized not in tags:
            tags.append(normalized)

    if not tags:
        raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned an incomplete analysis payload")

    return summary, tags[:12]


def _provider_transport_message(exc: BaseException) -> str:
    if isinstance(exc, TimeoutError):
        return "AI provider request timed out"

    reason = getattr(exc, "reason", None)
    if isinstance(reason, TimeoutError):
        return "AI provider request timed out"
    if reason:
        return f"AI provider request failed: {reason}"

    return "AI provider request failed"


def analyze_image(*, payload: bytes, mime_type: str) -> tuple[str, list[str]]:
    provider = os.getenv("BOWER_AI_PROVIDER", "").strip().lower()
    if provider != "openai":
        raise _error(503, "AI_PROVIDER_NOT_CONFIGURED", "AI analysis provider is not configured")

    api_key = _require_env("BOWER_OPENAI_API_KEY")
    model = os.getenv("BOWER_OPENAI_MODEL", "gpt-4.1-mini").strip() or "gpt-4.1-mini"

    encoded = base64.b64encode(payload).decode("utf-8")
    request_body = {
        "model": model,
        "input": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "input_text",
                        "text": (
                            "Analyze this inspiration image for a design library. "
                            "Return JSON with keys summary and tags. "
                            "summary must be one concise sentence. "
                            "tags must be an array of 3 to 8 short style or subject labels."
                        ),
                    },
                    {"type": "input_image", "image_url": f"data:{mime_type};base64,{encoded}"},
                ],
            }
        ],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "inspiration_analysis",
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "summary": {"type": "string"},
                        "tags": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["summary", "tags"],
                },
            }
        },
    }

    http_request = request.Request(
        url="https://api.openai.com/v1/responses",
        data=json.dumps(request_body).encode("utf-8"),
        headers={
            "authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=60) as response:
            response_payload = json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        try:
            error_payload = json.loads(exc.read().decode("utf-8"))
            message = error_payload.get("error", {}).get("message") or "AI provider request failed"
        except Exception:
            message = "AI provider request failed"
        raise _error(502, "AI_ANALYSIS_FAILED", message) from exc
    except (error.URLError, TimeoutError, socket.timeout) as exc:
        raise _error(502, "AI_ANALYSIS_FAILED", _provider_transport_message(exc)) from exc

    output_text = response_payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        try:
            return _normalize_result(json.loads(output_text))
        except json.JSONDecodeError as exc:
            raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned invalid JSON output") from exc

    raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned no analysis output")
