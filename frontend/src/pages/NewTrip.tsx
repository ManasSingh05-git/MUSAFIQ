import { AlertTriangle, Loader2, Plane, Save, Sparkles } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EnvironmentalIntelligence } from "../components/EnvironmentalIntelligence";
import { InclusionsExclusions } from "../components/InclusionsExclusions";
import { Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useAuth, useMotion, useToast } from "../lib/contexts";
import { daysBetween, inr } from "../lib/format";
import { EXPENSE_LABELS, INTERESTS, type Destination, type GenerateResult, type Preferences, type Trip } from "../lib/types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };

const THEMES = [
  { id: "couples", label: "💑 Honeymoon & Couples", interests: ["nature", "photography", "food"], style: "comfort", acc: "hotel" },
  { id: "family", label: "👨‍👩‍👧‍👦 Family Vacation", interests: ["culture", "food", "shopping"], pace: "relaxed", acc: "hotel" },
  { id: "adventure", label: "🧗 Adventure & Thrill", interests: ["adventure", "nature"], style: "adventure", pace: "packed" },
  { id: "heritage", label: "🏛️ Heritage & Pilgrimage", interests: ["history", "culture"], pace: "balanced", acc: "hotel" },
  { id: "beach", label: "🌴 Beach & Leisure", interests: ["nature", "food", "photography"], style: "comfort", acc: "resort" },
  { id: "wellness", label: "🧘 Scenic & Wellness", interests: ["nature", "photography"], pace: "relaxed", acc: "resort" },
];

interface Form {
  start_city: string; destination_id: number | ""; start_date: string; end_date: string; travelers: number; budget: number;
  travel_style: string; pace: string; transport: string; accommodation: string; interests: string[]; dietary: string;
  avoid_crowds: boolean; use_llm: boolean;
  holiday_theme: string;
  meal_plan: string;
  hotel_tier: string;
}

