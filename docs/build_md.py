"""Generates README.md, docs/SRS.md, docs/SDD.md, docs/VIVA_AND_DEMO.md, docs/TEST_PLAN.md from code facts."""
import pathlib
import content as c

ROOT = c.ROOT
E = c.EX = c.EXAMPLE
STATUS = ("> **Verification status:** all source files were written in an environment that could not reach the "
          "pip/npm registries, so the backend, frontend and tests have **not been executed yet**. Only Python "
          "syntax checking was done. Run the commands below and paste real output into the report (section 25).")


def table(rows, head):
    out = ["| " + " | ".join(head) + " |", "|" + "---|" * len(head)]
    out += ["| " + " | ".join(str(x).replace("|", "/") for x in r) + " |" for r in rows]
    return "\n".join(out)


eps = c.endpoints()
tests = c.tests()
ep_table = table(eps, ["Method", "Path", "Handler"])
test_table = table([(f, n) for f, n in tests], ["File", "Test"])

readme = f"""# {c.PROJECT}

Software Engineering Lab project. Plans a trip from natural-language or form input: ranks destinations with a
transparent score, builds an itinerary, estimates a budget, shows stops on a map and exports a PDF.

{STATUS}

## Data honesty
* Destinations, attractions and prices are a **small sample dataset** ({c.N_DEST} destinations, {c.N_ATTR} attractions).
  Prices are **indicative estimates**, not live quotes. Attraction coordinates are approximate.
* The app **does not book** anything.
* If a Gemini key is configured the LLM only *explains* a plan built by the deterministic engine. Without a key, a
  rule-based explanation is used and labelled `rule_based`. It is never presented as a live LLM.

## Requirements
Python 3.11+, Node 18+ (npm). No database server needed (SQLite).

## Backend setup and run
Linux / macOS:
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env          # then edit JWT_SECRET (and optionally GEMINI_API_KEY)
pytest                           # run backend tests
uvicorn app.main:app --reload --port 8000
```
Windows (PowerShell):
```powershell
cd backend
py -m venv .venv ; .\\.venv\\Scripts\\Activate.ps1
pip install -r requirements.txt
copy ..\\.env.example .env
pytest
uvicorn app.main:app --reload --port 8000
```
API docs: http://localhost:8000/docs . The database file is created and seeded on first start.
Demo account: `demo@tourplan.ai` / `demo12345` (seeded; change or delete outside a demo).

## Frontend setup and run
```bash
cd frontend
npm install
npm run typecheck     # strict TypeScript check
npm test              # vitest
npm run dev           # http://localhost:5173 (calls the API at http://localhost:8000; override with VITE_API_URL)
npm run build         # production build
```

## Environment variables (`.env.example`)
Keys live **only** in the backend environment. The frontend never sees `GEMINI_API_KEY`.

| Variable | Meaning |
|---|---|
| JWT_SECRET | Signing key for tokens. Set a long random value. |
| DATABASE_URL | SQLAlchemy URL, default SQLite file. |
| CORS_ORIGINS | Comma-separated allowed origins. |
| GEMINI_API_KEY | Optional. Enables LLM explanations. |
| GEMINI_MODEL | Optional model name. |
| AI_RATE_LIMIT_PER_MINUTE | Per-user AI request limit (default 10). |

## Project layout
`backend/` FastAPI app + tests, `frontend/` React app, `database/` schema notes, `docs/` SRS, SDD, viva, test plan,
generators, `diagrams/` PNG diagrams, `report/` DOCX + PDF, `presentation/` PPTX, `screenshots/` (capture after
running the app).

## Regenerating documents
`cd docs && pip install python-docx reportlab python-pptx matplotlib && python build_all.py`

## Known limitations
""" + "\n".join(f"* {x}" for x in c.LIMITATIONS) + "\n"

