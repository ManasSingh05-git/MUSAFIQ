"""Single source of project facts used by every generated document.

Facts that exist in code (endpoints, test names, seed counts, budget constants) are READ FROM THE CODE,
so the documents cannot drift from the implementation.
"""
import ast
import importlib.util
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from app import budget as bud  # noqa: E402  (stdlib-only module)
from app import travel  # noqa: E402


def _load(path: pathlib.Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


seed = _load(BACKEND / "app" / "seed_data.py", "seed_data_doc")
DESTS = seed.DESTINATIONS
N_DEST = len(DESTS)
N_ATTR = sum(len(d["attractions"]) for d in DESTS)
N_CITIES = len(seed.ORIGIN_CITIES)
CITIES = ", ".join(seed.ORIGIN_CITIES)

STUDENT = "[Student name(s)]"
ROLL = "[Roll no(s)]"
FACULTY = "[Faculty mentor]"
INSTITUTE = "[Institute / department name]"
DATE = "[Submission date]"
PROJECT = "TourPlan AI: Smart Travel & Trip Planning System"


# ---------------------------------------------------------------- read facts from code
def endpoints() -> list[tuple[str, str, str]]:
    out = []
    for f in sorted((BACKEND / "app" / "routers").glob("*.py")):
        src = f.read_text(encoding="utf-8")
        m = re.search(r'APIRouter\(prefix="([^"]*)"', src)
        prefix = m.group(1) if m else ""
        for dm in re.finditer(r'@router\.(get|post|put|delete)\("([^"]*)"(?:[^)]*)\)\s*\n(?:async )?def (\w+)', src):
            method, path, fn = dm.groups()
            out.append((method.upper(), prefix + path, f.stem + "." + fn))
    return out


def tests() -> list[tuple[str, str]]:
    out = []
    for f in sorted((BACKEND / "tests").glob("test_*.py")):
        tree = ast.parse(f.read_text(encoding="utf-8"))
        for node in tree.body:
            if isinstance(node, ast.FunctionDef) and node.name.startswith("test_"):
                out.append((f.name, node.name))
    return out


def code_excerpt(relpath: str, func: str, max_lines: int = 40) -> str:
    src = (BACKEND / relpath).read_text(encoding="utf-8")
    m = re.search(rf"^def {func}\(.*?(?=^\S)", src, re.S | re.M)
    text = (m.group(0) if m else src[:2000]).rstrip()
    lines = text.splitlines()[:max_lines]
    return "\n".join(lines)


WEIGHTS = {}
_rec = (BACKEND / "app" / "recommender.py").read_text(encoding="utf-8")
_m = re.search(r"WEIGHTS = (\{.*?\})", _rec)
if _m:
    WEIGHTS = ast.literal_eval(_m.group(1))
HINT_BONUS = int(re.search(r"HINT_BONUS = (\d+)", _rec).group(1))

# Worked example (identical to backend/tests/test_budget.py::test_budget_hand_calculated_values)
EXAMPLE = bud.calculate_budget(
    days=4, travelers=3, stay_per_night=1000, food_per_day=500, local_per_day=200, activities_per_day=100,
    transport_round_trip_per_person=1000, activity_fees_per_person=300, travel_style="budget",
)

# Illustrative demo (Mumbai, 3 travellers, 4 days, train) for Lonavala & Hampi, EXCLUDING attraction entry fees
def demo_total(slug: str) -> dict:
    d = next(x for x in DESTS if x["slug"] == slug)
    tr = travel.estimate_transport("Mumbai", d["lat"], d["lon"], "train", 3)
    r = bud.calculate_budget(
        days=4, travelers=3, stay_per_night=d["stay"], food_per_day=d["food"], local_per_day=d["local"],
        activities_per_day=d["activities"], transport_round_trip_per_person=tr["round_trip_per_person"],
        activity_fees_per_person=0, travel_style="budget")
    r["transport_info"] = tr
    return r


DEMO = demo_total("lonavala")

# ---------------------------------------------------------------- requirements
FR = [
    ("FR-01", "Register with name, email and password (min 8 chars); duplicate emails rejected; passwords stored as bcrypt hashes."),
    ("FR-02", "Log in and receive a signed JWT; log out clears the token; protected routes require it."),
    ("FR-03", "Store a profile with home city, travel style and interests; use them as defaults."),
    ("FR-04", f"Browse {N_DEST} seeded destinations; search by name, country or region; filter by category, interest, climate, month and daily cost; sort."),
    ("FR-05", "View a destination: description, practical information, best months, indicative costs, attractions with fees and durations, map pins."),
    ("FR-06", "Save and remove favourite destinations (per user, idempotent)."),
    ("FR-07", "Generate a trip from a form (start city, destination or 'suggest', dates, travellers, budget, style, pace, transport, accommodation, interests)."),
    ("FR-08", "Rank destinations with a transparent 100-point score and show the reason for each component."),
    ("FR-09", "Produce a day-by-day itinerary (morning/afternoon/evening) from the attraction dataset, with durations and fees."),
    ("FR-10", "Estimate transport, accommodation, food, activities, local transport, shopping/misc and an emergency buffer; show total, per person and per day."),
    ("FR-11", "Warn when the estimate exceeds the budget and propose cheaper alternatives; never silently exceed the budget."),
    ("FR-12", "Save a generated or manual trip; list, search and filter trips by status; open, edit details, duplicate and delete (with confirmation)."),
    ("FR-13", "Edit an itinerary: change fields, add, remove and reorder activities; persist changes."),
    ("FR-14", "Edit budget categories and actual spend; recompute totals immediately; show donut, daily and estimate-versus-actual charts."),
    ("FR-15", "Show trip stops on an OpenStreetMap map with a route line, with map/list switching and a tile-failure notice."),
    ("FR-16", "Packing checklist generated from climate, destination type and interests; items can be ticked, added and removed; progress shown."),
    ("FR-17", "Export a trip itinerary and budget as a PDF; copy a plain-text trip summary."),
    ("FR-18", "AI assistant on every page: extracts requirements from natural language, asks for missing details, recommends, plans, and refines ('cheaper', 'more adventure')."),
    ("FR-19", "Use a configured LLM only to explain a plan grounded in dataset facts; otherwise a rule-based fallback, always labelled as such."),
    ("FR-20", "Persist chat conversations; allow deleting a conversation."),
    ("FR-21", "Optional live weather and currency conversion with clearly labelled fallbacks."),
    ("FR-22", "Plane-flight page transition with a setting to disable it and automatic respect for reduced-motion preferences."),
]
NFR = [
    ("NFR-01 Security", "bcrypt password hashing; JWT (HS256) with expiry; per-user authorisation returning 404 for other users' resources; secrets only in backend environment variables; CORS allow-list."),
    ("NFR-02 Validation", "All inputs validated by Pydantic (types, ranges, enums, date order, coordinate pairs); meaningful 4xx messages; generic 500 without internals."),
    ("NFR-03 Honesty", "Prices are labelled as estimates from sample data; fallback AI output is labelled rule-based; the app never claims to book anything."),
    ("NFR-04 Reliability", "External services (LLM, weather, FX, map tiles) are optional and fail gracefully; the core flow works fully offline from seeded data."),
    ("NFR-05 Performance", "Single-process SQLite deployment suited to a demo; no heavy computation (scoring 12 destinations per request)."),
    ("NFR-06 Usability", "Responsive layout (mobile, tablet, desktop); loading skeletons, empty and error states; toast feedback; confirmation before destructive actions."),
    ("NFR-07 Accessibility", "Labelled controls, keyboard operation, visible focus ring, aria roles for tabs and progress, skip link, reduced-motion support."),
    ("NFR-08 Maintainability", "Modular backend (routers / services / domain engine / AI layer), typed frontend, pure functions for budget and travel logic."),
    ("NFR-09 Portability", "Runs on Windows, macOS and Linux with Python 3.11+ and Node 18+; no external database server."),
    ("NFR-10 Testability", "Pure-function budget and travel modules, API tests with an isolated SQLite file, mocked LLM responses."),
]
USE_CASES = [
    ("UC-01 Register / log in", "Guest", "Submits name, email, password. System validates, hashes the password, returns a token. Alternate: duplicate email (409), invalid input (422), wrong credentials (401)."),
    ("UC-02 Browse and filter destinations", "Guest / User", "Searches and filters the catalogue. Alternate: no match shows an empty state with a clear-filters action."),
    ("UC-03 Generate trip plan", "User", "Enters requirements. System validates, scores destinations (or uses the chosen one), builds itinerary and budget, optionally adds an LLM explanation, labels the source. Alternate: unsupported city, over-budget warning."),
    ("UC-04 Edit and save itinerary", "User", "Changes, adds, removes, reorders activities and saves. System validates and persists, then reloads."),
    ("UC-05 Edit budget", "User", "Changes estimates and actual spend; totals update instantly; saving persists them."),
    ("UC-06 Manage trips", "User", "Lists, searches, filters, opens, duplicates, deletes (after confirmation) trips."),
    ("UC-07 Export PDF", "User", "Requests the PDF; system renders itinerary and budget with an estimate disclaimer."),
    ("UC-08 Chat with AI assistant", "User", "Describes the trip in natural language; system extracts requirements, asks for missing ones, returns a plan that can be saved as a trip."),
    ("UC-09 Manage favourites and preferences", "User", "Toggles favourites; edits home city, style and interests."),
]
STACK = [
    ("Frontend framework", "React 18 + Vite + TypeScript", "Component model, fast dev server, static typing catches data-shape mistakes."),
    ("Styling", "Tailwind CSS 3", "Utility classes give a consistent glassmorphism design system quickly."),
    ("Motion", "Framer Motion", "Declarative animation for counters, card entrances, rings and the plane transition."),
    ("Routing", "React Router 6", "Real routes and back-button support."),
    ("Maps", "React-Leaflet + OpenStreetMap", "Free, open tiles; works without an API key."),
    ("Charts", "Recharts", "Donut and bar charts for the budget."),
    ("Backend", "Python + FastAPI", "Typed endpoints, automatic OpenAPI/Swagger documentation."),
    ("Validation", "Pydantic v2", "Declarative request validation and response models."),
    ("Database", "SQLAlchemy 2 + SQLite", "Relational schema with constraints; zero-setup persistence."),
    ("Security", "bcrypt + PyJWT", "Salted password hashing and signed, expiring tokens."),
    ("AI", "Google Gemini REST API (optional) + rule-based fallback", "Configurable provider; the app works without a key."),
    ("PDF", "ReportLab", "Server-side itinerary export."),
    ("Testing", "pytest + FastAPI TestClient; Vitest", "Backend API/unit tests; frontend helper tests."),
]
LIMITATIONS = [
    f"All destination data is a small hand-written sample ({N_DEST} destinations, {N_ATTR} attractions). Costs are indicative estimates, not live prices; coordinates of attractions are approximate.",
    f"Transport estimates exist only for {N_CITIES} start cities ({CITIES}) and use straight-line distance with fixed per-km rates.",
    "The assistant's requirement extraction is rule-based (English keywords and patterns); unusual phrasing may be missed, in which case it asks follow-up questions.",
    "Dietary and accessibility notes are saved with a trip but are not used to filter places.",
    "The AI rate limiter is in memory (single process) and resets on restart.",
    "The JWT is kept in browser localStorage, which is exposed to cross-site-scripting if the front end were compromised; httpOnly cookies would be stronger.",
    "The database is created with create_all and seeded on first start; there are no migrations.",
    "No real destination photographs are bundled; a generated illustration is shown unless the user adds licensed images.",
    "Notifications and trip reminders are not implemented. Currency is INR only for trips.",
    "The application does not book flights, hotels or tickets.",
]
FUTURE = [
    "Alembic migrations and PostgreSQL for multi-user deployment.",
    "httpOnly cookie sessions with CSRF protection; refresh tokens.",
    "Live pricing integrations (rail, flight and hotel APIs) clearly separated from estimates.",
    "Geocoding and a larger, curated attraction dataset; real opening hours.",
    "Redis-backed rate limiting; streaming LLM responses.",
    "Collaborative trips, shared expense splitting and offline (PWA) support.",
    "Reminder emails or push notifications.",
]
REFERENCES = [
    "FastAPI documentation. https://fastapi.tiangolo.com",
    "SQLAlchemy 2.0 documentation. https://docs.sqlalchemy.org",
    "Pydantic documentation. https://docs.pydantic.dev",
    "React documentation. https://react.dev",
    "Vite documentation. https://vite.dev",
    "Tailwind CSS documentation. https://tailwindcss.com/docs",
    "Leaflet documentation. https://leafletjs.com",
    "OpenStreetMap copyright and licence. https://www.openstreetmap.org/copyright",
    "Recharts documentation. https://recharts.org",
    "Motion (Framer Motion) documentation. https://motion.dev",
    "Open-Meteo weather API. https://open-meteo.com",
    "Frankfurter currency API. https://www.frankfurter.app",
    "Google Gemini API documentation. https://ai.google.dev/gemini-api/docs",
    "Jones, M., Bradley, J., Sakimura, N. RFC 7519: JSON Web Token (JWT). https://datatracker.ietf.org/doc/html/rfc7519",
    "OWASP Top 10. https://owasp.org/www-project-top-ten/",
    "Sommerville, I. Software Engineering (10th ed.). Pearson, 2015.",
]
