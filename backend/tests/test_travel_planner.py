import pytest

from app import travel as t
from app.seed_data import DESTINATIONS, ORIGIN_CITIES


def test_haversine_known_distance():
    # Mumbai -> Delhi is roughly 1,150 km in a straight line
    d = t.haversine_km(*ORIGIN_CITIES["Mumbai"], *ORIGIN_CITIES["Delhi"])
    assert 1100 < d < 1200


def test_transport_estimate_shape_and_label():
    goa = next(d for d in DESTINATIONS if d["slug"] == "goa")
    r = t.estimate_transport("mumbai", goa["lat"], goa["lon"], "train", 3)
    assert r["origin"] == "Mumbai" and r["is_estimate"] is True and r["round_trip_per_person"] > 0


def test_short_flight_falls_back_to_train():
    lon = next(d for d in DESTINATIONS if d["slug"] == "lonavala")
    r = t.estimate_transport("Mumbai", lon["lat"], lon["lon"], "flight", 2)
    assert r["mode"] == "train" and "too short" in r["note"]


def test_bad_inputs():
    with pytest.raises(ValueError):
        t.estimate_transport("Atlantis", 0, 0, "train", 1)
    with pytest.raises(ValueError):
        t.estimate_transport("Mumbai", 15, 73, "teleport", 1)


def test_seed_coordinates_are_valid_and_unique_slugs():
    slugs = [d["slug"] for d in DESTINATIONS]
    assert len(slugs) == len(set(slugs))
    for d in DESTINATIONS:
        assert -90 <= d["lat"] <= 90 and -180 <= d["lon"] <= 180
        assert d["attractions"], d["slug"]
        for name, _desc, lat, lon, *_ in d["attractions"]:
            assert -90 <= lat <= 90 and -180 <= lon <= 180 and (lat, lon) != (0, 0), name
            # attraction must be near its destination centre (catches typos / bogus placeholders)
            assert t.haversine_km(d["lat"], d["lon"], lat, lon) < 120, f"{d['slug']}: {name}"
