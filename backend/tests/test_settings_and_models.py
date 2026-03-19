"""
Backend tests for GlowCare new features:
- User Settings GET/PUT endpoints
- Claude 4 Sonnet (anthropic) model verification via /api/conversations/analyze
- Health check model confirmation
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
DEMO_USER_ID = 'demo-user-123'


@pytest.fixture(scope="session")
def api():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ── Health Check ──────────────────────────────────────────────────────────────
class TestHealthAndModel:
    """Verify health endpoint reports anthropic/claude-4-sonnet model."""

    def test_health_returns_200(self, api):
        res = api.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        data = res.json()
        assert data.get("status") == "healthy"
        print(f"Health OK, preferred_model: {data.get('services', {}).get('preferred_model')}")

    def test_health_preferred_model_is_anthropic(self, api):
        """Verify preferred model is now claude (anthropic), not doubao."""
        res = api.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200
        data = res.json()
        preferred_model = data.get("services", {}).get("preferred_model", "")
        # Should contain 'anthropic' 
        assert "anthropic" in preferred_model.lower(), (
            f"Expected anthropic in preferred_model, got: {preferred_model}"
        )
        print(f"Confirmed anthropic model: {preferred_model}")


# ── User Settings GET ─────────────────────────────────────────────────────────
class TestUserSettingsGet:
    """GET /api/users/{user_id}/settings"""

    def test_get_settings_returns_200(self, api):
        res = api.get(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings")
        assert res.status_code == 200, f"Settings GET failed: {res.text}"

    def test_get_settings_has_all_required_fields(self, api):
        """Response must include all required fields from UserSettingsData model."""
        res = api.get(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings")
        assert res.status_code == 200
        data = res.json()
        required_fields = [
            "llm_provider", "llm_model", "risk_threshold",
            "crisis_threshold", "language", "daily_reminder", "reminder_time"
        ]
        for field in required_fields:
            assert field in data, f"Missing field '{field}' in settings response"
        print(f"All required settings fields present: {list(data.keys())}")

    def test_get_settings_default_model_is_claude(self, api):
        """Default llm_model should be claude-4-sonnet-20250514 (reset before checking)."""
        # Reset to defaults first to ensure idempotent test
        default_payload = {
            "llm_provider": "anthropic",
            "llm_model": "claude-4-sonnet-20250514",
            "risk_threshold": 0.6,
            "crisis_threshold": 4,
            "language": "zh",
            "daily_reminder": False,
            "reminder_time": "20:00"
        }
        api.put(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings", json=default_payload)
        
        res = api.get(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings")
        assert res.status_code == 200
        data = res.json()
        assert data["llm_model"] == "claude-4-sonnet-20250514", (
            f"Expected claude-4-sonnet-20250514, got: {data['llm_model']}"
        )
        assert data["llm_provider"] == "anthropic", (
            f"Expected anthropic, got: {data['llm_provider']}"
        )
        print(f"Default model confirmed: {data['llm_provider']}/{data['llm_model']}")

    def test_get_settings_default_values(self, api):
        """Verify default field types and ranges."""
        res = api.get(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings")
        assert res.status_code == 200
        data = res.json()
        # risk_threshold: 0.0-1.0 float
        assert isinstance(data["risk_threshold"], float), "risk_threshold should be float"
        assert 0.0 <= data["risk_threshold"] <= 1.0, "risk_threshold out of range"
        # crisis_threshold: 0-5 int
        assert isinstance(data["crisis_threshold"], int), "crisis_threshold should be int"
        assert 0 <= data["crisis_threshold"] <= 5, "crisis_threshold out of range"
        # language
        assert data["language"] in ["zh", "en"], f"language should be zh or en, got: {data['language']}"
        # daily_reminder
        assert isinstance(data["daily_reminder"], bool), "daily_reminder should be bool"
        print(f"Default values OK: risk={data['risk_threshold']}, crisis={data['crisis_threshold']}, lang={data['language']}")

    def test_get_settings_nonexistent_user_returns_404(self, api):
        """GET settings for non-existing user returns 404."""
        res = api.get(f"{BASE_URL}/api/users/nonexistent-user-9999/settings")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("Nonexistent user settings correctly returns 404")


# ── User Settings PUT ─────────────────────────────────────────────────────────
class TestUserSettingsPut:
    """PUT /api/users/{user_id}/settings"""

    # Store the original settings to restore after tests
    original_settings = None

    def test_put_settings_returns_200(self, api):
        """Basic PUT settings returns 200."""
        payload = {
            "llm_provider": "anthropic",
            "llm_model": "claude-4-sonnet-20250514",
            "risk_threshold": 0.6,
            "crisis_threshold": 4,
            "language": "zh",
            "daily_reminder": False,
            "reminder_time": "20:00"
        }
        res = api.put(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings", json=payload)
        assert res.status_code == 200, f"Settings PUT failed: {res.text}"

    def test_put_settings_updates_language(self, api):
        """Update language to 'en' and verify it returns updated value."""
        payload = {
            "llm_provider": "anthropic",
            "llm_model": "claude-4-sonnet-20250514",
            "risk_threshold": 0.6,
            "crisis_threshold": 4,
            "language": "en",
            "daily_reminder": False,
            "reminder_time": "20:00"
        }
        put_res = api.put(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings", json=payload)
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["language"] == "en", f"Expected 'en', got {put_data['language']}"
        print(f"Language updated to: {put_data['language']}")

    def test_put_settings_updates_risk_threshold(self, api):
        """Update risk_threshold and verify it persists via GET."""
        new_threshold = 0.75
        payload = {
            "llm_provider": "anthropic",
            "llm_model": "claude-4-sonnet-20250514",
            "risk_threshold": new_threshold,
            "crisis_threshold": 4,
            "language": "zh",
            "daily_reminder": False,
            "reminder_time": "20:00"
        }
        put_res = api.put(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings", json=payload)
        assert put_res.status_code == 200
        
        # Verify via GET
        get_res = api.get(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert abs(get_data["risk_threshold"] - new_threshold) < 0.001, (
            f"Expected risk_threshold={new_threshold}, got {get_data['risk_threshold']}"
        )
        print(f"risk_threshold persisted correctly: {get_data['risk_threshold']}")

    def test_put_settings_updates_daily_reminder(self, api):
        """Toggle daily_reminder to True and verify it persists."""
        payload = {
            "llm_provider": "anthropic",
            "llm_model": "claude-4-sonnet-20250514",
            "risk_threshold": 0.6,
            "crisis_threshold": 4,
            "language": "zh",
            "daily_reminder": True,
            "reminder_time": "08:00"
        }
        put_res = api.put(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings", json=payload)
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["daily_reminder"] is True
        assert put_data["reminder_time"] == "08:00"
        
        # Verify via GET
        get_res = api.get(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings")
        assert get_res.status_code == 200
        get_data = get_res.json()
        assert get_data["daily_reminder"] is True
        assert get_data["reminder_time"] == "08:00"
        print(f"daily_reminder persisted: {get_data['daily_reminder']}, time={get_data['reminder_time']}")

    def test_put_settings_nonexistent_user_returns_404(self, api):
        """PUT settings for non-existing user returns 404."""
        payload = {
            "llm_provider": "anthropic",
            "llm_model": "claude-4-sonnet-20250514",
            "risk_threshold": 0.6,
            "crisis_threshold": 4,
            "language": "zh",
            "daily_reminder": False,
            "reminder_time": "20:00"
        }
        res = api.put(f"{BASE_URL}/api/users/nonexistent-user-9999/settings", json=payload)
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("Nonexistent user settings PUT correctly returns 404")

    def test_put_settings_updates_crisis_threshold(self, api):
        """Update crisis_threshold and verify persistence."""
        payload = {
            "llm_provider": "openai",
            "llm_model": "gpt-4o-mini",
            "risk_threshold": 0.5,
            "crisis_threshold": 3,
            "language": "zh",
            "daily_reminder": False,
            "reminder_time": "20:00"
        }
        put_res = api.put(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings", json=payload)
        assert put_res.status_code == 200
        put_data = put_res.json()
        assert put_data["crisis_threshold"] == 3
        assert put_data["llm_model"] == "gpt-4o-mini"

        # Restore defaults
        restore_payload = {
            "llm_provider": "anthropic",
            "llm_model": "claude-4-sonnet-20250514",
            "risk_threshold": 0.6,
            "crisis_threshold": 4,
            "language": "zh",
            "daily_reminder": False,
            "reminder_time": "20:00"
        }
        api.put(f"{BASE_URL}/api/users/{DEMO_USER_ID}/settings", json=restore_payload)
        print(f"crisis_threshold updated to 3 and restored to 4")


# ── Conversation Analyze + Provider Check ─────────────────────────────────────
class TestConversationAnalyzeProvider:
    """Verify POST /api/conversations/analyze uses Claude/anthropic provider."""

    def test_analyze_returns_200(self, api):
        payload = {
            "user_id": DEMO_USER_ID,
            "conversation_text": "TEST_ 今天情绪不太好，感觉很迷茫"
        }
        res = api.post(f"{BASE_URL}/api/conversations/analyze", json=payload)
        assert res.status_code == 200, f"Analyze failed: {res.text}"
        data = res.json()
        assert "id" in data
        assert "analysis" in data
        print(f"Analyze succeeded, id={data['id']}, crisis={data.get('crisis_level')}")

    def test_analyze_returns_proper_analysis(self, api):
        """The analysis should have emotion fields."""
        payload = {
            "user_id": DEMO_USER_ID,
            "conversation_text": "TEST_ 我很焦虑，工作上有很多压力"
        }
        res = api.post(f"{BASE_URL}/api/conversations/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        analysis = data.get("analysis", {})
        assert "emotion_primary" in analysis
        assert "risk_score" in analysis
        print(f"Analysis OK: emotion={analysis.get('emotion_primary')}, risk={analysis.get('risk_score')}")