srs = f"""# Software Requirements Specification: {c.PROJECT}

## 1. Introduction
**Purpose.** Defines what TourPlan AI must do. **Scope.** A web app for planning (not booking) trips.
**Definitions.** *Estimate*: indicative figure from sample data. *Fallback*: deterministic non-LLM explanation.

## 2. Overall description
Users: guests (browse) and registered users (plan, save, chat). Environment: modern browser, Python backend,
SQLite. Constraints: free tools only; no live price data; optional LLM key.

## 3. Functional requirements
{table(c.FR, ['ID', 'Requirement'])}

## 4. Non-functional requirements
{table(c.NFR, ['ID', 'Requirement'])}

## 5. Use cases
{table(c.USE_CASES, ['Use case', 'Actor', 'Description'])}

## 6. External interfaces
REST/JSON API (section 'API endpoints' in the SDD), OpenStreetMap tiles, Open-Meteo, Frankfurter, Gemini (all optional).

## 7. Assumptions
Prices are estimates; start city is one of {c.N_CITIES} supported cities; users read results as planning aids.
"""

sdd = f"""# Software Design Document: {c.PROJECT}

## 1. Architecture
Three tiers: React SPA -> FastAPI REST API -> SQLite via SQLAlchemy. A deterministic domain engine
(`recommender`, `planner`, `budget`, `travel`) produces every number and place. The AI layer (`ai.py`) extracts
requirements, optionally calls Gemini for a JSON explanation validated by `LLMExplanation`, else falls back.
See `diagrams/architecture.png`.

## 2. Modules
* `routers/` auth, catalog, chat, trips (HTTP only)
* `services.py` ownership checks, serialisation, replace-days/expenses
* `recommender.py`, `planner.py`, `budget.py`, `travel.py` pure domain logic
* `ai.py` requirement extraction, rate limiter, Gemini client, fallback
* `models.py`, `database.py`, `seed.py`, `seed_data.py`

## 3. Recommendation score (100 points)
{table([(k, v) for k, v in c.WEIGHTS.items()], ['Component', 'Max points'])}

Plus up to {c.HINT_BONUS} bonus points for place-type hints from chat text. In-budget destinations rank first.
Each component returns a reason string shown in the UI.

## 4. Budget method
Categories: transport, accommodation, food, activities, local transport, shopping/misc (8% of core), emergency
buffer (10% of core). Rooms = ceil(travellers / 2).

Worked example (same as the unit test): 4 days, 3 travellers, stay 1000/night, food 500/day, local 200/day,
activities 100/day, transport 1000 per person round trip, fees 300 per person, budget style -> total
**Rs {E['total']:,.0f}**, per person Rs {E['total']/3:,.0f}.

## 5. Transport estimator
Haversine distance x 1.25 road factor x indicative per-km rates; short flights fall back to train;
over 4000 km forces flight. Supported start cities: {c.CITIES}.

## 6. Database
Tables: users, user_preferences, destinations, attractions, trips, itinerary_days, itinerary_activities,
budget_expenses, favorites, chat_conversations, chat_messages, packing_items. See `diagrams/er_diagram.png`.
Constraints: unique (trip, day_number), unique (user, destination) favourites, foreign keys enabled.

## 7. API endpoints (read from code)
{ep_table}

## 8. Security design
bcrypt (password truncated to 72 bytes), JWT HS256 with expiry, `get_current_user` dependency on protected routes,
other users' resources return 404, in-memory per-user AI rate limit, CORS allow-list, generic 500 handler, no secrets
in frontend. Known limitation: token stored in localStorage.

## 9. Frontend design
Pages: Landing, Login, Dashboard, Discover, DestinationDetail, NewTrip, MyTrips, TripView, MapPage, Settings.
Shared: Layout, ChatWidget, MapView, PlaneTransition, ui, DestinationCard. State: Auth, Toast, Motion contexts.
"""

