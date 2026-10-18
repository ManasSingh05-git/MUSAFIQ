"""Deterministic itinerary builder and packing-list generator.

Used (a) directly by the trip generator, (b) by the recommender to price candidate destinations and
(c) as the grounded base that the LLM is asked to explain/refine.
"""
from dataclasses import dataclass, field
from datetime import date

from . import budget as bud
from .models import Attraction, Destination
from .travel import estimate_transport

SLOTS = ("morning", "afternoon", "evening")
PACE_PER_DAY = {"relaxed": 2, "balanced": 3, "packed": 3}  # packed = 3 slots, longer total hours
PACE_MAX_HOURS = {"relaxed": 5, "balanced": 7, "packed": 10}


@dataclass
class TripParams:
    start_city: str
    start_date: date
    end_date: date
    travelers: int = 1
    budget: float = 0
    travel_style: str = "budget"
    pace: str = "balanced"
    transport: str = "train"
    accommodation: str | None = None
    interests: list[str] = field(default_factory=list)
    avoid_crowds: bool = False

    @property
    def days(self) -> int:
        return bud.trip_days(self.start_date, self.end_date)


def _score_attraction(a: Attraction, interests: list[str], avoid_crowds: bool) -> float:
    tags = set(a.tags or [])
    score = len(tags & set(interests)) * 2.0
    if avoid_crowds and a.crowded:
        score -= 3.0
    if a.crowded:
        score -= 0.25  # tiny tie-break against crowds
    return score


def build_itinerary(dest: Destination, p: TripParams) -> list[dict]:
    """Return day dicts with activities. Uses only real attractions from the dataset;
    when the dataset runs out, free 'local exploration' blocks without coordinates are added."""
    days = p.days
    ranked = sorted(
        dest.attractions, key=lambda a: _score_attraction(a, p.interests, p.avoid_crowds), reverse=True
    )
    per_day = PACE_PER_DAY.get(p.pace, 3)
    max_hours = PACE_MAX_HOURS.get(p.pace, 7)
    pool = list(ranked)
    out: list[dict] = []

    for d in range(1, days + 1):
        # Arrival day: afternoon/evening only. Departure day: morning only.
        allowed = list(SLOTS)
        if days > 1 and d == 1:
            allowed = ["afternoon", "evening"]
        elif days > 1 and d == days:
            allowed = ["morning"]
        count = min(per_day, len(allowed))

        chosen: list[Attraction] = []
        hours = 0.0
        for a in list(pool):
            if len(chosen) >= count:
                break
            if hours + a.duration_hours > max_hours and chosen:
                continue
            chosen.append(a)
            hours += a.duration_hours
            pool.remove(a)

        # Assign chosen attractions to slots, preferring their best_time
        slot_map: dict[str, Attraction] = {}
        for a in sorted(chosen, key=lambda x: SLOTS.index(x.best_time) if x.best_time in SLOTS else 1):
            slot = a.best_time if a.best_time in allowed and a.best_time not in slot_map else None
            if slot is None:
                slot = next((s for s in allowed if s not in slot_map), None)
            if slot:
                slot_map[slot] = a

        activities = []
        for slot in allowed:
            if slot in slot_map:
                a = slot_map[slot]
                activities.append({
                    "slot": slot, "title": a.name, "description": a.description,
                    "image_url": getattr(a, "image_url", "") or "",
                    "duration_hours": a.duration_hours, "estimated_cost": a.entry_fee_inr,
                    "attraction_id": a.id, "latitude": a.latitude, "longitude": a.longitude,
                })
            elif len(activities) < count:
                slot_label = {
                    "morning": "Morning leisure & neighborhood walk",
                    "afternoon": "Afternoon local café & market stroll",
                    "evening": "Free time: local food walk and relaxed exploration",
                }.get(slot, "Free time and relaxed exploration")
                activities.append({
                    "slot": slot,
                    "title": slot_label,
                    "description": f"Unstructured time around {dest.name} for local meals and wandering.",
                    "duration_hours": 2.0, "estimated_cost": 0,
                    "attraction_id": None, "latitude": None, "longitude": None,
                })
        for i, act in enumerate(activities):
            act["position"] = i
        title = {1: "Arrival & first impressions"}.get(d, f"Explore {dest.name}")
        if days > 1 and d == days:
            title = "Final morning & departure"
        out.append({"day_number": d, "title": title, "notes": "", "activities": activities})
    return out


