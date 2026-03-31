import base64
import json
import socket
from urllib import error, request

from app.errors import AppError
from app.services.ai_settings import resolve_ai_provider_settings

OPENAI_BASE_URL = "https://api.openai.com"
ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
GOOGLE_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
VOLCENGINE_CHAT_COMPLETIONS_URL = "https://ark.cn-beijing.volces.com/api/v3/chat/completions"
ANALYSIS_PROMPT = (
    "Analyze this inspiration image for a design library. "
    "Return JSON with keys summary and tags. "
    "summary must be one concise sentence. "
    "tags must be an array of 3 to 8 short style or subject labels."
)
CHAT_COMPLETION_PROMPT = f"{ANALYSIS_PROMPT} Reply with JSON only and no extra text."
ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "summary": {"type": "string"},
        "tags": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "tags"],
}


def _error(status_code: int, code: str, message: str) -> AppError:
    return AppError(status_code=status_code, code=code, message=message)


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


def _extract_output_text(response_payload: object) -> str:
    if not isinstance(response_payload, dict):
        return ""

    direct_output_text = response_payload.get("output_text")
    candidates: list[str] = []

    if isinstance(direct_output_text, str) and direct_output_text.strip():
        candidates.append(direct_output_text.strip())

    output_items = response_payload.get("output")
    if isinstance(output_items, list):
        for output_item in output_items:
            if not isinstance(output_item, dict):
                continue

            content_items = output_item.get("content")
            if not isinstance(content_items, list):
                continue

            for content_item in content_items:
                if not isinstance(content_item, dict):
                    continue

                content_type = str(content_item.get("type", "")).strip().lower()
                if content_type not in {"output_text", "text", ""}:
                    continue

                text_value = content_item.get("text")
                if isinstance(text_value, str) and text_value.strip():
                    candidates.append(text_value.strip())
                    continue

                if isinstance(text_value, dict):
                    nested_text = text_value.get("value") or text_value.get("text")
                    if isinstance(nested_text, str) and nested_text.strip():
                        candidates.append(nested_text.strip())

    json_candidates: list[tuple[str, str]] = []
    for candidate in candidates:
        try:
            parsed_candidate = json.loads(candidate)
        except json.JSONDecodeError:
            continue

        if isinstance(parsed_candidate, dict):
            canonical_candidate = json.dumps(parsed_candidate, sort_keys=True, separators=(",", ":"))
            json_candidates.append((candidate, canonical_candidate))

    unique_json_candidates: list[str] = []
    seen_canonical_candidates: set[str] = set()
    for original_candidate, canonical_candidate in json_candidates:
        if canonical_candidate in seen_canonical_candidates:
            continue
        seen_canonical_candidates.add(canonical_candidate)
        unique_json_candidates.append(original_candidate)

    if len(unique_json_candidates) == 1:
        return unique_json_candidates[0]
    if len(unique_json_candidates) > 1:
        raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned ambiguous analysis output")

    return candidates[0] if len(candidates) == 1 else ""


def _responses_url(base_url: str) -> str:
    normalized_base_url = base_url.rstrip("/")
    if normalized_base_url.endswith("/v1"):
        return f"{normalized_base_url}/responses"
    return f"{normalized_base_url}/v1/responses"


def _google_generate_content_url(model_id: str) -> str:
    normalized_model_id = model_id if model_id.startswith("models/") else f"models/{model_id}"
    return f"{GOOGLE_BASE_URL}/{normalized_model_id}:generateContent"


def _extract_chat_completion_text(response_payload: object) -> str:
    if not isinstance(response_payload, dict):
        return ""

    choices = response_payload.get("choices")
    if not isinstance(choices, list):
        return ""

    for choice in choices:
        if not isinstance(choice, dict):
            continue

        message = choice.get("message")
        if not isinstance(message, dict):
            continue

        content = message.get("content")
        if isinstance(content, str) and content.strip():
            return content.strip()

        if not isinstance(content, list):
            continue

        parts: list[str] = []
        for part in content:
            if not isinstance(part, dict):
                continue
            text_value = part.get("text")
            if isinstance(text_value, str) and text_value.strip():
                parts.append(text_value.strip())

        if parts:
            return "\n".join(parts)

    return ""


