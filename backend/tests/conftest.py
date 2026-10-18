"""Test setup: use a throw-away SQLite file BEFORE the app modules are imported."""
import os
import pathlib

DB_FILE = pathlib.Path(__file__).parent / "test_tourplan.db"
if DB_FILE.exists():
    DB_FILE.unlink()
os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE}"
os.environ["GEMINI_API_KEY"] = ""          # tests must never call a live LLM
os.environ["ENABLE_LIVE_WEATHER"] = "false"
os.environ["ENABLE_LIVE_FX"] = "false"
os.environ["AI_RATE_LIMIT_PER_MINUTE"] = "1000"
os.environ["JWT_SECRET"] = "test-secret"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    from app.seed import init_db
    init_db()


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def auth(client):
    """Fresh registered user -> headers."""
    import uuid
    email = f"{uuid.uuid4().hex[:10]}@example.com"
    r = client.post("/api/auth/register", json={"email": email, "name": "Tester", "password": "password123"})
    assert r.status_code == 201, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def trip_body(**over):
    body = {
        "title": "Test trip", "start_city": "Mumbai", "destination_id": 1,
        "start_date": "2027-01-10", "end_date": "2027-01-13", "travelers": 3, "budget": 20000,
        "interests": ["food", "photography"],
    }
    body.update(over)
    return body
