"""Trip persistence helpers shared by the routers."""
from datetime import date

from fastapi import HTTPException
from sqlalchemy.orm import Session

from . import budget as bud
from .models import (
    Attraction, BudgetExpense, Destination, ItineraryActivity, ItineraryDay, PackingItem, Trip, User,
)
from .planner import TripParams, build_itinerary, build_plan, packing_list
from .schemas import DayIO, ExpenseIO, TripCreate, TripUpdate


def trip_status(t: Trip, today: date | None = None) -> str:
    today = today or date.today()
    if t.end_date < today:
        return "completed"
    if t.start_date <= today:
        return "ongoing"
    return "upcoming"


def get_owned_trip(db: Session, user: User, trip_id: int) -> Trip:
    """404 (not 403) for other users' trips so trip ids cannot be probed."""
    trip = db.get(Trip, trip_id)
    if trip is None or trip.user_id != user.id:
        raise HTTPException(status_code=404, detail="Trip not found")
    return trip


def trip_total(t: Trip) -> float | None:
    return round(sum(e.estimated for e in t.expenses)) if t.expenses else None


def trip_summary(t: Trip) -> dict:
    return {
        "id": t.id, "title": t.title, "start_city": t.start_city, "destination_id": t.destination_id,
        "destination_name": t.destination.name if t.destination else None,
        "start_date": t.start_date, "end_date": t.end_date, "travelers": t.travelers,
        "budget": t.budget, "currency": t.currency, "generated_by": t.generated_by,
        "status": trip_status(t), "estimated_total": trip_total(t), "created_at": t.created_at,
    }


def day_to_dict(d: ItineraryDay) -> dict:
    return {
        "id": d.id, "day_number": d.day_number, "title": d.title, "notes": d.notes,
        "activities": [
            {
                "id": a.id, "attraction_id": a.attraction_id, "slot": a.slot, "title": a.title,
                "description": a.description, "duration_hours": a.duration_hours,
                "estimated_cost": a.estimated_cost, "latitude": a.latitude, "longitude": a.longitude,
                "image_url": a.image_url or (a.attraction.image_url if getattr(a, "attraction", None) else ""),
                "position": a.position,
            }
            for a in d.activities
        ],
    }


def trip_detail(t: Trip) -> dict:
    return {
        "id": t.id, "title": t.title, "start_city": t.start_city, "destination_id": t.destination_id,
        "destination_name": t.destination.name if t.destination else None,
        "start_date": t.start_date, "end_date": t.end_date, "travelers": t.travelers, "budget": t.budget,
        "currency": t.currency, "travel_style": t.travel_style, "pace": t.pace, "transport": t.transport,
        "accommodation": t.accommodation, "interests": t.interests or [], "notes": t.notes,
        "overview": t.overview, "tips": t.tips or [], "weather_alternatives": t.weather_alternatives or [],
        "generated_by": t.generated_by, "status": trip_status(t),
        "days": [day_to_dict(d) for d in t.days],
        "expenses": [{"id": e.id, "category": e.category, "estimated": e.estimated, "actual": e.actual}
                     for e in t.expenses],
        "packing": [{"id": p.id, "label": p.label, "packed": p.packed} for p in t.packing_items],
        "created_at": t.created_at, "updated_at": t.updated_at,
    }


def replace_days(db: Session, trip: Trip, days: list[DayIO]) -> None:
    numbers = [d.day_number for d in days]
    dup = sorted({n for n in numbers if numbers.count(n) > 1})
    if dup:  # validate BEFORE touching the database
        raise HTTPException(status_code=422, detail=f"Duplicate day_number {dup[0]}")
    # Flush the deletion first: SQLAlchemy would otherwise INSERT before DELETE and hit the
    # (trip_id, day_number) unique constraint.
    trip.days.clear()
    db.flush()
    for d in sorted(days, key=lambda x: x.day_number):
        day = ItineraryDay(day_number=d.day_number, title=d.title, notes=d.notes)
        for i, a in enumerate(d.activities):
            attraction_id = a.attraction_id if a.attraction_id and db.get(Attraction, a.attraction_id) else None
            img = a.image_url
            if not img and attraction_id:
                attr = db.get(Attraction, attraction_id)
                img = attr.image_url if attr else ""
            day.activities.append(ItineraryActivity(
                attraction_id=attraction_id, position=i, slot=a.slot, title=a.title,
                description=a.description, duration_hours=a.duration_hours,
                estimated_cost=a.estimated_cost, latitude=a.latitude, longitude=a.longitude,
                image_url=img or "",
            ))
        trip.days.append(day)


