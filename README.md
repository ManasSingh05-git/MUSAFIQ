# MUSAFIQ AI: Smart Travel, Trip Planning & Flight Booking System

Full-stack AI travel companion project. Plans a trip from natural-language or form input: ranks destinations with transparent scoring, builds day-by-day itineraries, interactive flight booking with dynamic multi-currency engine (₹ INR, $ USD, € EUR, AED, £ GBP), aircraft seat visualizer, budget estimator, and interactive maps.

> **Verification status:** all source files were written in an environment that could not reach the pip/npm registries, so the backend, frontend and tests have **not been executed yet**. Only Python syntax checking was done. Run the commands below and paste real output into the report (section 25).

## Data honesty
* Destinations, attractions and prices are a **small sample dataset** (12 destinations, 54 attractions).
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
py -m venv .venv ; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy ..\.env.example .env
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
* All destination data is a small hand-written sample (12 destinations, 54 attractions). Costs are indicative estimates, not live prices; coordinates of attractions are approximate.
* Transport estimates exist only for 10 start cities (Mumbai, Pune, Delhi, Bengaluru, Chennai, Hyderabad, Kolkata, Ahmedabad, Jaipur, Lucknow) and use straight-line distance with fixed per-km rates.
* The assistant's requirement extraction is rule-based (English keywords and patterns); unusual phrasing may be missed, in which case it asks follow-up questions.
* Dietary and accessibility notes are saved with a trip but are not used to filter places.
* The AI rate limiter is in memory (single process) and resets on restart.
* The JWT is kept in browser localStorage, which is exposed to cross-site-scripting if the front end were compromised; httpOnly cookies would be stronger.
* The database is created with create_all and seeded on first start; there are no migrations.
* No real destination photographs are bundled; a generated illustration is shown unless the user adds licensed images.
* Notifications and trip reminders are not implemented. Currency is INR only for trips.
* The application does not book flights, hotels or tickets.
