# Software Requirements Specification: TourPlan AI: Smart Travel & Trip Planning System

## 1. Introduction
**Purpose.** Defines what TourPlan AI must do. **Scope.** A web app for planning (not booking) trips.
**Definitions.** *Estimate*: indicative figure from sample data. *Fallback*: deterministic non-LLM explanation.

## 2. Overall description
Users: guests (browse) and registered users (plan, save, chat). Environment: modern browser, Python backend,
SQLite. Constraints: free tools only; no live price data; optional LLM key.

## 3. Functional requirements
| ID | Requirement |
|---|---|
| FR-01 | Register with name, email and password (min 8 chars); duplicate emails rejected; passwords stored as bcrypt hashes. |
| FR-02 | Log in and receive a signed JWT; log out clears the token; protected routes require it. |
| FR-03 | Store a profile with home city, travel style and interests; use them as defaults. |
| FR-04 | Browse 12 seeded destinations; search by name, country or region; filter by category, interest, climate, month and daily cost; sort. |
| FR-05 | View a destination: description, practical information, best months, indicative costs, attractions with fees and durations, map pins. |
| FR-06 | Save and remove favourite destinations (per user, idempotent). |
| FR-07 | Generate a trip from a form (start city, destination or 'suggest', dates, travellers, budget, style, pace, transport, accommodation, interests). |
| FR-08 | Rank destinations with a transparent 100-point score and show the reason for each component. |
| FR-09 | Produce a day-by-day itinerary (morning/afternoon/evening) from the attraction dataset, with durations and fees. |
| FR-10 | Estimate transport, accommodation, food, activities, local transport, shopping/misc and an emergency buffer; show total, per person and per day. |
| FR-11 | Warn when the estimate exceeds the budget and propose cheaper alternatives; never silently exceed the budget. |
| FR-12 | Save a generated or manual trip; list, search and filter trips by status; open, edit details, duplicate and delete (with confirmation). |
| FR-13 | Edit an itinerary: change fields, add, remove and reorder activities; persist changes. |
| FR-14 | Edit budget categories and actual spend; recompute totals immediately; show donut, daily and estimate-versus-actual charts. |
| FR-15 | Show trip stops on an OpenStreetMap map with a route line, with map/list switching and a tile-failure notice. |
| FR-16 | Packing checklist generated from climate, destination type and interests; items can be ticked, added and removed; progress shown. |
| FR-17 | Export a trip itinerary and budget as a PDF; copy a plain-text trip summary. |
| FR-18 | AI assistant on every page: extracts requirements from natural language, asks for missing details, recommends, plans, and refines ('cheaper', 'more adventure'). |
| FR-19 | Use a configured LLM only to explain a plan grounded in dataset facts; otherwise a rule-based fallback, always labelled as such. |
| FR-20 | Persist chat conversations; allow deleting a conversation. |
| FR-21 | Optional live weather and currency conversion with clearly labelled fallbacks. |
| FR-22 | Plane-flight page transition with a setting to disable it and automatic respect for reduced-motion preferences. |

## 4. Non-functional requirements
| ID | Requirement |
|---|---|
| NFR-01 Security | bcrypt password hashing; JWT (HS256) with expiry; per-user authorisation returning 404 for other users' resources; secrets only in backend environment variables; CORS allow-list. |
| NFR-02 Validation | All inputs validated by Pydantic (types, ranges, enums, date order, coordinate pairs); meaningful 4xx messages; generic 500 without internals. |
| NFR-03 Honesty | Prices are labelled as estimates from sample data; fallback AI output is labelled rule-based; the app never claims to book anything. |
| NFR-04 Reliability | External services (LLM, weather, FX, map tiles) are optional and fail gracefully; the core flow works fully offline from seeded data. |
| NFR-05 Performance | Single-process SQLite deployment suited to a demo; no heavy computation (scoring 12 destinations per request). |
| NFR-06 Usability | Responsive layout (mobile, tablet, desktop); loading skeletons, empty and error states; toast feedback; confirmation before destructive actions. |
| NFR-07 Accessibility | Labelled controls, keyboard operation, visible focus ring, aria roles for tabs and progress, skip link, reduced-motion support. |
| NFR-08 Maintainability | Modular backend (routers / services / domain engine / AI layer), typed frontend, pure functions for budget and travel logic. |
| NFR-09 Portability | Runs on Windows, macOS and Linux with Python 3.11+ and Node 18+; no external database server. |
| NFR-10 Testability | Pure-function budget and travel modules, API tests with an isolated SQLite file, mocked LLM responses. |

## 5. Use cases
| Use case | Actor | Description |
|---|---|---|
| UC-01 Register / log in | Guest | Submits name, email, password. System validates, hashes the password, returns a token. Alternate: duplicate email (409), invalid input (422), wrong credentials (401). |
| UC-02 Browse and filter destinations | Guest / User | Searches and filters the catalogue. Alternate: no match shows an empty state with a clear-filters action. |
| UC-03 Generate trip plan | User | Enters requirements. System validates, scores destinations (or uses the chosen one), builds itinerary and budget, optionally adds an LLM explanation, labels the source. Alternate: unsupported city, over-budget warning. |
| UC-04 Edit and save itinerary | User | Changes, adds, removes, reorders activities and saves. System validates and persists, then reloads. |
| UC-05 Edit budget | User | Changes estimates and actual spend; totals update instantly; saving persists them. |
| UC-06 Manage trips | User | Lists, searches, filters, opens, duplicates, deletes (after confirmation) trips. |
| UC-07 Export PDF | User | Requests the PDF; system renders itinerary and budget with an estimate disclaimer. |
| UC-08 Chat with AI assistant | User | Describes the trip in natural language; system extracts requirements, asks for missing ones, returns a plan that can be saved as a trip. |
| UC-09 Manage favourites and preferences | User | Toggles favourites; edits home city, style and interests. |

## 6. External interfaces
REST/JSON API (section 'API endpoints' in the SDD), OpenStreetMap tiles, Open-Meteo, Frankfurter, Gemini (all optional).

## 7. Assumptions
Prices are estimates; start city is one of 10 supported cities; users read results as planning aids.
