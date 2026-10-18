import html
import io

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from .. import services as svc
from ..ai import build_for_destination, check_rate_limit, llm_available
from ..database import get_db
from ..models import Destination, PackingItem, Trip, User
from ..planner import TripParams
from ..recommender import recommend
from ..schemas import (
    BudgetUpdate, DayIO, GenerateIn, PackingIO, TripCreate, TripDetail, TripSummary, TripUpdate,
)
from ..security import get_current_user
from ..travel import resolve_city

router = APIRouter(prefix="/api/trips", tags=["trips"])


# ---------- generation (does not save; the client saves with POST /api/trips) ----------
@router.post("/generate")
def generate_trip(data: GenerateIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if resolve_city(data.start_city) is None:
        raise HTTPException(status_code=422, detail="Unsupported start city. Pick one from the list.")
    if data.use_llm and llm_available() and not check_rate_limit(user.id):
        raise HTTPException(status_code=429, detail="Too many AI requests. Please wait a minute.")
    p = TripParams(
        start_city=data.start_city, start_date=data.start_date, end_date=data.end_date,
        travelers=data.travelers, budget=data.budget, travel_style=data.travel_style, pace=data.pace,
        transport=data.transport, accommodation=data.accommodation, interests=data.interests,
        avoid_crowds=data.avoid_crowds,
    )
    recs: list[dict] = []
    try:
        if data.destination_id is not None:
            dest = db.get(Destination, data.destination_id)
            if dest is None:
                raise HTTPException(status_code=422, detail="Destination not found")
        else:
            recs = recommend(db, p, limit=3)
            if not recs:
                raise HTTPException(status_code=422, detail="No destination could be scored for these inputs")
            dest = db.get(Destination, recs[0]["destination_id"])
        payload, plan, source, note, _ = build_for_destination(
            dest, p, {}, f"Plan a trip. Interests: {', '.join(data.interests)}", use_llm=data.use_llm)
    except ValueError as e:  # estimate_transport / date validation
        raise HTTPException(status_code=422, detail=str(e))

    extra = []
    if data.dietary.strip():
        payload["notes"] = f"Dietary/accessibility: {data.dietary.strip()}"
        extra.append("Dietary/accessibility notes are saved with the trip but are not used to filter places.")
    return {
        "trip": payload, "budget": plan["budget"], "transport": plan["transport"],
        "recommendations": recs, "source": source,
        "note": " ".join([n for n in [note, *extra] if n]) or None,
        "data_disclaimer": "Prices come from a sample dataset and are estimates, not live fares or room rates.",
    }


# ---------- CRUD ----------
@router.post("", response_model=TripDetail, status_code=201)
def create_trip(data: TripCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.trip_detail(svc.create_trip(db, user, data))


@router.get("", response_model=list[TripSummary])
def list_trips(
    status: str | None = None, q: str | None = None,
    user: User = Depends(get_current_user), db: Session = Depends(get_db),
):
    trips = db.query(Trip).filter(Trip.user_id == user.id).order_by(Trip.start_date.desc()).all()
    out = [svc.trip_summary(t) for t in trips]
    if status:
        out = [t for t in out if t["status"] == status]
    if q:
        ql = q.lower()
        out = [t for t in out if ql in t["title"].lower() or ql in (t["destination_name"] or "").lower()]
    return out


@router.get("/{trip_id}", response_model=TripDetail)
def get_trip(trip_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.trip_detail(svc.get_owned_trip(db, user, trip_id))


@router.put("/{trip_id}", response_model=TripDetail)
def update_trip(trip_id: int, data: TripUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = svc.get_owned_trip(db, user, trip_id)
    svc.check_destination(db, data.destination_id)
    for field in ("title", "start_city", "destination_id", "start_date", "end_date", "travelers", "budget",
                  "currency", "travel_style", "pace", "transport", "accommodation", "interests", "notes"):
        setattr(trip, field, getattr(data, field))
    for field in ("overview", "tips", "weather_alternatives"):
        value = getattr(data, field)
        if value is not None:
            setattr(trip, field, value)
    db.commit()
    db.refresh(trip)
    return svc.trip_detail(trip)


@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = svc.get_owned_trip(db, user, trip_id)
    db.delete(trip)
    db.commit()


@router.post("/{trip_id}/duplicate", response_model=TripDetail, status_code=201)
def duplicate_trip(trip_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    src = svc.get_owned_trip(db, user, trip_id)
    d = svc.trip_detail(src)
    copy = TripCreate(
        title=f"{src.title} (copy)"[:160], start_city=src.start_city, destination_id=src.destination_id,
        start_date=src.start_date, end_date=src.end_date, travelers=src.travelers, budget=src.budget,
        currency="INR", travel_style=src.travel_style, pace=src.pace, transport=src.transport,
        accommodation=src.accommodation, interests=src.interests or [], notes=src.notes,
        overview=src.overview, tips=src.tips or [], weather_alternatives=src.weather_alternatives or [],
        generated_by=src.generated_by,
        days=[DayIO(**{**day, "id": None, "activities": [{**a, "id": None} for a in day["activities"]]})
              for day in d["days"]],
        expenses=[{"category": e["category"], "estimated": e["estimated"], "actual": 0} for e in d["expenses"]],
    )
    new = svc.create_trip(db, user, copy)
    return svc.trip_detail(new)


# ---------- itinerary ----------
@router.get("/{trip_id}/itinerary", response_model=list[DayIO])
def get_itinerary(trip_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.trip_detail(svc.get_owned_trip(db, user, trip_id))["days"]


@router.put("/{trip_id}/itinerary", response_model=list[DayIO])
def put_itinerary(trip_id: int, days: list[DayIO], user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = svc.get_owned_trip(db, user, trip_id)
    svc.replace_days(db, trip, days)
    db.commit()
    db.refresh(trip)
    return svc.trip_detail(trip)["days"]


# ---------- budget ----------
@router.get("/{trip_id}/budget")
def get_budget(trip_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.budget_view(svc.get_owned_trip(db, user, trip_id))


@router.put("/{trip_id}/budget")
def put_budget(trip_id: int, data: BudgetUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = svc.get_owned_trip(db, user, trip_id)
    svc.replace_expenses(db, trip, data.expenses)
    db.commit()
    db.refresh(trip)
    return svc.budget_view(trip)


# ---------- packing checklist ----------
@router.get("/{trip_id}/packing", response_model=list[PackingIO])
def get_packing(trip_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return svc.trip_detail(svc.get_owned_trip(db, user, trip_id))["packing"]


@router.put("/{trip_id}/packing", response_model=list[PackingIO])
def put_packing(trip_id: int, items: list[PackingIO], user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = svc.get_owned_trip(db, user, trip_id)
    if len(items) > 200:
        raise HTTPException(status_code=422, detail="Too many packing items")
    trip.packing_items.clear()
    db.flush()
    for it in items:
        trip.packing_items.append(PackingItem(label=it.label, packed=it.packed))
    db.commit()
    db.refresh(trip)
    return svc.trip_detail(trip)["packing"]


# ---------- PDF export ----------
def build_pdf(d: dict, budget: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    esc = lambda s: html.escape(str(s or ""))  # noqa: E731  (Paragraph parses XML-like markup)
    styles = getSampleStyleSheet()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=16 * mm, bottomMargin=16 * mm, title=d["title"])
    s = []
    s.append(Paragraph(esc(d["title"]), styles["Title"]))
    s.append(Paragraph(
        f"{esc(d['start_city'])} to {esc(d['destination_name'] or 'custom trip')} | "
        f"{d['start_date']} to {d['end_date']} | {d['travelers']} traveller(s)", styles["Normal"]))
    if d["overview"]:
        s += [Spacer(1, 6), Paragraph(esc(d["overview"]), styles["Normal"])]
    s.append(Spacer(1, 8))
    for day in d["days"]:
        s.append(Paragraph(f"Day {day['day_number']}: {esc(day['title'])}", styles["Heading3"]))
        rows = [["Time", "Activity", "Hours", "Est. cost (Rs.)"]]
        for a in day["activities"]:
            rows.append([a["slot"].title(), Paragraph(esc(a["title"]), styles["BodyText"]),
                         f"{a['duration_hours']:g}", f"{a['estimated_cost']:,.0f}"])
        t = Table(rows, colWidths=[28 * mm, 90 * mm, 18 * mm, 32 * mm], repeatRows=1)
        t.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f4d45")),
                               ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                               ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                               ("VALIGN", (0, 0), (-1, -1), "TOP")]))
        s += [t, Spacer(1, 6)]
    s.append(Paragraph("Estimated budget", styles["Heading2"]))
    rows = [["Category", "Estimated (Rs.)"]] + [
        [k.replace("_", " ").title(), f"{v:,.0f}"] for k, v in budget["categories"].items()]
    rows.append(["TOTAL", f"{budget['total']:,.0f}"])
    rows.append(["Per person", f"{budget['per_person']:,.0f}"])
    t = Table(rows, colWidths=[90 * mm, 40 * mm])
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                           ("FONTNAME", (0, -2), (-1, -1), "Helvetica-Bold")]))
    s += [t, Spacer(1, 8)]
    if d["tips"]:
        s.append(Paragraph("Practical tips", styles["Heading2"]))
        for tip in d["tips"]:
            s.append(Paragraph("- " + esc(tip), styles["Normal"]))
    s += [Spacer(1, 10), Paragraph(
        "<i>Generated by MUSAFIQ AI — Intelligent Travel & Trip Planning. All prices are indicative estimates from sample data.</i>", styles["Normal"])]
    doc.build(s)
    return buf.getvalue()


@router.get("/{trip_id}/export.pdf")
def export_pdf(trip_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trip = svc.get_owned_trip(db, user, trip_id)
    pdf = build_pdf(svc.trip_detail(trip), svc.budget_view(trip))
    return Response(content=pdf, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="trip-{trip.id}.pdf"'})