export default function NewTrip() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { go } = useMotion();
  const toast = useToast();
  const cities = useAsync(() => api.get<{ cities: { name: string }[] }>("/api/cities"), []);
  const dests = useAsync(() => api.get<Destination[]>("/api/destinations"), []);
  const prefs = useAsync(() => api.get<Preferences>("/api/auth/preferences"), [user?.id]);
  const [f, setF] = useState<Form>({
    start_city: "Mumbai", destination_id: sp.get("destination") ? Number(sp.get("destination")) : "",
    start_date: plusDays(14), end_date: plusDays(17), travelers: 2, budget: 20000, travel_style: "budget", pace: "balanced",
    transport: "train", accommodation: "hotel", interests: [], dietary: "", avoid_crowds: false, use_llm: true,
    holiday_theme: "family", meal_plan: "CP (Breakfast Included)", hotel_tier: "4★ Premium Stay",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (prefs.data) setF((x) => ({ ...x, start_city: prefs.data!.home_city, interests: x.interests.length ? x.interests : prefs.data!.interests, travel_style: prefs.data!.travel_style }));
  }, [prefs.data]);

  const up = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const days = daysBetween(f.start_date, f.end_date);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!f.start_date || !f.end_date) e.dates = "Choose both dates.";
    else if (days < 1) e.dates = "Return date must not be before the departure date.";
    else if (days > 30) e.dates = "Plans are limited to 30 days.";
    if (!Number.isInteger(f.travelers) || f.travelers < 1 || f.travelers > 30) e.travelers = "Enter 1 to 30 travellers.";
    if (!(f.budget > 0)) e.budget = "Enter a budget greater than zero.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generate = async (override?: Partial<Form>, e?: FormEvent) => {
    e?.preventDefault();
    const body = { ...f, ...override };
    if (override) setF(body);
    if (!validate()) return;
    setBusy(true); setServerError(null);
    try {
      const apiPayload = {
        start_city: body.start_city,
        destination_id: body.destination_id === "" ? null : body.destination_id,
        start_date: body.start_date,
        end_date: body.end_date,
        travelers: body.travelers,
        budget: body.budget,
        travel_style: body.travel_style,
        pace: body.pace,
        transport: body.transport,
        accommodation: body.accommodation,
        interests: body.interests,
        dietary: [
          body.dietary,
          body.holiday_theme ? `Theme: ${body.holiday_theme}` : "",
          body.meal_plan ? `Meal Plan: ${body.meal_plan}` : "",
          body.hotel_tier ? `Hotel: ${body.hotel_tier}` : "",
        ].filter(Boolean).join(" · ").slice(0, 200),
        avoid_crowds: body.avoid_crowds,
        use_llm: body.use_llm,
      };
      const r = await api.post<GenerateResult>("/api/trips/generate", apiPayload);
      setResult(r);
      toast("success", "Plan generated");
    } catch (err) { setServerError((err as Error).message); setResult(null); }
    finally { setBusy(false); }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      const t = await api.post<Trip>("/api/trips", result.trip);
      toast("success", "Trip saved");
      go(`/trips/${t.id}`);
    } catch (err) { toast("error", (err as Error).message); }
    finally { setSaving(false); }
  };

  const b = result?.budget;
  const over = b && b.within_budget === false;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
      <form className="card space-y-4 p-5 sm:p-6" onSubmit={(e) => void generate(undefined, e)} noValidate aria-label="Trip details">
        <h1 className="font-display text-3xl">Smart trip generator</h1>

        {/* Veena World & Ixigo Theme / Holiday Persona Presets */}
        <div className="space-y-2 rounded-2xl bg-forest-950/40 p-3 border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-accent">
              Holiday Persona (Veena World Benchmark)
            </span>
            <span className="text-[10px] text-teal-300">1-click presets</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {THEMES.map((theme) => {
              const active = f.holiday_theme === theme.id;
              return (
                <button
                  key={theme.id}
                  type="button"
                  className={`rounded-full px-2.5 py-1 text-xs transition-all ${
                    active
                      ? "bg-teal-500 font-bold text-slate-950 shadow-md scale-105"
                      : "bg-white/5 text-cream/80 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => {
                    setF((prev) => ({
                      ...prev,
                      holiday_theme: theme.id,
                      interests: Array.from(new Set([...prev.interests, ...theme.interests])),
                      travel_style: theme.style ?? prev.travel_style,
                      pace: theme.pace ?? prev.pace,
                      accommodation: theme.acc ?? prev.accommodation,
                    }));
                  }}
                >
                  {theme.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="city">Starting city</label>
            <select id="city" className="input" value={f.start_city} onChange={(e) => up("start_city", e.target.value)}>
              {(cities.data?.cities ?? [{ name: f.start_city }]).map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
          <div><label className="label" htmlFor="dest">Destination</label>
            <select id="dest" className="input" value={f.destination_id} onChange={(e) => up("destination_id", e.target.value === "" ? "" : Number(e.target.value))}>
              <option value="">Suggest a destination</option>{dests.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
          <div><label className="label" htmlFor="sd">Departure</label><input id="sd" type="date" className="input" value={f.start_date} onChange={(e) => up("start_date", e.target.value)} /></div>
          <div><label className="label" htmlFor="ed">Return</label><input id="ed" type="date" className="input" value={f.end_date} min={f.start_date} onChange={(e) => up("end_date", e.target.value)} /></div>
          {errors.dates && <p role="alert" className="col-span-2 text-xs text-coral-accent">{errors.dates}</p>}
          <div><label className="label" htmlFor="tr">Travellers</label><input id="tr" type="number" min={1} max={30} className="input" value={f.travelers} onChange={(e) => up("travelers", Number(e.target.value))} aria-invalid={!!errors.travelers} />
            {errors.travelers && <p role="alert" className="mt-1 text-xs text-coral-accent">{errors.travelers}</p>}</div>
          <div><label className="label" htmlFor="bd">Total budget (₹ INR)</label><input id="bd" type="number" min={0} step={500} className="input" value={f.budget} onChange={(e) => up("budget", Number(e.target.value))} aria-invalid={!!errors.budget} />
            {errors.budget && <p role="alert" className="mt-1 text-xs text-coral-accent">{errors.budget}</p>}</div>
          <div><label className="label" htmlFor="st">Travel style</label>
            <select id="st" className="input" value={f.travel_style} onChange={(e) => up("travel_style", e.target.value)}>{["budget", "comfort", "luxury", "adventure"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="pc">Pace</label>
            <select id="pc" className="input" value={f.pace} onChange={(e) => up("pace", e.target.value)}>{["relaxed", "balanced", "packed"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="tp">Preferred transport</label>
            <select id="tp" className="input" value={f.transport} onChange={(e) => up("transport", e.target.value)}>{["train", "bus", "car", "flight"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="ac">Accommodation</label>
            <select id="ac" className="input" value={f.accommodation} onChange={(e) => up("accommodation", e.target.value)}>{["hostel", "budget", "hotel", "resort"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div>
            <label className="label" htmlFor="ht">Hotel Category</label>
            <select
              id="ht"
              className="input"
              value={f.hotel_tier}
              onChange={(e) => {
                const val = e.target.value;
                up("hotel_tier", val);
                if (val.includes("5★")) up("accommodation", "resort");
                else if (val.includes("4★")) up("accommodation", "hotel");
                else up("accommodation", "budget");
              }}
            >
              <option value="3★ Comfort Stay">3★ Comfort Standard</option>
              <option value="4★ Premium Stay">4★ Premium Superior</option>
              <option value="5★ Luxury Resort">5★ Luxury Palace &amp; Spa Resort</option>
              <option value="Boutique Heritage">Boutique Heritage Homestay</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="mp">Meal Plan (Veena World)</label>
            <select
              id="mp"
              className="input"
              value={f.meal_plan}
              onChange={(e) => up("meal_plan", e.target.value)}
            >
              <option value="CP (Breakfast Included)">CP · Daily Breakfast</option>
              <option value="MAP (Breakfast + Dinner)">MAP · Breakfast + Dinner</option>
              <option value="EP (Room Only)">EP · Room Only (Local Dining)</option>
              <option value="AP (All Meals Included)">AP · All Meals Included</option>
            </select>
          </div>
        </div>
        <fieldset>
          <legend className="label">Interests</legend>
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => {
              const on = f.interests.includes(i);
              return <button type="button" key={i} aria-pressed={on} className={`chip ${on ? "chip-active" : ""}`} onClick={() => up("interests", on ? f.interests.filter((x) => x !== i) : [...f.interests, i])}>{i}</button>;
            })}
          </div>
        </fieldset>
        <div><label className="label" htmlFor="diet">Dietary or accessibility notes (optional)</label>
          <input id="diet" className="input" maxLength={200} value={f.dietary} onChange={(e) => up("dietary", e.target.value)} />
          <p className="mt-1 text-xs text-cream/50">Saved with the trip. Not used to filter places in this version.</p></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.avoid_crowds} onChange={(e) => up("avoid_crowds", e.target.checked)} />Prefer less crowded attractions</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.use_llm} onChange={(e) => up("use_llm", e.target.checked)} />Use AI explanation when available</label>
        <button className="btn-primary w-full" type="submit" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}Generate plan ({Number.isFinite(days) && days > 0 ? `${days} days` : "check dates"})
        </button>
      </form>

      <section aria-live="polite" className="space-y-5">
        {serverError && <p role="alert" className="card border-coral-accent/50 p-4 text-sm">{serverError}</p>}
        {busy && <><Skeleton className="h-32" /><Skeleton className="h-64" /></>}
        {!busy && !result && !serverError && (
          <div className="card p-8 text-center text-cream/70">Fill in the form and generate a plan. You can edit everything after saving.</div>
        )}
        {!busy && result && b && (
          <>
            <div className="card space-y-3 p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`chip ${result.source === "llm" ? "chip-active" : ""}`}>{result.source === "llm" ? "AI-assisted explanation" : "Rule-based plan (not a live LLM)"}</span>
                <span className="chip">{result.trip.title}</span>
              </div>
              {result.note && <p className="text-sm text-cream/75">{result.note}</p>}
              <p className="text-cream/90">{result.trip.overview}</p>
              <p className="text-xs text-cream/50">{result.data_disclaimer}</p>
            </div>

            {/* ixigo PLAN: Environmental & Weather Intelligence */}
            <EnvironmentalIntelligence
              destinationName={dests.data?.find((d) => d.id === f.destination_id)?.name || result.trip.title.replace("Trip to ", "")}
            />

            {/* Veena World Standard: Guaranteed Tour Inclusions & Exclusions */}
            <InclusionsExclusions
              transportMode={f.transport}
              travelers={f.travelers}
              hotelTier={f.hotel_tier}
              mealPlan={f.meal_plan}
            />

            {result.recommendations.length > 0 && (
              <div className="card space-y-3 p-5">
                <h2 className="font-display text-xl">Why these destinations (scored out of 100)</h2>
                {result.recommendations.map((r, i) => (
                  <details key={r.destination_id} open={i === 0} className="rounded-2xl bg-forest-950/50 p-3">
                    <summary className="cursor-pointer text-sm font-semibold">{r.name}: {r.score} points, est. {inr(r.estimated_total)} {r.within_budget ? "(within budget)" : "(over budget)"}</summary>
                    <ul className="mt-2 space-y-1 text-xs text-cream/75">
                      {Object.entries(r.breakdown).map(([k, v]) => <li key={k}><strong>{k.replace(/_/g, " ")}</strong> {v.points}/{v.max}: {v.reason}</li>)}
                    </ul>
                    {i > 0 && <button className="btn-ghost mt-2 !py-1.5 !text-xs" onClick={() => void generate({ destination_id: r.destination_id })}>Plan this one instead</button>}
                  </details>
                ))}
              </div>
            )}

            <div className="card space-y-3 p-5">
              <h2 className="font-display text-xl">Budget estimate</h2>
              {over && (
                <div role="alert" className="flex gap-2 rounded-2xl border border-coral-accent/50 bg-coral-accent/10 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-coral-accent" aria-hidden="true" />
                  <div>Estimated total is {inr(Math.abs(b.difference ?? 0))} over your {inr(f.budget)} budget.
                    <ul className="mt-1 list-disc pl-5 text-cream/80">{b.alternatives.map((a) => <li key={a}>{a}</li>)}</ul></div>
                </div>
              )}
              <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                {Object.entries(b.categories).map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-cream/65">{EXPENSE_LABELS[k] ?? k}</dt><dd>{inr(v)}</dd></div>)}
              </dl>
              <p className="border-t border-white/10 pt-2 font-semibold">Total {inr(b.total)} · {inr(b.per_person)} per person · {result.transport.mode}, about {result.transport.distance_km} km</p>
            </div>

            <div className="card space-y-3 p-5">
              <h2 className="font-display text-xl">Itinerary preview</h2>
              {result.trip.days.map((d) => (
                <div key={d.day_number}>
                  <h3 className="text-sm font-semibold text-amber-accent">Day {d.day_number}: {d.title}</h3>
                  <ul className="ml-4 list-disc text-sm text-cream/80">{d.activities.map((a, i) => <li key={i}>{a.slot}: {a.title}</li>)}</ul>
                </div>
              ))}
            </div>

            {f.transport === "flight" || result.transport.mode === "flight" ? (
              <div className="card border-teal-500/30 bg-teal-950/20 p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-[#ff6b2b]" />
                  <h3 className="font-display text-lg font-bold text-white">Flight Transport Selected</h3>
                </div>
                <p className="text-xs text-cream/80">
                  Book your flight tickets, select your preferred cockpit cabin seats, and download your boarding pass with our live aircraft booking dashboard.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigate("/flights", {
                      state: {
                        tripDraft: result.trip,
                        destinationId: f.destination_id,
                      },
                    });
                  }}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-gradient-to-r from-orange-500 to-[#ff6b2b] py-3.5 text-center font-display text-sm font-bold text-white shadow-lg shadow-orange-950/40 hover:brightness-110 active:scale-[0.98]"
                >
                  <Plane className="h-4 w-4" /> Continue to Flight Booking & Seat Selection (Velox) &gt;&gt;
                </button>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <button className="btn-primary" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Save trip</button>
              <button
                type="button"
                onClick={() => {
                  navigate("/flights", {
                    state: {
                      tripDraft: result.trip,
                      destinationId: f.destination_id,
                    },
                  });
                }}
                className="btn-ghost border-teal-500/40 text-teal-300 hover:text-white hover:bg-teal-950/30"
              >
                <Plane className="h-4 w-4 mr-1 inline" /> Book Flight &amp; Seats
              </button>
              <button className="btn-ghost" onClick={() => void generate()} disabled={busy}>Regenerate</button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
