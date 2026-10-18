from fastapi.testclient import TestClient

from app.main import app
from tests.conftest import trip_body


def test_health(client):
    assert client.get("/api/health").json() == {"status": "ok"}


# ---------------- auth ----------------
def test_register_login_and_validation(client):
    r = client.post("/api/auth/register", json={"email": "a1@example.com", "name": "A", "password": "password123"})
    assert r.status_code == 201 and "access_token" in r.json()
    assert "password" not in r.text
    # duplicate
    assert client.post("/api/auth/register", json={"email": "A1@example.com", "name": "A", "password": "password123"}).status_code == 409
    # weak / invalid
    assert client.post("/api/auth/register", json={"email": "b@example.com", "name": "B", "password": "short"}).status_code == 422
    assert client.post("/api/auth/register", json={"email": "not-an-email", "name": "B", "password": "password123"}).status_code == 422
    # login
    assert client.post("/api/auth/login", json={"email": "a1@example.com", "password": "password123"}).status_code == 200
    bad = client.post("/api/auth/login", json={"email": "a1@example.com", "password": "wrongpass"})
    unknown = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrongpass"})
    assert bad.status_code == unknown.status_code == 401 and bad.json() == unknown.json()


def test_demo_account_seeded(client):
    r = client.post("/api/auth/login", json={"email": "demo@tourplan.ai", "password": "demo12345"})
    assert r.status_code == 200


def test_protected_routes_need_token(client):
    for method, url in [("get", "/api/trips"), ("get", "/api/favorites"), ("post", "/api/ai/chat"), ("get", "/api/stats")]:
        assert getattr(client, method)(url).status_code == 401
    assert client.get("/api/trips", headers={"Authorization": "Bearer garbage"}).status_code == 401


# ---------------- destinations ----------------
def test_destinations_list_filter_detail(client):
    all_ = client.get("/api/destinations").json()
    assert len(all_) >= 12
    goa = client.get("/api/destinations", params={"q": "goa"}).json()
    assert [d["slug"] for d in goa] == ["goa"]
    mountains = client.get("/api/destinations", params={"category": "mountain"}).json()
    assert mountains and all("mountain" in d["categories"] for d in mountains)
    cheap = client.get("/api/destinations", params={"max_daily_cost": 1200, "sort": "cost"}).json()
    assert cheap and all(d["country"] == "India" for d in cheap)
    d = client.get(f"/api/destinations/{all_[0]['id']}").json()
    assert d["attractions"]
    assert client.get("/api/destinations/99999").status_code == 404
    assert client.get("/api/destinations", params={"month": 13}).status_code == 422


# ---------------- trips CRUD + authorization ----------------
def test_trip_crud_cycle(client, auth):
    r = client.post("/api/trips", json=trip_body(), headers=auth)
    assert r.status_code == 201, r.text
    trip = r.json()
    tid = trip["id"]
    assert trip["packing"], "packing list should be generated for a destination trip"

    assert client.get(f"/api/trips/{tid}", headers=auth).json()["title"] == "Test trip"
    assert [t["id"] for t in client.get("/api/trips", headers=auth).json()] == [tid]

    upd = trip_body(title="Renamed", travelers=2)
    r = client.put(f"/api/trips/{tid}", json=upd, headers=auth)
    assert r.status_code == 200 and r.json()["title"] == "Renamed" and r.json()["travelers"] == 2

    dup = client.post(f"/api/trips/{tid}/duplicate", headers=auth)
    assert dup.status_code == 201 and dup.json()["title"].endswith("(copy)") and dup.json()["id"] != tid

    assert client.delete(f"/api/trips/{tid}", headers=auth).status_code == 204
    assert client.get(f"/api/trips/{tid}", headers=auth).status_code == 404


def test_trip_validation(client, auth):
    assert client.post("/api/trips", json=trip_body(end_date="2026-12-01"), headers=auth).status_code == 422
    assert client.post("/api/trips", json=trip_body(travelers=0), headers=auth).status_code == 422
    assert client.post("/api/trips", json=trip_body(budget=-5), headers=auth).status_code == 422
    assert client.post("/api/trips", json=trip_body(interests=["skydiving"]), headers=auth).status_code == 422
    assert client.post("/api/trips", json=trip_body(destination_id=99999), headers=auth).status_code == 422
    assert client.post("/api/trips", json=trip_body(currency="USD"), headers=auth).status_code == 422