def itinerary_fees_per_person(days_list: list[dict]) -> float:
    return sum(a.get("estimated_cost", 0) or 0 for d in days_list for a in d["activities"])


def build_plan(dest: Destination, p: TripParams) -> dict:
    """Itinerary + transport + budget for one destination."""
    days_list = build_itinerary(dest, p)
    transport = estimate_transport(p.start_city, dest.latitude, dest.longitude, p.transport, p.travelers)
    result = bud.calculate_budget(
        days=p.days, travelers=p.travelers,
        stay_per_night=dest.stay_per_night_inr, food_per_day=dest.food_per_day_inr,
        local_per_day=dest.local_transport_per_day_inr, activities_per_day=dest.activities_per_day_inr,
        transport_round_trip_per_person=transport["round_trip_per_person"],
        activity_fees_per_person=itinerary_fees_per_person(days_list),
        travel_style=p.travel_style, accommodation=p.accommodation,
    )
    if p.budget > 0:
        result.update(bud.budget_status(result["total"], p.budget))
        result["alternatives"] = bud.cheaper_alternatives(result, p.budget)
    result["daily"] = bud.daily_breakdown(result, p.days)
    return {"days": days_list, "transport": transport, "budget": result}


def practical_tips(dest: Destination, p: TripParams) -> list[str]:
    tips = [
        dest.practical_info,
        "All costs are indicative estimates from sample data, not live prices. Verify fares and room rates before travelling.",
        "TourPlan AI is a planner only; it does not book tickets, hotels or activities.",
    ]
    if dest.crowd_level == "high":
        tips.append("This destination gets crowded; weekdays and early mornings are usually calmer.")
    if p.start_date.month not in (dest.best_months or []):
        tips.append(f"Your travel month is outside the usual best months for {dest.name}; check seasonal conditions.")
    return [t for t in tips if t]


def weather_alternatives(dest: Destination) -> list[str]:
    indoor = [a.name for a in dest.attractions if any(t in (a.tags or []) for t in ("culture", "history", "food", "shopping"))]
    alts = []
    if indoor:
        alts.append("If it rains, swap outdoor viewpoints for indoor options such as: " + ", ".join(indoor[:3]) + ".")
    alts.append("If a day is lost to weather or delays, shift its top activity to the next morning and drop the lowest-priority one.")
    return alts


def packing_list(dest: Destination, days: int, p: TripParams) -> list[str]:
    items = ["ID proof / tickets (printed or offline)", "Phone, charger and power bank", "Basic medicines and first-aid kit",
             "Reusable water bottle", f"{min(days, 7) + 1} sets of clothes (re-wear or laundry for longer trips)"]
    if dest.climate == "cool":
        items += ["Warm jacket and layers", "Woollen cap / gloves if visiting in winter", "Moisturiser and lip balm"]
    if dest.climate in ("tropical", "warm"):
        items += ["Sunscreen and sunglasses", "Hat or cap", "Light cotton clothing"]
    if "beach" in (dest.categories or []):
        items += ["Swimwear and quick-dry towel", "Flip-flops"]
    if "adventure" in p.interests or "adventure" in (dest.categories or []):
        items += ["Sturdy walking shoes", "Small daypack"]
    if "photography" in p.interests:
        items += ["Camera, spare batteries and memory cards"]
    if dest.country != "India":
        items += ["Passport and visa documents", "Travel insurance papers", "Foreign currency / international card"]
    if dest.slug in ("lonavala", "munnar", "manali", "rishikesh", "goa"):
        items += ["Raincoat or umbrella (if monsoon season)"]
    seen, out = set(), []
    for i in items:
        if i not in seen:
            seen.add(i)
            out.append(i)
    return out
