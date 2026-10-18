"""Transparent destination scoring. Total = 100 points across five documented components."""
from sqlalchemy.orm import Session

from .models import Destination
from .planner import TripParams, build_plan

WEIGHTS = {"budget_fit": 35, "interest_match": 30, "season_fit": 15, "duration_fit": 10, "style_fit": 10}


def _budget_points(total: float, budget: float) -> tuple[float, str]:
    if budget <= 0:
        return WEIGHTS["budget_fit"] * 0.5, "No budget given, so budget fit is neutral."
    ratio = total / budget
    if ratio <= 0.8:
        pts = WEIGHTS["budget_fit"]
    elif ratio <= 1.0:
        # linear drop from 100% of the points at ratio 0.8 to 90% at ratio 1.0
        pts = WEIGHTS["budget_fit"] * (1 - 0.5 * (ratio - 0.8))
    else:
        pts = max(0.0, WEIGHTS["budget_fit"] * 0.9 - (ratio - 1.0) * 80)
    if ratio <= 1.0:
        text = f"Estimated {round(total):,} is {round(ratio * 100)}% of your {round(budget):,} budget."
    else:
        text = f"Estimated {round(total):,} exceeds your {round(budget):,} budget by {round((ratio - 1) * 100)}%."
    return round(pts, 1), text


def _style_points(dest: Destination, style: str) -> tuple[float, str]:
    cats = set(dest.categories or [])
    full = WEIGHTS["style_fit"]
    if style == "adventure":
        ok = "adventure" in cats
    elif style in ("comfort", "luxury"):
        ok = bool(cats & {"romantic", "heritage"})
    else:  # budget: favour calmer, cheaper places
        ok = dest.crowd_level != "high" or dest.stay_per_night_inr <= 1300
    return (full if ok else full * 0.4), (f"Suits a {style} style." if ok else f"Only a partial match for a {style} style.")


HINT_BONUS = 8


def score_destination(
    dest: Destination, p: TripParams, climate_pref: str | None = None, hints: set[str] | None = None
) -> dict:
    plan = build_plan(dest, p)
    total = plan["budget"]["total"]
    b_pts, b_txt = _budget_points(total, p.budget)

    wanted = set(p.interests)
    have = set(dest.interests or []) | {t for a in dest.attractions for t in (a.tags or [])}
    matched = sorted(wanted & have)
    i_pts = WEIGHTS["interest_match"] * (len(matched) / len(wanted)) if wanted else WEIGHTS["interest_match"] * 0.5
    i_txt = f"Matches interests: {', '.join(matched)}." if matched else "No direct interest match in the dataset."

    in_season = p.start_date.month in (dest.best_months or [])
    s_pts = WEIGHTS["season_fit"] if in_season else WEIGHTS["season_fit"] * 0.3
    s_txt = "Travel month falls in the usual best season." if in_season else "Travel month is outside the usual best season."
    if climate_pref and climate_pref != dest.climate:
        s_pts *= 0.7
        s_txt += f" Climate is {dest.climate}, not {climate_pref}."

    gap = abs(p.days - dest.suggested_days)
    d_pts = WEIGHTS["duration_fit"] if gap <= 1 else WEIGHTS["duration_fit"] * 0.6 if gap <= 2 else WEIGHTS["duration_fit"] * 0.2
    d_txt = f"{p.days} days vs {dest.suggested_days} suggested."

    st_pts, st_txt = _style_points(dest, p.travel_style)

    bonus, bonus_txt = 0.0, ""
    matched_hints = sorted(set(hints or ()) & set(dest.categories or []))
    if matched_hints:
        bonus = HINT_BONUS
        bonus_txt = f"Matches the type of place you asked for ({', '.join(matched_hints)})."

    score = round(min(100.0, b_pts + i_pts + s_pts + d_pts + st_pts + bonus), 1)
    return {
        "destination_id": dest.id, "slug": dest.slug, "name": dest.name, "country": dest.country,
        "score": score, "within_budget": bool(p.budget <= 0 or total <= p.budget),
        "estimated_total": total, "transport": plan["transport"],
        "breakdown": {
            "budget_fit": {"points": b_pts, "max": WEIGHTS["budget_fit"], "reason": b_txt},
            "interest_match": {"points": round(i_pts, 1), "max": WEIGHTS["interest_match"], "reason": i_txt},
            "season_fit": {"points": round(s_pts, 1), "max": WEIGHTS["season_fit"], "reason": s_txt},
            "duration_fit": {"points": round(d_pts, 1), "max": WEIGHTS["duration_fit"], "reason": d_txt},
            "style_fit": {"points": round(st_pts, 1), "max": WEIGHTS["style_fit"], "reason": st_txt},
            **({"place_type_bonus": {"points": bonus, "max": HINT_BONUS, "reason": bonus_txt}} if bonus else {}),
        },
        "data_source": "sample dataset (indicative estimates, not live prices)",
    }


def recommend(
    db: Session, p: TripParams, limit: int = 3, climate_pref: str | None = None, hints: set[str] | None = None
) -> list[dict]:
    """Score every seeded destination, return the top ones (in-budget results ranked first)."""
    results = []
    for dest in db.query(Destination).all():
        try:
            results.append(score_destination(dest, p, climate_pref, hints))
        except ValueError:
            continue  # e.g. unsupported transport for this pair
    results.sort(key=lambda r: (not r["within_budget"], -r["score"]))
    return results[:limit]