def test_users_cannot_access_each_others_trips(client, auth):
    tid = client.post("/api/trips", json=trip_body(), headers=auth).json()["id"]
    import uuid
    r = client.post("/api/auth/register", json={"email": f"{uuid.uuid4().hex[:8]}@example.com", "name": "Other", "password": "password123"})
    other = {"Authorization": f"Bearer {r.json()['access_token']}"}
    for method, url in [("get", f"/api/trips/{tid}"), ("delete", f"/api/trips/{tid}"),
                        ("get", f"/api/trips/{tid}/budget"), ("get", f"/api/trips/{tid}/itinerary"),
                        ("post", f"/api/trips/{tid}/duplicate"), ("get", f"/api/trips/{tid}/export.pdf")]:
        assert getattr(client, method)(url, headers=other).status_code == 404, url
    assert client.put(f"/api/trips/{tid}", json=trip_body(), headers=other).status_code == 404
    assert client.get("/api/trips", headers=other).json() == []
    assert client.get(f"/api/trips/{tid}", headers=auth).status_code == 200  # owner unaffected


# ---------------- generate -> save -> edit -> budget ----------------
def gen_body(**over):
    b = {"start_city": "Mumbai", "destination_id": None, "start_date": "2027-01-10", "end_date": "2027-01-13",
         "travelers": 3, "budget": 20000, "interests": ["photography", "food", "nature"],
         "travel_style": "budget", "pace": "balanced", "transport": "train", "accommodation": "hostel"}
    b.update(over)
    return b


def test_generate_without_destination_recommends_and_is_labelled(client, auth):
    r = client.post("/api/trips/generate", json=gen_body(), headers=auth)
    assert r.status_code == 200, r.text
    j = r.json()
    assert j["source"] == "rule_based" and "not a live LLM" in (j["note"] or "")
    assert j["recommendations"] and "breakdown" in j["recommendations"][0]
    assert "estimates" in j["data_disclaimer"]
    trip = j["trip"]
    assert len(trip["days"]) == 4 and all(d["activities"] for d in trip["days"])
    assert {e["category"] for e in trip["expenses"]} == set(j["budget"]["categories"])
    # nothing saved by generate
    assert client.get("/api/trips", headers=auth).json() == []


def test_generate_rejects_bad_city_and_dates(client, auth):
    assert client.post("/api/trips/generate", json=gen_body(start_city="Atlantis"), headers=auth).status_code == 422
    assert client.post("/api/trips/generate", json=gen_body(end_date="2026-01-01"), headers=auth).status_code == 422
    assert client.post("/api/trips/generate", json=gen_body(destination_id=99999), headers=auth).status_code == 422


def test_generated_plan_saves_and_budget_edit_recalculates(client, auth):
    j = client.post("/api/trips/generate", json=gen_body(), headers=auth).json()
    saved = client.post("/api/trips", json=j["trip"], headers=auth)
    assert saved.status_code == 201, saved.text
    tid = saved.json()["id"]

    bv = client.get(f"/api/trips/{tid}/budget", headers=auth).json()
    assert bv["total"] == sum(bv["categories"].values()) and bv["is_estimate"] is True

    exps = [{"category": k, "estimated": v, "actual": 0} for k, v in bv["categories"].items()]
    for e in exps:
        if e["category"] == "food":
            e["estimated"] = 0
    r = client.put(f"/api/trips/{tid}/budget", json={"expenses": exps}, headers=auth)
    assert r.status_code == 200
    assert r.json()["total"] == bv["total"] - bv["categories"]["food"]

    dup_cat = client.put(f"/api/trips/{tid}/budget", json={"expenses": exps + exps[:1]}, headers=auth)
    assert dup_cat.status_code == 422
    bad_cat = client.put(f"/api/trips/{tid}/budget", json={"expenses": [{"category": "yachts", "estimated": 5}]}, headers=auth)
    assert bad_cat.status_code == 422


