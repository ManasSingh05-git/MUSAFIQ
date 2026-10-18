export interface User { id: number; email: string; name: string }
export interface Attraction {
  id: number; name: string; description: string; image_url?: string; latitude: number; longitude: number;
  tags: string[]; duration_hours: number; entry_fee_inr: number; best_time: string; crowded: boolean;
}
export interface Destination {
  id: number; slug: string; name: string; country: string; region: string; description: string;
  image_url: string; latitude: number; longitude: number; categories: string[]; interests: string[];
  climate: string; best_months: number[]; crowd_level: string; suggested_days: number;
  stay_per_night_inr: number; food_per_day_inr: number; local_transport_per_day_inr: number;
  activities_per_day_inr: number; practical_info: string;
}
export interface DestinationDetail extends Destination { attractions: Attraction[] }
export interface Favorite { id: number; destination_id: number; destination: Destination }

export type Slot = "morning" | "afternoon" | "evening";
export interface Activity {
  id?: number | null; attraction_id?: number | null; slot: Slot; title: string; description: string;
  image_url?: string;
  duration_hours: number; estimated_cost: number; latitude: number | null; longitude: number | null; position: number;
}
export interface Day { id?: number | null; day_number: number; title: string; notes: string; activities: Activity[] }
export interface Expense { id?: number | null; category: string; estimated: number; actual: number }
export interface PackingItem { id?: number | null; label: string; packed: boolean }

export interface TripCore {
  title: string; start_city: string; destination_id: number | null; start_date: string; end_date: string;
  travelers: number; budget: number; currency: "INR"; travel_style: string; pace: string; transport: string;
  accommodation: string; interests: string[]; notes: string;
}
export interface TripDraft extends TripCore {
  overview: string; tips: string[]; weather_alternatives: string[]; generated_by: string;
  days: Day[]; expenses: Expense[];
}
export interface Trip extends TripDraft {
  id: number; status: "upcoming" | "ongoing" | "completed"; destination_name: string | null;
  packing: PackingItem[]; created_at: string; updated_at: string;
}
export interface TripSummary {
  id: number; title: string; start_city: string; destination_id: number | null; destination_name: string | null;
  start_date: string; end_date: string; travelers: number; budget: number; generated_by: string;
  status: string; estimated_total: number | null;
}

export interface BudgetView {
  categories: Record<string, number>; actual: Record<string, number>; total: number; actual_total: number;
  per_person: number; per_day: number; days: number; travelers: number; daily: { day: number; amount: number }[];
  alternatives: string[]; warning: string | null; within_budget?: boolean; difference?: number; budget?: number;
  is_estimate: boolean;
}
export interface ScoreBreakdown { points: number; max: number; reason: string }
export interface Recommendation {
  destination_id: number; slug: string; name: string; country: string; score: number; within_budget: boolean;
  estimated_total: number; breakdown: Record<string, ScoreBreakdown>; data_source: string;
  transport: { mode: string; distance_km: number; one_way_hours: number; round_trip_per_person: number; note: string };
}
export interface GenerateResult {
  source: "rule_based" | "llm"; note: string | null; trip: TripDraft; budget: BudgetView & Record<string, unknown>;
  transport: Recommendation["transport"]; recommendations: Recommendation[]; data_disclaimer: string;
}
export interface ChatMessage {
  id: number; role: "user" | "assistant"; content: string; source: string; payload?: ChatPayload | null;
}
export interface ChatPayload {
  type?: "plan"; action?: "open_map"; destination_id?: number; trip?: TripDraft; budget?: BudgetView;
  recommendations?: Recommendation[];
}
export interface Conversation { id: number; title: string; messages: ChatMessage[] }
export interface Stats {
  saved_destinations: number; total_trips: number; completed_trips: number; countries_visited: number;
  trip_completion_pct: number; note: string;
}
export interface Weather {
  available: boolean; reason?: string; source?: string; temperature_c?: number; high_c?: number; low_c?: number;
}
export interface Preferences { home_city: string; currency: "INR"; travel_style: string; interests: string[] }

export const INTERESTS = ["food", "culture", "nature", "shopping", "nightlife", "history", "photography", "adventure"] as const;
export const CATEGORIES = ["beach", "mountain", "adventure", "heritage", "food", "nature", "romantic"] as const;
export const EXPENSE_CATEGORIES = ["transport", "accommodation", "food", "activities", "local_transport", "shopping_misc", "emergency_buffer"] as const;
export const EXPENSE_LABELS: Record<string, string> = {
  transport: "Transport", accommodation: "Accommodation", food: "Food", activities: "Activities & sightseeing",
  local_transport: "Local transport", shopping_misc: "Shopping & misc", emergency_buffer: "Emergency buffer",
};
