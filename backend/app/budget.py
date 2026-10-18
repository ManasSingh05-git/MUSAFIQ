"""Pure budget-calculation functions (no database access, easy to unit test).

All figures are ESTIMATES in the trip currency units supplied by the caller (seed data is in INR).
"""
import math

CATEGORIES = [
    "transport",
    "accommodation",
    "food",
    "activities",
    "local_transport",
    "shopping_misc",
    "emergency_buffer",
]

STYLE_STAY = {"budget": 0.85, "comfort": 1.8, "luxury": 3.5, "adventure": 1.0}
STYLE_FOOD = {"budget": 0.9, "comfort": 1.3, "luxury": 2.2, "adventure": 1.0}
ACCOMMODATION_STAY = {"hostel": 0.55, "budget": 1.0, "hotel": 1.8, "resort": 3.2}

MISC_RATE = 0.08  # shopping & miscellaneous: 8% of core costs
BUFFER_RATE = 0.10  # emergency buffer: 10% of core costs
PEOPLE_PER_ROOM = 2


def trip_days(start, end) -> int:
    """Inclusive number of days between two dates."""
    days = (end - start).days + 1
    if days < 1:
        raise ValueError("end date must not be before start date")
    return days


def rooms_needed(travelers: int) -> int:
    return max(1, math.ceil(travelers / PEOPLE_PER_ROOM))


def calculate_budget(
    *,
    days: int,
    travelers: int,
    stay_per_night: float,
    food_per_day: float,
    local_per_day: float,
    activities_per_day: float,
    transport_round_trip_per_person: float,
    activity_fees_per_person: float = 0.0,
    travel_style: str = "budget",
    accommodation: str | None = None,
) -> dict:
    """Return per-category estimates, totals and per-person/daily figures."""
    if days < 1 or travelers < 1:
        raise ValueError("days and travelers must be at least 1")

    nights = max(days - 1, 0)
    stay_factor = ACCOMMODATION_STAY.get(accommodation or "", None)
    if stay_factor is None:
        stay_factor = STYLE_STAY.get(travel_style, 1.0)
    food_factor = STYLE_FOOD.get(travel_style, 1.0)

    transport = transport_round_trip_per_person * travelers
    accommodation_cost = stay_per_night * stay_factor * rooms_needed(travelers) * nights
    food = food_per_day * food_factor * travelers * days
    activities = (activity_fees_per_person + activities_per_day * days) * travelers
    local = local_per_day * travelers * days

    core = transport + accommodation_cost + food + activities + local
    misc = core * MISC_RATE
    buffer = core * BUFFER_RATE

    categories = {
        "transport": transport,
        "accommodation": accommodation_cost,
        "food": food,
        "activities": activities,
        "local_transport": local,
        "shopping_misc": misc,
        "emergency_buffer": buffer,
    }
    categories = {k: round(v) for k, v in categories.items()}
    return summarize(categories, days=days, travelers=travelers)


def summarize(categories: dict, *, days: int, travelers: int, budget: float | None = None) -> dict:
    """Totals derived from already-chosen category amounts (used after manual edits too)."""
    total = sum(categories.values())
    result = {
        "categories": categories,
        "total": total,
        "per_person": round(total / travelers),
        "per_day": round(total / days),
        "days": days,
        "travelers": travelers,
        "is_estimate": True,
    }
    if budget is not None:
        result.update(budget_status(total, budget))
    return result


def budget_status(total: float, budget: float) -> dict:
    difference = round(budget - total)
    return {
        "budget": budget,
        "difference": difference,  # positive = under budget
        "within_budget": total <= budget,
        "utilisation_pct": round(100 * total / budget, 1) if budget > 0 else None,
    }


def cheaper_alternatives(result: dict, budget: float) -> list[str]:
    """Rule-based suggestions, only produced when the estimate exceeds the budget."""
    total = result["total"]
    if budget <= 0 or total <= budget:
        return []
    over = total - budget
    c = result["categories"]
    tips: list[str] = []
    if c.get("accommodation", 0) > 0.25 * total:
        tips.append(f"Switch to hostels or shared rooms; accommodation is {round(100 * c['accommodation'] / total)}% of the estimate.")
    if c.get("transport", 0) > 0.2 * total:
        tips.append("Choose train or bus instead of flying, or pick a destination closer to your start city.")
    if c.get("food", 0) > 0.25 * total:
        tips.append("Eat at local thali places and street stalls for most meals.")
    tips.append("Shorten the trip by one day or travel on weekdays when stays are cheaper.")
    tips.append(f"You need to cut about {round(over)} to fit the budget.")
    return tips


def daily_breakdown(result: dict, days: int) -> list[dict]:
    """Spread non-transport, non-buffer spending evenly; put transport on first/last day.

    This is a transparent simplification for charting, not a booking schedule.
    """
    c = result["categories"]
    per_day_base = (
        c.get("accommodation", 0) + c.get("food", 0) + c.get("activities", 0)
        + c.get("local_transport", 0) + c.get("shopping_misc", 0)
    ) / days
    out = []
    for d in range(1, days + 1):
        extra = 0.0
        if d == 1 or d == days:
            extra = c.get("transport", 0) / 2 if days > 1 else c.get("transport", 0)
        out.append({"day": d, "amount": round(per_day_base + extra)})
    return out