def _extract_google_output_text(response_payload: object) -> str:
    if not isinstance(response_payload, dict):
        return ""

    candidates = response_payload.get("candidates")
    if not isinstance(candidates, list):
        return ""

    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue

        content = candidate.get("content")
        if not isinstance(content, dict):
            continue

        parts = content.get("parts")
        if not isinstance(parts, list):
            continue

        text_parts: list[str] = []
        for part in parts:
            if not isinstance(part, dict):
                continue
            text_value = part.get("text")
            if isinstance(text_value, str) and text_value.strip():
                text_parts.append(text_value.strip())

        if text_parts:
            return "\n".join(text_parts)

    return ""


def _extract_anthropic_tool_input(response_payload: object) -> object:
    if not isinstance(response_payload, dict):
        return None

    content_items = response_payload.get("content")
    if not isinstance(content_items, list):
        return None

    for content_item in content_items:
        if not isinstance(content_item, dict):
            continue

        if str(content_item.get("type", "")).strip().lower() != "tool_use":
            continue

        return content_item.get("input")

    return None


def _extract_error_message(payload: object) -> str | None:
    if isinstance(payload, dict):
        error_value = payload.get("error")
        if isinstance(error_value, dict):
            for key in ("message", "detail", "msg"):
                value = error_value.get(key)
                if isinstance(value, str) and value.strip():
                    return value.strip()
        if isinstance(error_value, str) and error_value.strip():
            return error_value.strip()

        for key in ("message", "detail", "msg"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    if isinstance(payload, list):
        for item in payload:
            message = _extract_error_message(item)
            if message:
                return message

    return None


def _post_json(*, url: str, request_body: dict, headers: dict[str, str]) -> object:
    http_request = request.Request(
        url=url,
        data=json.dumps(request_body).encode("utf-8"),
        headers=headers,
        method="POST",
    )

    try:
        with request.urlopen(http_request, timeout=60) as response:
            return json.loads(response.read().decode("utf-8"))
    except error.HTTPError as exc:
        try:
            error_payload = json.loads(exc.read().decode("utf-8"))
            message = _extract_error_message(error_payload) or "AI provider request failed"
        except Exception:
            message = "AI provider request failed"
        raise _error(502, "AI_ANALYSIS_FAILED", message) from exc
    except (error.URLError, TimeoutError, socket.timeout) as exc:
        raise _error(502, "AI_ANALYSIS_FAILED", _provider_transport_message(exc)) from exc


def _analyze_with_openai(*, payload: bytes, mime_type: str, api_key: str, model_id: str, base_url: str) -> tuple[str, list[str]]:
    encoded = base64.b64encode(payload).decode("utf-8")
    response_payload = _post_json(
        url=_responses_url(base_url),
        request_body={
            "model": model_id,
            "input": [
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": ANALYSIS_PROMPT},
                        {"type": "input_image", "image_url": f"data:{mime_type};base64,{encoded}"},
                    ],
                }
            ],
            "text": {
                "format": {
                    "type": "json_schema",
                    "name": "inspiration_analysis",
                    "schema": ANALYSIS_SCHEMA,
                }
            },
        },
        headers={
            "authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
    )

    output_text = _extract_output_text(response_payload)
    if output_text:
        try:
            return _normalize_result(json.loads(output_text))
        except json.JSONDecodeError as exc:
            raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned invalid JSON output") from exc

    raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned no analysis output")