demo = f"""# Demo walkthrough and viva Q&A

{STATUS}

## Demo script (about 8 minutes)
1. Start backend and frontend; open the Landing page; point out the sample-data notice.
2. Discover: search "goa", filter by beach, open a destination, show attractions and best months.
3. Log in as the demo user (`demo@tourplan.ai` / `demo12345`).
4. New trip: start Mumbai, 3 travellers, 4 days, budget Rs 20,000, interests nature + food; submit.
5. Show the recommendation ranking and the **score breakdown** with reasons.
6. Open the itinerary; move an activity; save.
7. Budget tab: change a category, watch totals and over-budget warning; see cheaper alternatives.
8. Map tab: route line between stops; switch to list view.
9. AI assistant: type "Plan 3 days in Lonavala for 3 people under 15k"; show the source label (`rule_based` unless a key is set); then "make it cheaper".
10. Export the PDF; toggle the airplane transition off in Settings; log out.

## Viva questions
""" + "\n".join(f"**Q{i}. {q}**\n\n{a}\n" for i, (q, a) in enumerate([
    ("Why FastAPI?", "Typed endpoints, Pydantic validation and automatic OpenAPI docs reduce boilerplate and errors."),
    ("Why SQLite?", "Zero-setup relational store, enough for a demo; SQLAlchemy lets us move to PostgreSQL by changing the URL."),
    ("How is the LLM used?", "Only to explain a plan the deterministic engine already built. Output is parsed as JSON and validated; failures fall back to rule-based text."),
    ("What if there is no API key?", "The fallback explanation is generated by rules and labelled `rule_based`; it is never presented as an LLM."),
    ("Where is the API key stored?", "Only in backend environment variables; the frontend never receives it."),
    ("How does the recommendation score work?", f"100 points: {', '.join(f'{k} {v}' for k, v in c.WEIGHTS.items())}; each gives a reason string; in-budget first."),
    ("Are prices real?", "No. They are indicative sample estimates and labelled so. The app does not book."),
    ("How is the budget computed?", f"Pure function; worked example total Rs {E['total']:,.0f} matches a unit test calculated by hand."),
    ("How are passwords stored?", "bcrypt hashes; plaintext is never stored or logged."),
    ("How do you stop users reading each other's trips?", "Every trip query filters by the current user; foreign ids return 404."),
    ("What is JWT?", "A signed token containing the user id and expiry; the server verifies the signature on each request."),
    ("What are the weaknesses of localStorage tokens?", "XSS can read them; httpOnly cookies with CSRF protection are safer (listed as future work)."),
    ("How is rate limiting done?", "In-memory sliding window per user for AI endpoints; resets on restart; Redis would be needed at scale."),
    ("What does the ER diagram show?", "Users own trips; trips have days, activities, expenses and packing items; destinations have attractions."),
    ("Why a deterministic engine plus LLM?", "Numbers and places must be reproducible and testable; LLMs may hallucinate."),
    ("How is transport estimated?", "Haversine distance, road factor 1.25, indicative per-km rates, flight rule over 4000 km."),
    ("How did you test?", f"{len(tests)} pytest functions cover budget math, travel, planner, AI extraction and API authorisation. Results must be run and pasted; none are claimed here."),
    ("What does reduced motion do?", "Skips the plane transition automatically when the OS asks for reduced motion."),
    ("What would you improve?", "Migrations, live pricing APIs, cookie sessions, larger dataset."),
    ("What are the limits of the chat extractor?", "English keyword rules; it asks follow-ups when days or budget are missing."),
], 1))

plan = f"""# Test plan

{STATUS}

**Scope:** backend unit and API tests (pytest), frontend helper tests (Vitest), manual UI checklist.
**Environment:** isolated temp SQLite database, LLM disabled, live weather/currency disabled (see `backend/tests/conftest.py`).

## Automated tests found in code ({len(tests)})
{test_table}

## Manual checklist (tick after running)
- [ ] Register, log in, log out, wrong password message
- [ ] Discover filters and empty state
- [ ] Generate trip with each transport option; unsupported city handled
- [ ] Over-budget warning and cheaper alternatives
- [ ] Edit, save, reload itinerary; duplicate and delete trip with confirmation
- [ ] Map route and list view; tile failure notice
- [ ] Chat: missing-info question, refinement, conversation persists after refresh
- [ ] PDF export opens; keyboard navigation; reduced motion
- [ ] Mobile width layout

## Results
Not recorded. Paste the real `pytest -v` and `npm test` output into report section 25.
"""

for path, text in [(ROOT / "README.md", readme), (ROOT / "docs/SRS.md", srs), (ROOT / "docs/SDD.md", sdd),
                   (ROOT / "docs/VIVA_AND_DEMO.md", demo), (ROOT / "docs/TEST_PLAN.md", plan)]:
    path.write_text(text, encoding="utf-8")
    print("wrote", path)
(ROOT / "database").mkdir(exist_ok=True)
(ROOT / "database/README.md").write_text(
    "# Database\nSchema is defined in `backend/app/models.py` (SQLAlchemy). The SQLite file is created and seeded on "
    "first backend start. ER diagram: `diagrams/er_diagram.png`. Seed data: `backend/app/seed_data.py` (sample data).\n")
