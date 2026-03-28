from urllib import error

import pytest

from app.errors import AppError
from app.services import image_analysis


@pytest.fixture()
def configured_provider(monkeypatch):
    monkeypatch.setenv("BOWER_AI_PROVIDER", "openai")
    monkeypatch.setenv("BOWER_OPENAI_API_KEY", "test-key")


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
