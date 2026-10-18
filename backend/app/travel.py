"""Distance and transport-cost ESTIMATION (not live fares).

Straight-line (haversine) distance between real city coordinates is scaled by a road/rail winding
factor, then multiplied by indicative per-km rates. All outputs are estimates and are labelled so.
"""
import math

from .seed_data import ORIGIN_CITIES

ROAD_FACTOR = 1.25
# Indicative rates in INR (sample assumptions, documented in the SRS/SDD)
TRAIN_PER_KM = 1.1
BUS_PER_KM = 1.7
CAR_PER_KM_PER_VEHICLE = 9.0
CAR_SEATS = 4
FLIGHT_BASE = 2500
FLIGHT_PER_KM = 4.2
SPEED_KMH = {"train": 50, "bus": 40, "car": 45}
FLIGHT_SPEED_KMH = 700
FLIGHT_OVERHEAD_H = 3.0
MIN_FLIGHT_KM = 350  # below this a flight is not suggested

TRANSPORT_MODES = ("train", "bus", "car", "flight")


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def resolve_city(name: str) -> str | None:
    """Case-insensitive match against supported origin cities."""
    key = (name or "").strip().lower()
    for city in ORIGIN_CITIES:
        if city.lower() == key:
            return city
    return None


def estimate_transport(origin: str, dest_lat: float, dest_lon: float, mode: str, travelers: int) -> dict:
    """Return round-trip cost per person and one-way hours.

    Raises ValueError for an unsupported origin city or mode.
    """
    city = resolve_city(origin)
    if city is None:
        raise ValueError(f"Unsupported start city '{origin}'. Supported: {', '.join(ORIGIN_CITIES)}")
    if mode not in TRANSPORT_MODES:
        raise ValueError(f"Unsupported transport '{mode}'. Use one of: {', '.join(TRANSPORT_MODES)}")
    if travelers < 1:
        raise ValueError("travelers must be at least 1")

    lat, lon = ORIGIN_CITIES[city]
    straight = haversine_km(lat, lon, dest_lat, dest_lon)
    note = "Estimate from straight-line distance and indicative rates; not a live fare."
    used = mode

    if mode == "flight" and straight < MIN_FLIGHT_KM:
        used = "train"
        note = "Distance too short for a flight; estimated by train instead. " + note
    if straight > 4000 and used != "flight":
        used = "flight"
        note = "Very long distance; estimated by air instead. " + note

    road_km = straight * ROAD_FACTOR
    if used == "flight":
        one_way = FLIGHT_BASE + FLIGHT_PER_KM * straight
        hours = straight / FLIGHT_SPEED_KMH + FLIGHT_OVERHEAD_H
    elif used == "train":
        one_way = TRAIN_PER_KM * road_km
        hours = road_km / SPEED_KMH["train"]
    elif used == "bus":
        one_way = BUS_PER_KM * road_km
        hours = road_km / SPEED_KMH["bus"]
    else:  # car: cost shared per vehicle
        vehicles = math.ceil(travelers / CAR_SEATS)
        one_way = vehicles * CAR_PER_KM_PER_VEHICLE * road_km / travelers
        hours = road_km / SPEED_KMH["car"]

    return {
        "origin": city,
        "mode": used,
        "requested_mode": mode,
        "distance_km": round(straight),
        "one_way_hours": round(hours, 1),
        "round_trip_per_person": round(one_way * 2),
        "is_estimate": True,
        "note": note,
    }