def replace_expenses(db: Session, trip: Trip, expenses: list[ExpenseIO]) -> None:
    cats = [e.category for e in expenses]
    if len(cats) != len(set(cats)):
        raise HTTPException(status_code=422, detail="Each expense category may appear only once")
    trip.expenses.clear()
    db.flush()
    for e in expenses:
        trip.expenses.append(BudgetExpense(category=e.category, estimated=e.estimated, actual=e.actual))


def _params(data: TripCreate | TripUpdate) -> TripParams:
    return TripParams(
        start_city=data.start_city, start_date=data.start_date, end_date=data.end_date,
        travelers=data.travelers, budget=data.budget, travel_style=data.travel_style, pace=data.pace,
        transport=data.transport, accommodation=data.accommodation, interests=list(data.interests),
    )


def check_destination(db: Session, destination_id: int | None) -> Destination | None:
    if destination_id is None:
        return None
    dest = db.get(Destination, destination_id)
    if dest is None:
        raise HTTPException(status_code=422, detail=f"Unknown destination_id {destination_id}")
    return dest


def create_trip(db: Session, user: User, data: TripCreate) -> Trip:
    dest = check_destination(db, data.destination_id)
    trip = Trip(
        user_id=user.id, destination_id=data.destination_id, title=data.title, start_city=data.start_city,
        start_date=data.start_date, end_date=data.end_date, travelers=data.travelers, budget=data.budget,
        currency=data.currency, travel_style=data.travel_style, pace=data.pace, transport=data.transport,
        accommodation=data.accommodation, interests=data.interests, notes=data.notes,
        overview=data.overview, tips=data.tips, weather_alternatives=data.weather_alternatives,
        generated_by=data.generated_by,
    )
    db.add(trip)
    db.flush()

    days = data.days
    expenses = data.expenses
    p = _params(data)
    if dest is not None and (not days or not expenses):
        try:
            if not days:
                days = [DayIO(**d) for d in build_itinerary(dest, p)]
            if not expenses:
                cats = build_plan(dest, p)["budget"]["categories"]
                expenses = [ExpenseIO(category=k, estimated=v) for k, v in cats.items()]
        except ValueError:
            pass  # unsupported start city: leave empty rather than failing a manual trip
    replace_days(db, trip, days)
    replace_expenses(db, trip, expenses)
    if dest is not None:
        labels = packing_list(dest, p.days, p)
    else:
        labels = ["ID proof / tickets", "Phone and charger", "Basic medicines", "Reusable water bottle"]
    for label in labels:
        trip.packing_items.append(PackingItem(label=label))
    db.commit()
    db.refresh(trip)
    return trip


def budget_view(trip: Trip) -> dict:
    """Shape matches frontend BudgetView: categories/actual are {category: amount} dicts."""
    days = bud.trip_days(trip.start_date, trip.end_date)
    est = {e.category: round(e.estimated) for e in trip.expenses}
    act = {e.category: round(e.actual) for e in trip.expenses}
    result = bud.summarize(est, days=days, travelers=trip.travelers,
                           budget=trip.budget if trip.budget > 0 else None)
    alternatives = bud.cheaper_alternatives(result, trip.budget)
    warning = None
    if trip.budget > 0 and not result.get("within_budget", True):
        warning = (f"Estimated total {result['total']:,} exceeds your budget of {round(trip.budget):,} "
                   f"by {-result['difference']:,}.")
    return {
        "categories": est, "actual": act, "total": result["total"], "actual_total": sum(act.values()),
        "per_person": result["per_person"], "per_day": result["per_day"], "days": days,
        "travelers": trip.travelers, "daily": bud.daily_breakdown(result, days) if est else [],
        "alternatives": alternatives, "warning": warning,
        "within_budget": result.get("within_budget"), "difference": result.get("difference"),
        "budget": trip.budget, "is_estimate": True,
    }
