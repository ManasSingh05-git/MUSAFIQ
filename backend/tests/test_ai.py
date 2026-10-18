import json

import httpx
import pytest

from app import ai
from app.database import SessionLocal

DEMO_MSG = ("I live in Mumbai. I want to travel for four days next month with two friends. My total budget is "
            "₹20,000. I like mountains, photography, local food, and peaceful places. Suggest a destination and plan the trip.")


@pytest.fixture()
def db():
    with SessionLocal() as s:
        yield s


def test_extracts_demo_message(db):
    f = ai.extract_requirements(DEMO_MSG, db)
    assert f["start_city"] == "Mumbai" and f["days"] == 4 and f["travelers"] == 3
    assert f["budget"] == 20000
    assert {"photography", "food", "nature"} <= set(f["interests"])
    assert f["avoid_crowds"] is True and f["date_assumed"] is True


@pytest.mark.parametrize("text,key,val", [
    ("under ₹10,000", "budget", 10000), ("budget of 15k", "budget", 15000), ("3 nights in goa", "days", 4),
    ("a trip for 5 people", "travelers", 5), ("travelling solo", "travelers", 1), ("plan a five-day goa trip", "days", 5),
])
def test_extraction_variants(db, text, key, val):
    assert ai.extract_requirements(text, db)[key] == val


def test_destination_named_in_text(db):
    assert ai.extract_requirements("Plan a five-day Goa trip", db).get("destination_id")


def test_asks_followup_when_details_missing(client, auth):
    r = client.post("/api/ai/chat", json={"message": "Plan something nice"}, headers=auth).json()
    assert "still need" in r["message"]["content"] and r["message"]["payload"] is None
    assert r["message"]["source"] == "rule_based"


def test_fallback_chat_is_labelled_rule_based_and_plan_is_saveable(client, auth):
    r = client.post("/api/ai/chat", json={"message": DEMO_MSG}, headers=auth)
    assert r.status_code == 200, r.text
    m = r.json()["message"]
    assert m["source"] == "rule_based"                       # never pretends to be an LLM
    assert "not a live LLM" in m["content"] and "can't book" in m["content"]
    assert m["payload"]["type"] == "plan" and m["payload"]["recommendations"]
    saved = client.post("/api/trips", json=m["payload"]["trip"], headers=auth)
    assert saved.status_code == 201, saved.text


def test_conversational_refinement_and_persistence(client, auth):
    cid = client.post("/api/ai/chat", json={"message": DEMO_MSG}, headers=auth).json()["conversation_id"]
    before = client.post("/api/ai/chat", json={"message": "ok", "conversation_id": cid}, headers=auth).json()["message"]["payload"]["budget"]["total"]
    cheaper = client.post("/api/ai/chat", json={"message": "Make this trip cheaper", "conversation_id": cid}, headers=auth).json()
    assert cheaper["message"]["payload"]["budget"]["total"] <= before
    conv = client.get(f"/api/ai/conversations/{cid}", headers=auth).json()
    assert len(conv["messages"]) == 6                            # 3 user + 3 assistant, persisted
    assert client.delete(f"/api/ai/conversations/{cid}", headers=auth).status_code == 204
    assert client.get(f"/api/ai/conversations/{cid}", headers=auth).status_code == 404


def test_unrealistic_budget_is_explained_not_hidden(client, auth):
    msg = "I live in Mumbai. 4 days for 3 people budget ₹3,000 like food"
    m = client.post("/api/ai/chat", json={"message": msg}, headers=auth).json()["message"]
    assert "OVER" in m["content"] or "No top-ranked destination fits" in m["content"]


def test_conversations_are_private(client, auth):
    cid = client.post("/api/ai/chat", json={"message": DEMO_MSG}, headers=auth).json()["conversation_id"]
    import uuid
    r = client.post("/api/auth/register", json={"email": f"{uuid.uuid4().hex[:8]}@example.com", "name": "O", "password": "password123"})
    other = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get(f"/api/ai/conversations/{cid}", headers=other).status_code == 404
    assert client.post("/api/ai/chat", json={"message": "hi", "conversation_id": cid}, headers=other).status_code == 404


def test_rate_limit():
    ai.reset_rate_limits()
    from app.config import get_settings
    limit = get_settings().ai_rate_limit_per_minute
    assert all(ai.check_rate_limit(1, now=float(i) * 0.001) for i in range(limit))
    assert ai.check_rate_limit(1, now=1.0) is False
    assert ai.check_rate_limit(1, now=100.0) is True            # window slid
    ai.reset_rate_limits()


def test_ai_status_reports_fallback(client):
    j = client.get("/api/ai/status").json()
    assert j["llm_configured"] is False and j["mode"] == "rule_based"


# ---------------- LLM path (mocked; no network, no key) ----------------
class FakeResp:
    def __init__(self, status=200, body=None):
        self.status_code, self._body = status, body

    def json(self):
        return self._body


def _gem(text):
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


def test_gemini_valid_json_is_parsed(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    from app.config import get_settings
    get_settings.cache_clear()
    good = json.dumps({"summary": "Great fit.", "why_it_fits": ["a"], "assumptions": [], "day_titles": ["D1"], "extra_tips": []})
    monkeypatch.setattr(httpx, "post", lambda *a, **k: FakeResp(200, _gem(good)))
    out = ai.call_gemini("prompt")
    assert out.summary == "Great fit."
    get_settings.cache_clear()


@pytest.mark.parametrize("resp,msg", [
    (FakeResp(429, {}), "quota"), (FakeResp(500, {}), "HTTP 500"),
    (FakeResp(200, _gem("not json")), "invalid"), (FakeResp(200, {"oops": 1}), "invalid"),
    (FakeResp(200, _gem(json.dumps({"summary": ""}))), "invalid"),
])
def test_gemini_failures_raise_llmerror(monkeypatch, resp, msg):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    from app.config import get_settings
    get_settings.cache_clear()
    monkeypatch.setattr(httpx, "post", lambda *a, **k: resp)
    with pytest.raises(ai.LLMError, match=msg):
        ai.call_gemini("prompt")
    get_settings.cache_clear()


def test_network_error_falls_back_and_is_disclosed(client, auth, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    from app.config import get_settings
    get_settings.cache_clear()

    def boom(*a, **k):
        raise httpx.ConnectError("down")
    monkeypatch.setattr(httpx, "post", boom)
    m = client.post("/api/ai/chat", json={"message": DEMO_MSG}, headers=auth).json()["message"]
    assert m["source"] == "rule_based" and "unavailable" in m["content"]
    get_settings.cache_clear()


def test_llm_success_marks_source_llm(client, auth, monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake")
    from app.config import get_settings
    get_settings.cache_clear()
    good = json.dumps({"summary": "LLM-written overview.", "why_it_fits": [], "assumptions": [], "day_titles": [], "extra_tips": ["Carry a jacket."]})
    monkeypatch.setattr(httpx, "post", lambda *a, **k: FakeResp(200, _gem(good)))
    m = client.post("/api/ai/chat", json={"message": DEMO_MSG}, headers=auth).json()["message"]
    assert m["source"] == "llm"
    assert m["payload"]["trip"]["overview"] == "LLM-written overview."
    assert m["payload"]["trip"]["generated_by"] == "llm"
    get_settings.cache_clear()
