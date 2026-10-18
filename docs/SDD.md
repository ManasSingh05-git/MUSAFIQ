# Software Design Document: TourPlan AI: Smart Travel & Trip Planning System

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
| Component | Max points |
|---|---|
| budget_fit | 35 |
| interest_match | 30 |
| season_fit | 15 |
| duration_fit | 10 |
| style_fit | 10 |

Plus up to 8 bonus points for place-type hints from chat text. In-budget destinations rank first.
Each component returns a reason string shown in the UI.

## 4. Budget method
Categories: transport, accommodation, food, activities, local transport, shopping/misc (8% of core), emergency
buffer (10% of core). Rooms = ceil(travellers / 2).

Worked example (same as the unit test): 4 days, 3 travellers, stay 1000/night, food 500/day, local 200/day,
activities 100/day, transport 1000 per person round trip, fees 300 per person, budget style -> total
**Rs 21,240**, per person Rs 7,080.

## 5. Transport estimator
Haversine distance x 1.25 road factor x indicative per-km rates; short flights fall back to train;
over 4000 km forces flight. Supported start cities: Mumbai, Pune, Delhi, Bengaluru, Chennai, Hyderabad, Kolkata, Ahmedabad, Jaipur, Lucknow.

## 6. Database
Tables: users, user_preferences, destinations, attractions, trips, itinerary_days, itinerary_activities,
budget_expenses, favorites, chat_conversations, chat_messages, packing_items. See `diagrams/er_diagram.png`.
Constraints: unique (trip, day_number), unique (user, destination) favourites, foreign keys enabled.

## 7. API endpoints (read from code)
| Method | Path | Handler |
|---|---|---|
| POST | /api/auth/register | auth.register |
| POST | /api/auth/login | auth.login |
| GET | /api/auth/me | auth.me |
| GET | /api/auth/preferences | auth.get_preferences |
| PUT | /api/auth/preferences | auth.put_preferences |
| GET | /api/health | catalog.health |
| GET | /api/cities | catalog.cities |
| GET | /api/destinations | catalog.list_destinations |
| GET | /api/destinations/{dest_id} | catalog.get_destination |
| GET | /api/favorites | catalog.list_favorites |
| POST | /api/favorites | catalog.add_favorite |
| DELETE | /api/favorites/{fav_id} | catalog.remove_favorite |
| GET | /api/stats | catalog.stats |
| GET | /api/weather | catalog.weather |
| GET | /api/currency | catalog.currency |
| GET | /api/ai/status | chat.ai_status |
| POST | /api/ai/chat | chat.chat |
| GET | /api/ai/conversations | chat.conversations |
| GET | /api/ai/conversations/{cid} | chat.conversation |
| DELETE | /api/ai/conversations/{cid} | chat.clear_conversation |
| POST | /api/trips/generate | trips.generate_trip |
| POST | /api/trips | trips.create_trip |
| GET | /api/trips | trips.list_trips |
| GET | /api/trips/{trip_id} | trips.get_trip |
| PUT | /api/trips/{trip_id} | trips.update_trip |
| DELETE | /api/trips/{trip_id} | trips.delete_trip |
| POST | /api/trips/{trip_id}/duplicate | trips.duplicate_trip |
| GET | /api/trips/{trip_id}/itinerary | trips.get_itinerary |
| PUT | /api/trips/{trip_id}/itinerary | trips.put_itinerary |
| GET | /api/trips/{trip_id}/budget | trips.get_budget |
| PUT | /api/trips/{trip_id}/budget | trips.put_budget |
| GET | /api/trips/{trip_id}/packing | trips.get_packing |
| PUT | /api/trips/{trip_id}/packing | trips.put_packing |
| GET | /api/trips/{trip_id}/export.pdf | trips.export_pdf |

## 8. Security design
bcrypt (password truncated to 72 bytes), JWT HS256 with expiry, `get_current_user` dependency on protected routes,
other users' resources return 404, in-memory per-user AI rate limit, CORS allow-list, generic 500 handler, no secrets
in frontend. Known limitation: token stored in localStorage.

## 9. Frontend design
Pages: Landing, Login, Dashboard, Discover, DestinationDetail, NewTrip, MyTrips, TripView, MapPage, Settings.
Shared: Layout, ChatWidget, MapView, PlaneTransition, ui, DestinationCard. State: Auth, Toast, Motion contexts.
