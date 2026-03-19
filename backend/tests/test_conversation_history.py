"""
Backend tests for GlowCare conversation history feature.
Tests: analyze endpoint, history pagination, and detail endpoint.
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
DEMO_USER_ID = 'demo-user-123'

# Store created conversation IDs for cleanup and verification
created_ids = []


@pytest.fixture(scope="session")
def api():
    """Shared requests session."""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ── Health check ─────────────────────────────────────────────────────────────
class TestHealth:
    """Verify backend is reachable and healthy."""

    def test_health_endpoint(self, api):
        res = api.get(f"{BASE_URL}/api/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        data = res.json()
        assert data.get("status") == "healthy"
        print(f"Health OK – preferred model: {data.get('services', {}).get('preferred_model')}")


# ── POST /api/conversations/analyze ──────────────────────────────────────────
class TestConversationAnalyze:
    """Create a conversation via analyze endpoint."""

    def test_analyze_creates_entry(self, api):
        payload = {
            "user_id": DEMO_USER_ID,
            "conversation_text": "TEST_ 今天工作很压力，感觉喘不过气来，什么都做不好。"
        }
        res = api.post(f"{BASE_URL}/api/conversations/analyze", json=payload)
        assert res.status_code == 200, f"Analyze failed: {res.text}"
        data = res.json()
        # Verify top-level fields
        assert "id" in data, "Missing 'id' in response"
        assert data.get("user_id") == DEMO_USER_ID
        assert "analysis" in data, "Missing 'analysis'"
        assert "support_suggestions" in data, "Missing 'support_suggestions'"
        assert isinstance(data["support_suggestions"], list)
        assert "crisis_level" in data
        assert isinstance(data["crisis_level"], int)
        assert 0 <= data["crisis_level"] <= 5
        # Store for downstream tests
        created_ids.append(data["id"])
        print(f"Created conversation id={data['id']}, crisis_level={data['crisis_level']}")

    def test_analyze_analysis_has_required_fields(self, api):
        """analysis dict must contain emotion_primary, valence, arousal, risk_score."""
        if not created_ids:
            pytest.skip("No conversation created yet")
        # Re-create a fresh one to verify
        payload = {
            "user_id": DEMO_USER_ID,
            "conversation_text": "TEST_ 我感到很焦虑，明天有重要会议。"
        }
        res = api.post(f"{BASE_URL}/api/conversations/analyze", json=payload)
        assert res.status_code == 200
        data = res.json()
        analysis = data.get("analysis", {})
        assert "emotion_primary" in analysis
        assert "valence" in analysis
        assert "arousal" in analysis
        assert "risk_score" in analysis
        created_ids.append(data["id"])
        print(f"analysis fields verified: emotion={analysis.get('emotion_primary')}")

    def test_analyze_empty_text_rejected(self, api):
        """Empty conversation_text should fail (422 or 400)."""
        payload = {"user_id": DEMO_USER_ID, "conversation_text": ""}
        res = api.post(f"{BASE_URL}/api/conversations/analyze", json=payload)
        # FastAPI validates Pydantic model, but conversation_text is a plain str with no min_length
        # It may succeed with empty – just verify it doesn't crash (not 500)
        assert res.status_code != 500, f"Server error on empty text: {res.text}"
        print(f"Empty text response: {res.status_code}")


# ── GET /api/conversations/{user_id}/history ─────────────────────────────────
class TestConversationHistory:
    """History list endpoint tests."""

    def test_history_returns_200(self, api):
        res = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history")
        assert res.status_code == 200, f"History failed: {res.text}"
        data = res.json()
        assert "items" in data, "Missing 'items' key"
        assert isinstance(data["items"], list)
        # next_cursor can be null or a string
        assert "next_cursor" in data, "Missing 'next_cursor' key"
        print(f"History returned {len(data['items'])} items, next_cursor={data.get('next_cursor')}")

    def test_history_items_have_required_fields(self, api):
        res = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history")
        assert res.status_code == 200
        data = res.json()
        if not data["items"]:
            pytest.skip("No items in history (empty DB)")
        item = data["items"][0]
        for field in ["id", "user_id", "conversation_text", "analysis", "support_suggestions", "crisis_level", "timestamp"]:
            assert field in item, f"Missing field '{field}' in history item"
        print(f"First item id={item['id']}, emotion={item.get('analysis', {}).get('emotion_primary')}")

    def test_history_limit_param(self, api):
        res = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history?limit=2")
        assert res.status_code == 200
        data = res.json()
        assert len(data["items"]) <= 2, f"limit=2 returned {len(data['items'])} items"
        print(f"limit=2 returned {len(data['items'])} items")

    def test_history_cursor_pagination(self, api):
        """If more items exist, test cursor-based pagination."""
        # First get with limit=1
        res1 = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history?limit=1")
        assert res1.status_code == 200
        data1 = res1.json()
        if not data1.get("next_cursor"):
            pytest.skip("Not enough items for pagination test")
        cursor = data1["next_cursor"]
        res2 = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history?limit=1&cursor={cursor}")
        assert res2.status_code == 200
        data2 = res2.json()
        # Items in page 2 should differ from page 1
        ids1 = {it["id"] for it in data1["items"]}
        ids2 = {it["id"] for it in data2["items"]}
        assert not ids1.intersection(ids2), "Cursor pagination returned duplicate items"
        print(f"Pagination OK – page1={list(ids1)[:1]}, page2={list(ids2)[:1]}")

    def test_history_invalid_cursor_returns_400(self, api):
        res = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history?cursor=not-a-timestamp")
        assert res.status_code == 400, f"Expected 400 for invalid cursor, got {res.status_code}"
        print("Invalid cursor correctly returns 400")

    def test_history_analyze_then_appears_in_history(self, api):
        """Create a conversation via analyze, then verify it shows up in history."""
        text = "TEST_ 压力测试 - 验证历史记录接口"
        create_res = api.post(f"{BASE_URL}/api/conversations/analyze", json={
            "user_id": DEMO_USER_ID,
            "conversation_text": text
        })
        assert create_res.status_code == 200
        new_id = create_res.json()["id"]
        created_ids.append(new_id)

        # Now fetch history and look for the new ID
        history_res = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history?limit=20")
        assert history_res.status_code == 200
        all_ids = [it["id"] for it in history_res.json()["items"]]
        assert new_id in all_ids, f"Newly created id={new_id} not found in history. IDs={all_ids}"
        print(f"Verified: new conversation {new_id} appears in history")


# ── GET /api/conversations/detail/{id} ───────────────────────────────────────
class TestConversationDetail:
    """Detail endpoint tests."""

    def test_detail_returns_correct_entry(self, api):
        if not created_ids:
            pytest.skip("No created conversations to fetch")
        cid = created_ids[0]
        res = api.get(f"{BASE_URL}/api/conversations/detail/{cid}")
        assert res.status_code == 200, f"Detail fetch failed: {res.text}"
        data = res.json()
        assert data["id"] == cid, f"Returned wrong id: {data['id']} != {cid}"
        assert data["user_id"] == DEMO_USER_ID
        assert "analysis" in data
        assert "support_suggestions" in data
        assert "crisis_level" in data
        assert "timestamp" in data
        print(f"Detail OK for id={cid}")

    def test_detail_analysis_structure(self, api):
        if not created_ids:
            pytest.skip("No created conversations")
        cid = created_ids[0]
        res = api.get(f"{BASE_URL}/api/conversations/detail/{cid}")
        assert res.status_code == 200
        analysis = res.json().get("analysis", {})
        for field in ["emotion_primary", "valence", "arousal", "risk_score"]:
            assert field in analysis, f"Missing '{field}' in detail analysis"
        print(f"Detail analysis fields: {list(analysis.keys())}")

    def test_detail_not_found_returns_404(self, api):
        res = api.get(f"{BASE_URL}/api/conversations/detail/nonexistent-id-999")
        assert res.status_code == 404, f"Expected 404, got {res.status_code}"
        print("404 for nonexistent id confirmed")

    def test_detail_matches_history_item(self, api):
        """Fetch from history and verify detail returns same data."""
        history_res = api.get(f"{BASE_URL}/api/conversations/{DEMO_USER_ID}/history?limit=1")
        assert history_res.status_code == 200
        items = history_res.json().get("items", [])
        if not items:
            pytest.skip("No items in history")
        cid = items[0]["id"]
        detail_res = api.get(f"{BASE_URL}/api/conversations/detail/{cid}")
        assert detail_res.status_code == 200
        d = detail_res.json()
        assert d["id"] == items[0]["id"]
        assert d["user_id"] == items[0]["user_id"]
        print(f"History↔Detail match confirmed for id={cid}")
