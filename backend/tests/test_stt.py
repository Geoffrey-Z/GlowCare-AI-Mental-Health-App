"""
Test suite for POST /api/stt/transcribe (OpenAI Whisper STT endpoint).
Tests: route existence, valid WAV upload, non-audio file, missing file (422), response schema.
"""
import io
import os
import struct
import wave

import pytest
import requests

# Use the public backend URL exposed through the Kubernetes ingress
BASE_URL = os.environ.get(
    "EXPO_PUBLIC_BACKEND_URL",
    os.environ.get("EXPO_BACKEND_URL", ""),
).rstrip("/")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def generate_silent_wav(duration_seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generate a minimal silent mono 16-bit PCM WAV file in memory."""
    num_samples = int(sample_rate * duration_seconds)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)   # 16-bit
        wf.setframerate(sample_rate)
        # Write silence (all zeros)
        wf.writeframes(struct.pack("<" + "h" * num_samples, *([0] * num_samples)))
    return buf.getvalue()


def generate_tone_wav(
    duration_seconds: float = 0.5,
    sample_rate: int = 16000,
    frequency: int = 440,
) -> bytes:
    """Generate a WAV file containing a simple sine-wave tone."""
    import math
    num_samples = int(sample_rate * duration_seconds)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        frames = []
        for i in range(num_samples):
            sample = int(32767 * math.sin(2 * math.pi * frequency * i / sample_rate))
            frames.append(struct.pack("<h", sample))
        wf.writeframes(b"".join(frames))
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Test class
# ---------------------------------------------------------------------------

class TestSTTTranscribe:
    """STT /api/stt/transcribe endpoint tests"""

    # ------------------------------------------------------------------
    # 1. Route existence & 422 for missing file
    # ------------------------------------------------------------------
    def test_no_file_returns_422(self):
        """POST /api/stt/transcribe with no file body must return 422 Unprocessable Entity."""
        url = f"{BASE_URL}/api/stt/transcribe"
        response = requests.post(url)
        assert response.status_code == 422, (
            f"Expected 422 for missing file, got {response.status_code}. Body: {response.text[:300]}"
        )
        print(f"PASS test_no_file_returns_422 → {response.status_code}")

    # ------------------------------------------------------------------
    # 2. Valid silent WAV → 200, correct schema, model = whisper-1
    # ------------------------------------------------------------------
    def test_valid_wav_returns_200_and_schema(self):
        """Upload a small silent WAV; expect 200, JSON with 'text' and 'model' fields."""
        url = f"{BASE_URL}/api/stt/transcribe"
        wav_bytes = generate_silent_wav(duration_seconds=1.0)

        files = {"file": ("test_silence.wav", wav_bytes, "audio/wav")}
        response = requests.post(url, files=files, timeout=60)

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. Body: {response.text[:500]}"
        )
        data = response.json()
        assert "text" in data, f"'text' field missing from response: {data}"
        assert "model" in data, f"'model' field missing from response: {data}"
        assert data["model"] == "whisper-1", (
            f"Expected model='whisper-1', got '{data['model']}'"
        )
        # text can be empty string for silence — that is acceptable
        assert isinstance(data["text"], str), (
            f"'text' should be a string, got {type(data['text'])}"
        )
        print(f"PASS test_valid_wav_returns_200_and_schema → text='{data['text']}', model='{data['model']}'")

    # ------------------------------------------------------------------
    # 3. Valid tone WAV → 200, schema intact
    # ------------------------------------------------------------------
    def test_tone_wav_returns_200(self):
        """Upload a WAV with an audible tone; expect 200 with correct schema."""
        url = f"{BASE_URL}/api/stt/transcribe"
        wav_bytes = generate_tone_wav(duration_seconds=0.5)

        files = {"file": ("tone.wav", wav_bytes, "audio/wav")}
        response = requests.post(url, files=files, timeout=60)

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. Body: {response.text[:500]}"
        )
        data = response.json()
        assert "text" in data
        assert "model" in data
        assert data["model"] == "whisper-1"
        print(f"PASS test_tone_wav_returns_200 → text='{data['text']}'")

    # ------------------------------------------------------------------
    # 4. Non-audio file (plain text) → 500 or error response
    # ------------------------------------------------------------------
    def test_non_audio_file_returns_error(self):
        """Upload a .txt file; expect 500 or non-200 with error detail."""
        url = f"{BASE_URL}/api/stt/transcribe"
        fake_content = b"This is not an audio file. It is plain text."

        files = {"file": ("test_file.txt", fake_content, "text/plain")}
        response = requests.post(url, files=files, timeout=60)

        # Expect a 5xx error because Whisper will reject non-audio content
        assert response.status_code >= 400, (
            f"Expected error status (4xx/5xx) for non-audio, got {response.status_code}. "
            f"Body: {response.text[:300]}"
        )
        # Response body should contain error information
        body = response.text
        assert len(body) > 0, "Error response body is empty"
        print(f"PASS test_non_audio_file_returns_error → {response.status_code}: {body[:200]}")

    # ------------------------------------------------------------------
    # 5. Response schema: model field value is exactly "whisper-1"
    # ------------------------------------------------------------------
    def test_model_field_is_whisper_1(self):
        """Verify the model field in the response is always 'whisper-1'."""
        url = f"{BASE_URL}/api/stt/transcribe"
        wav_bytes = generate_silent_wav(duration_seconds=0.5)

        files = {"file": ("short.wav", wav_bytes, "audio/wav")}
        response = requests.post(url, files=files, timeout=60)

        assert response.status_code == 200, (
            f"Expected 200, got {response.status_code}. Body: {response.text[:300]}"
        )
        data = response.json()
        assert data.get("model") == "whisper-1", (
            f"model must be 'whisper-1', got: {data.get('model')}"
        )
        print(f"PASS test_model_field_is_whisper_1 → model='{data['model']}'")

    # ------------------------------------------------------------------
    # 6. Response text field for real-sounding input is a string (not null)
    # ------------------------------------------------------------------
    def test_text_field_is_string(self):
        """Verify text field is always a string (empty or otherwise) — never null."""
        url = f"{BASE_URL}/api/stt/transcribe"
        wav_bytes = generate_silent_wav(duration_seconds=1.0)

        files = {"file": ("check.wav", wav_bytes, "audio/wav")}
        response = requests.post(url, files=files, timeout=60)

        assert response.status_code == 200
        data = response.json()
        assert data["text"] is not None, "'text' field must not be null"
        assert isinstance(data["text"], str), f"'text' must be str, got {type(data['text'])}"
        print(f"PASS test_text_field_is_string → text type={type(data['text']).__name__}, value='{data['text']}'")