def _analyze_with_anthropic(*, payload: bytes, mime_type: str, api_key: str, model_id: str) -> tuple[str, list[str]]:
    encoded = base64.b64encode(payload).decode("utf-8")
    response_payload = _post_json(
        url=ANTHROPIC_MESSAGES_URL,
        request_body={
            "model": model_id,
            "max_tokens": 256,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": mime_type,
                                "data": encoded,
                            },
                        },
                        {"type": "text", "text": ANALYSIS_PROMPT},
                    ],
                }
            ],
            "tools": [
                {
                    "name": "inspiration_analysis",
                    "description": "Return the image analysis as structured JSON.",
                    "input_schema": ANALYSIS_SCHEMA,
                }
            ],
            "tool_choice": {"type": "tool", "name": "inspiration_analysis"},
        },
        headers={
            "content-type": "application/json",
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
        },
    )

    tool_input = _extract_anthropic_tool_input(response_payload)
    if tool_input is not None:
        return _normalize_result(tool_input)

    raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned no analysis output")


def _analyze_with_google(*, payload: bytes, mime_type: str, api_key: str, model_id: str) -> tuple[str, list[str]]:
    encoded = base64.b64encode(payload).decode("utf-8")
    response_payload = _post_json(
        url=_google_generate_content_url(model_id),
        request_body={
            "contents": [
                {
                    "role": "user",
                    "parts": [
                        {"inlineData": {"mimeType": mime_type, "data": encoded}},
                        {"text": ANALYSIS_PROMPT},
                    ],
                }
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "responseJsonSchema": ANALYSIS_SCHEMA,
            },
        },
        headers={
            "content-type": "application/json",
            "x-goog-api-key": api_key,
        },
    )

    output_text = _extract_google_output_text(response_payload)
    if output_text:
        try:
            return _normalize_result(json.loads(output_text))
        except json.JSONDecodeError as exc:
            raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned invalid JSON output") from exc

    raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned no analysis output")


def _analyze_with_volcengine(*, payload: bytes, mime_type: str, api_key: str, model_id: str) -> tuple[str, list[str]]:
    encoded = base64.b64encode(payload).decode("utf-8")
    response_payload = _post_json(
        url=VOLCENGINE_CHAT_COMPLETIONS_URL,
        request_body={
            "model": model_id,
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": CHAT_COMPLETION_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{mime_type};base64,{encoded}"},
                        },
                    ],
                }
            ],
        },
        headers={
            "authorization": f"Bearer {api_key}",
            "content-type": "application/json",
        },
    )

    output_text = _extract_chat_completion_text(response_payload)
    if output_text:
        try:
            return _normalize_result(json.loads(output_text))
        except json.JSONDecodeError as exc:
            raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned invalid JSON output") from exc

    raise _error(502, "AI_ANALYSIS_FAILED", "AI provider returned no analysis output")


def analyze_image(*, payload: bytes, mime_type: str) -> tuple[str, list[str]]:
    provider_settings = resolve_ai_provider_settings()
    if provider_settings is None or provider_settings.api_key is None or provider_settings.model_id is None:
        raise _error(503, "AI_PROVIDER_NOT_CONFIGURED", "AI analysis provider is not configured")

    if provider_settings.provider == "openai":
        return _analyze_with_openai(
            payload=payload,
            mime_type=mime_type,
            api_key=provider_settings.api_key,
            model_id=provider_settings.model_id,
            base_url=provider_settings.legacy_openai_base_url or OPENAI_BASE_URL,
        )

    if provider_settings.provider == "anthropic":
        return _analyze_with_anthropic(
            payload=payload,
            mime_type=mime_type,
            api_key=provider_settings.api_key,
            model_id=provider_settings.model_id,
        )

    if provider_settings.provider == "google":
        return _analyze_with_google(
            payload=payload,
            mime_type=mime_type,
            api_key=provider_settings.api_key,
            model_id=provider_settings.model_id,
        )

    if provider_settings.provider == "volcengine":
        return _analyze_with_volcengine(
            payload=payload,
            mime_type=mime_type,
            api_key=provider_settings.api_key,
            model_id=provider_settings.model_id,
        )

    raise _error(503, "AI_PROVIDER_NOT_CONFIGURED", "AI analysis provider is not configured")