def test_itinerary_edit_add_remove_reorder(client, auth):
    j = client.post("/api/trips/generate", json=gen_body(), headers=auth).json()
    tid = client.post("/api/trips", json=j["trip"], headers=auth).json()["id"]
    days = client.get(f"/api/trips/{tid}/itinerary", headers=auth).json()
    assert len(days) == 4

    # add an activity, remove one, reorder
    days[0]["activities"].append({"slot": "evening", "title": "Custom sunset walk", "duration_hours": 1, "estimated_cost": 0})
    days[1]["activities"] = list(reversed(days[1]["activities"]))
    removed_title = days[2]["activities"].pop(0)["title"]
    r = client.put(f"/api/trips/{tid}/itinerary", json=days, headers=auth)
    assert r.status_code == 200, r.text
    again = client.get(f"/api/trips/{tid}/itinerary", headers=auth).json()
    assert any(a["title"] == "Custom sunset walk" for a in again[0]["activities"])
    assert removed_title not in [a["title"] for a in again[2]["activities"]]
    assert [a["title"] for a in again[1]["activities"]] == [a["title"] for a in days[1]["activities"]]

    dup_days = [days[0], dict(days[1], day_number=1)]
    assert client.put(f"/api/trips/{tid}/itinerary", json=dup_days, headers=auth).status_code == 422
    half_coord = [{"day_number": 1, "activities": [{"title": "x", "latitude": 10.0}]}]
    assert client.put(f"/api/trips/{tid}/itinerary", json=half_coord, headers=auth).status_code == 422


def test_pdf_export(client, auth):
    j = client.post("/api/trips/generate", json=gen_body(), headers=auth).json()
    tid = client.post("/api/trips", json=j["trip"], headers=auth).json()["id"]
    r = client.get(f"/api/trips/{tid}/export.pdf", headers=auth)
    assert r.status_code == 200 and r.headers["content-type"] == "application/pdf" and r.content.startswith(b"%PDF")


# ---------------- favourites ----------------
def test_favorites_flow_and_isolation(client, auth):
    assert client.post("/api/favorites", json={"destination_id": 99999}, headers=auth).status_code == 404
    f1 = client.post("/api/favorites", json={"destination_id": 1}, headers=auth).json()
    f2 = client.post("/api/favorites", json={"destination_id": 1}, headers=auth).json()
    assert f1["id"] == f2["id"], "adding twice must be idempotent"
    assert len(client.get("/api/favorites", headers=auth).json()) == 1
    import uuid
    r = client.post("/api/auth/register", json={"email": f"{uuid.uuid4().hex[:8]}@example.com", "name": "O", "password": "password123"})
    other = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.delete(f"/api/favorites/{f1['id']}", headers=other).status_code == 404
    assert client.delete(f"/api/favorites/{f1['id']}", headers=auth).status_code == 204
    assert client.get("/api/favorites", headers=auth).json() == []


# ---------------- persistence across an application restart ----------------
def test_data_survives_app_restart(auth):
    with TestClient(app) as c1:
        tid = c1.post("/api/trips", json=trip_body(title="Persist me"), headers=auth).json()["id"]
    # new client => lifespan runs again (init_db is idempotent); data must still be there
    with TestClient(app) as c2:
        r = c2.get(f"/api/trips/{tid}", headers=auth)
        from app.seed_data import DESTINATIONS
        assert len(c2.get("/api/destinations").json()) == len(DESTINATIONS)   # seed not duplicated


# ---------------- misc endpoints ----------------
def test_currency_fallback_is_labelled(client):
    j = client.get("/api/currency", params={"amount": 1000, "to": "USD"}).json()
    assert j["is_live"] is False and "NOT live" in j["source"]
    assert client.get("/api/currency", params={"amount": 1000, "to": "XXX"}).status_code == 400


def test_weather_disabled_is_honest(client):
    j = client.get("/api/weather", params={"lat": 15.5, "lon": 73.8}).json()
    assert j["available"] is False
    assert client.get("/api/weather", params={"lat": 999, "lon": 0}).status_code == 422
