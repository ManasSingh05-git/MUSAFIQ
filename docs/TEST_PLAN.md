# Test plan

> **Verification status:** all source files were written in an environment that could not reach the pip/npm registries, so the backend, frontend and tests have **not been executed yet**. Only Python syntax checking was done. Run the commands below and paste real output into the report (section 25).

**Scope:** backend unit and API tests (pytest), frontend helper tests (Vitest), manual UI checklist.
**Environment:** isolated temp SQLite database, LLM disabled, live weather/currency disabled (see `backend/tests/conftest.py`).

## Automated tests found in code (45)
| File | Test |
|---|---|
| test_ai.py | test_extracts_demo_message |
| test_ai.py | test_extraction_variants |
| test_ai.py | test_destination_named_in_text |
| test_ai.py | test_asks_followup_when_details_missing |
| test_ai.py | test_fallback_chat_is_labelled_rule_based_and_plan_is_saveable |
| test_ai.py | test_conversational_refinement_and_persistence |
| test_ai.py | test_unrealistic_budget_is_explained_not_hidden |
| test_ai.py | test_conversations_are_private |
| test_ai.py | test_rate_limit |
| test_ai.py | test_ai_status_reports_fallback |
| test_ai.py | test_gemini_valid_json_is_parsed |
| test_ai.py | test_gemini_failures_raise_llmerror |
| test_ai.py | test_network_error_falls_back_and_is_disclosed |
| test_ai.py | test_llm_success_marks_source_llm |
| test_api.py | test_health |
| test_api.py | test_register_login_and_validation |
| test_api.py | test_demo_account_seeded |
| test_api.py | test_protected_routes_need_token |
| test_api.py | test_destinations_list_filter_detail |
| test_api.py | test_trip_crud_cycle |
| test_api.py | test_trip_validation |
| test_api.py | test_users_cannot_access_each_others_trips |
| test_api.py | test_generate_without_destination_recommends_and_is_labelled |
| test_api.py | test_generate_rejects_bad_city_and_dates |
| test_api.py | test_generated_plan_saves_and_budget_edit_recalculates |
| test_api.py | test_itinerary_edit_add_remove_reorder |
| test_api.py | test_pdf_export |
| test_api.py | test_favorites_flow_and_isolation |
| test_api.py | test_data_survives_app_restart |
| test_api.py | test_currency_fallback_is_labelled |
| test_api.py | test_weather_disabled_is_honest |
| test_budget.py | test_budget_hand_calculated_values |
| test_budget.py | test_hostel_is_cheaper_than_hotel |
| test_budget.py | test_rooms_round_up |
| test_budget.py | test_single_day_has_no_accommodation |
| test_budget.py | test_trip_days_inclusive_and_validation |
| test_budget.py | test_invalid_inputs_rejected |
| test_budget.py | test_budget_status_and_alternatives |
| test_budget.py | test_summarize_recalculates_after_manual_edit |
| test_budget.py | test_daily_breakdown_sums_close_to_total_minus_buffer |
| test_travel_planner.py | test_haversine_known_distance |
| test_travel_planner.py | test_transport_estimate_shape_and_label |
| test_travel_planner.py | test_short_flight_falls_back_to_train |
| test_travel_planner.py | test_bad_inputs |
| test_travel_planner.py | test_seed_coordinates_are_valid_and_unique_slugs |

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
