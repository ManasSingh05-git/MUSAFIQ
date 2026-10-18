"""Destinations, favourites, stats, weather and currency."""
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import get_settings
from ..database import get_db
from ..models import Destination, Favorite, Trip, User
from ..schemas import DestinationDetail, DestinationOut, FavoriteIn, FavoriteOut
from ..security import get_current_user
from ..seed_data import ORIGIN_CITIES

router = APIRouter(prefix="/api", tags=["catalog"])

# Fallback FX rates: FIXED SAMPLE VALUES for offline demo, not live market rates.
FALLBACK_RATES_PER_INR = {"INR": 1.0, "USD": 0.012, "EUR": 0.011, "GBP": 0.0095, "JPY": 1.8, "IDR": 190.0, "TRY": 0.40}


@router.get("/health")
def health():
    return {"status": "ok"}


@router.get("/cities")
def cities():
    return {"cities": [{"name": n, "latitude": lat, "longitude": lon} for n, (lat, lon) in ORIGIN_CITIES.items()]}


@router.get("/countries-regions")
def get_countries_and_regions(db: Session = Depends(get_db)):
    dests = db.query(Destination).all()
    countries = sorted(list({d.country for d in dests if d.country}))
    regions = sorted(list({d.region for d in dests if d.region}))
    return {"countries": countries, "regions": regions}


@router.get("/destinations", response_model=list[DestinationOut])
def list_destinations(
    q: str | None = None, country: str | None = None, region: str | None = None,
    category: str | None = None, climate: str | None = None,
    interest: str | None = None, month: int | None = Query(None, ge=1, le=12),
    max_daily_cost: int | None = Query(None, ge=0, description="max (stay/2 + food + local) INR per person per day"),
    sort: str = Query("name", pattern="^(name|cost|days)$"),
    db: Session = Depends(get_db),
):
    if q and q.strip():
        # Check and dynamically seed if a known country or state was queried that isn't yet in DB
        from ..catalog_service import ensure_destination_for_query
        ensure_destination_for_query(q, db)

    items = db.query(Destination).all()
    if q:
        ql = q.lower().strip()
        items = [
            d for d in items
            if ql in d.name.lower()
            or ql in d.country.lower()
            or ql in d.region.lower()
            or any(ql in cat.lower() for cat in (d.categories or []))
            or any(ql in intr.lower() for intr in (d.interests or []))
            or any(ql in a.name.lower() for a in (d.attractions or []))
        ]
    if country:
        cl = country.lower().strip()
        items = [d for d in items if cl in d.country.lower()]
    if region:
        rl = region.lower().strip()
        items = [d for d in items if rl in d.region.lower()]
    if category:
        items = [d for d in items if category in (d.categories or [])]
    if interest:
        items = [d for d in items if interest in (d.interests or [])]
    if climate:
        items = [d for d in items if d.climate == climate]
    if month:
        items = [d for d in items if month in (d.best_months or [])]

    def daily(d: Destination) -> float:
        return d.stay_per_night_inr / 2 + d.food_per_day_inr + d.local_transport_per_day_inr

    if max_daily_cost is not None:
        items = [d for d in items if daily(d) <= max_daily_cost]
    key = {"name": lambda d: d.name.lower(), "cost": daily, "days": lambda d: d.suggested_days}[sort]
    return sorted(items, key=key)


@router.get("/destinations/{dest_id}", response_model=DestinationDetail)
def get_destination(dest_id: int, db: Session = Depends(get_db)):
    d = db.get(Destination, dest_id)
    if d is None:
        raise HTTPException(404, "Destination not found.")
    return d


# ---------------- favourites ----------------
@router.get("/favorites", response_model=list[FavoriteOut])
def list_favorites(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Favorite).filter(Favorite.user_id == user.id).order_by(Favorite.id.desc()).all()


@router.post("/favorites", response_model=FavoriteOut, status_code=201)
def add_favorite(body: FavoriteIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.get(Destination, body.destination_id) is None:
        raise HTTPException(404, "Destination not found.")
    existing = db.query(Favorite).filter_by(user_id=user.id, destination_id=body.destination_id).first()
    if existing:
        return existing  # idempotent
    fav = Favorite(user_id=user.id, destination_id=body.destination_id)
    db.add(fav)
    db.commit()
    db.refresh(fav)
    return fav


@router.delete("/favorites/{fav_id}", status_code=204)
def remove_favorite(fav_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    fav = db.get(Favorite, fav_id)
    if fav is None or fav.user_id != user.id:
        raise HTTPException(404, "Favorite not found.")
    db.delete(fav)
    db.commit()


# ---------------- stats ----------------
@router.get("/stats")
def stats(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    from datetime import date
    trips = db.query(Trip).filter(Trip.user_id == user.id).all()
    today = date.today()
    completed = [t for t in trips if t.end_date < today]
    countries = {t.destination.country for t in completed if t.destination}
    favs = db.query(Favorite).filter(Favorite.user_id == user.id).count()
    return {
        "saved_destinations": favs, "total_trips": len(trips), "completed_trips": len(completed),
        "countries_visited": len(countries),
        "trip_completion_pct": round(100 * len(completed) / len(trips)) if trips else 0,
        "note": "Computed from your saved trips (a completed trip = end date in the past).",
    }


# ---------------- weather (optional live) ----------------
@router.get("/weather")
def weather(lat: float = Query(ge=-90, le=90), lon: float = Query(ge=-180, le=180)):
    if not get_settings().enable_live_weather:
        return {"available": False, "reason": "Live weather is disabled in configuration."}
    try:
        r = httpx.get(
            "https://api.open-meteo.com/v1/forecast",
            params={"latitude": lat, "longitude": lon, "current": "temperature_2m,weather_code", "daily": "temperature_2m_max,temperature_2m_min", "timezone": "auto", "forecast_days": 1},
            timeout=6,
        )
        r.raise_for_status()
        j = r.json()
        return {"available": True, "source": "Open-Meteo (live)", "temperature_c": j["current"]["temperature_2m"],
                "weather_code": j["current"]["weather_code"],
                "high_c": j["daily"]["temperature_2m_max"][0], "low_c": j["daily"]["temperature_2m_min"][0]}
    except (httpx.HTTPError, KeyError, ValueError):
        return {"available": False, "reason": "Weather service unreachable; no data shown."}


# ---------------- currency ----------------
@router.get("/currency")
def currency(amount: float = Query(gt=0, le=1e9), to: str = Query(min_length=3, max_length=3)):
    """Convert an INR amount. Live rate if enabled and reachable, otherwise labelled fallback sample rates."""
    to = to.upper()
    if get_settings().enable_live_fx:
        try:
            r = httpx.get("https://api.frankfurter.app/latest", params={"from": "INR", "to": to}, timeout=6)
            r.raise_for_status()
            rate = r.json()["rates"][to]
            return {"amount_inr": amount, "to": to, "converted": round(amount * rate, 2), "rate": rate, "source": "frankfurter.app (live)", "is_live": True}
        except (httpx.HTTPError, KeyError, ValueError):
            pass
    if to not in FALLBACK_RATES_PER_INR:
        raise HTTPException(400, f"No rate available for {to}. Supported offline: {', '.join(FALLBACK_RATES_PER_INR)}")
    rate = FALLBACK_RATES_PER_INR[to]
    return {"amount_inr": amount, "to": to, "converted": round(amount * rate, 2), "rate": rate,
            "source": "fallback sample rates (NOT live)", "is_live": False}
