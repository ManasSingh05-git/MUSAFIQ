import { AlertTriangle, ArrowDown, ArrowUp, Check, Copy, Download, Loader2, Pencil, Plane, Plus, Printer, QrCode, Save, Share2, Shield, Ticket, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { EnvironmentalIntelligence } from "../components/EnvironmentalIntelligence";
import { InclusionsExclusions } from "../components/InclusionsExclusions";
import { MapView, type MapPoint } from "../components/MapView";
import { ConfirmDialog, ErrorState, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useMotion, useToast } from "../lib/contexts";
import { budgetTotals, daysBetween, fmtDate, inr, tripShareText } from "../lib/format";
import { estimateTransit } from "../lib/transit";
import { EXPENSE_CATEGORIES, EXPENSE_LABELS, type Activity, type BudgetView, type Day, type PackingItem, type Slot, type Trip } from "../lib/types";

const COLORS = ["#e9a24b", "#5f8f8b", "#e8795f", "#8fb996", "#c9b27c", "#7a9cc6", "#b58fb0"];
const TABS = ["Itinerary", "Budget", "Inclusions", "Map", "Packing", "Flight Tickets"] as const;
type Tab = (typeof TABS)[number];

const coreOf = (t: Trip, over: Partial<Trip> = {}) => {
  const x = { ...t, ...over };
  return {
    title: x.title, start_city: x.start_city, destination_id: x.destination_id, start_date: x.start_date, end_date: x.end_date,
    travelers: x.travelers, budget: x.budget, currency: "INR", travel_style: x.travel_style, pace: x.pace, transport: x.transport,
    accommodation: x.accommodation, interests: x.interests, notes: x.notes,
  };
};

export default function TripView() {
  const { id } = useParams();
  const { go } = useMotion();
  const toast = useToast();
  const trip = useAsync(() => api.get<Trip>(`/api/trips/${id}`), [id]);
  const [tab, setTab] = useState<Tab>("Itinerary");
  const [confirmDel, setConfirmDel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState("");

  if (trip.loading && !trip.data) return <div className="space-y-4"><Skeleton className="h-32" /><Skeleton className="h-72" /></div>;
  if (trip.error || !trip.data) return <ErrorState message={trip.error ?? "Trip not found."} onRetry={trip.reload} />;
  const t = trip.data;
  const total = t.expenses.reduce((a, e) => a + e.estimated, 0);

  const act = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    try { await fn(); } catch (e) { toast("error", (e as Error).message); } finally { setBusy(""); }
  };

  const duplicate = () => act("dup", async () => { const c = await api.post<Trip>(`/api/trips/${t.id}/duplicate`); toast("success", "Trip duplicated"); go(`/trips/${c.id}`); });
  const remove = () => act("del", async () => { await api.del(`/api/trips/${t.id}`); toast("success", "Trip deleted"); go("/trips"); });
  const exportPdf = () => act("pdf", async () => {
    const blob = await api.blob(`/api/trips/${t.id}/export.pdf`);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${t.title.replace(/[^\w-]+/g, "_")}.pdf`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  });
  const share = async () => {
    const text = tripShareText(t, total);
    try { await navigator.clipboard.writeText(text); toast("success", "Trip summary copied to clipboard"); }
    catch { toast("info", "Could not access the clipboard in this browser."); }
  };

  const label = t.generated_by === "llm" ? "AI-assisted plan" : t.generated_by === "rule_based" ? "Rule-based plan" : "Manual trip";

  return (
    <div className="space-y-6">
      <header className="card space-y-3 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl">{t.title}</h1>
            <p className="text-sm text-cream/70">{t.start_city} to {t.destination_name ?? "custom trip"} · {fmtDate(t.start_date)} to {fmtDate(t.end_date)} · {t.travelers} traveller(s)</p>
          </div>
          <div className="flex gap-2"><span className="chip">{t.status}</span><span className="chip">{label}</span></div>
        </div>
        <p className="text-sm">Estimated {inr(total)} <span className="text-cream/50">vs budget {inr(t.budget)}</span></p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost !py-1.5" onClick={() => setEditing(true)}><Pencil className="h-4 w-4" aria-hidden="true" />Edit details</button>
          <button className="btn-ghost !py-1.5" onClick={() => void duplicate()} disabled={busy === "dup"}><Copy className="h-4 w-4" aria-hidden="true" />Duplicate</button>
          <button className="btn-ghost !py-1.5" onClick={() => void exportPdf()} disabled={busy === "pdf"}>{busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}Export PDF</button>
          <button className="btn-ghost !py-1.5" onClick={() => void share()}><Share2 className="h-4 w-4" aria-hidden="true" />Copy summary</button>
          <button className="btn-danger !py-1.5" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
        </div>
      </header>

      {/* ixigo PLAN benchmark: Environmental & Weather Intelligence */}
      <EnvironmentalIntelligence
        destinationName={t.destination_name || t.title.replace("Trip to ", "")}
        latitude={t.days[0]?.activities[0]?.latitude}
        longitude={t.days[0]?.activities[0]?.longitude}
      />

      <div role="tablist" aria-label="Trip sections" className="flex flex-wrap gap-2">
        {TABS.map((x) => <button key={x} role="tab" aria-selected={tab === x} className={`chip !px-4 !py-1.5 text-sm ${tab === x ? "chip-active" : ""}`} onClick={() => setTab(x)}>{x}</button>)}
      </div>

      {tab === "Itinerary" && <ItineraryTab trip={t} onSaved={trip.reload} />}
      {tab === "Budget" && <BudgetTab trip={t} onSaved={trip.reload} />}
      {tab === "Inclusions" && (
        <InclusionsExclusions
          transportMode={t.transport}
          travelers={t.travelers}
          hotelTier={t.accommodation}
        />
      )}
      {tab === "Map" && <MapTab trip={t} />}
      {tab === "Packing" && <PackingTab trip={t} />}
      {tab === "Flight Tickets" && <FlightTicketTab trip={t} />}

      <ConfirmDialog open={confirmDel} title="Delete this trip?" text="The itinerary, budget and checklist will be permanently removed." onConfirm={() => { setConfirmDel(false); void remove(); }} onCancel={() => setConfirmDel(false)} />
      {editing && <EditDialog trip={t} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); trip.reload(); }} />}
    </div>
  );
}

/* ----------------------------------------------------------------- edit details */
function EditDialog({ trip, onClose, onSaved }: { trip: Trip; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [title, setTitle] = useState(trip.title);
  const [budget, setBudget] = useState(trip.budget);
  const [travelers, setTravelers] = useState(trip.travelers);
  const [notes, setNotes] = useState(trip.notes);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const save = async () => {
    if (!title.trim()) { setErr("Title is required."); return; }
    if (!(travelers >= 1)) { setErr("At least one traveller."); return; }
    if (!(budget >= 0)) { setErr("Budget cannot be negative."); return; }
    setBusy(true);
    try { await api.put(`/api/trips/${trip.id}`, coreOf(trip, { title: title.trim(), budget, travelers, notes })); toast("success", "Trip updated"); onSaved(); }
    catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Edit trip details">
      <div className="glass-strong w-full max-w-md space-y-3 rounded-3xl p-6">
        <h2 className="font-display text-xl">Edit trip details</h2>
        <div><label className="label" htmlFor="et">Title</label><input id="et" className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label" htmlFor="eb">Budget (₹)</label><input id="eb" type="number" min={0} className="input" value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></div>
          <div><label className="label" htmlFor="etr">Travellers</label><input id="etr" type="number" min={1} className="input" value={travelers} onChange={(e) => setTravelers(Number(e.target.value))} /></div>
        </div>
        <div><label className="label" htmlFor="en">Notes</label><textarea id="en" rows={3} className="input" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        <p className="text-xs text-cream/50">Changing travellers or budget does not regenerate the itinerary or the cost estimates; edit those in their tabs.</p>
        {err && <p role="alert" className="text-sm text-coral-accent">{err}</p>}
        <div className="flex justify-end gap-2"><button className="btn-ghost" onClick={onClose}>Cancel</button><button className="btn-primary" onClick={() => void save()} disabled={busy}>Save</button></div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- itinerary */
function ItineraryTab({ trip, onSaved }: { trip: Trip; onSaved: () => void }) {
  const toast = useToast();
  const [days, setDays] = useState<Day[]>(trip.days);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nd, setNd] = useState({ day: 1, title: "", slot: "morning" as Slot, cost: 0, hours: 1 });

  const mutate = (fn: (d: Day[]) => Day[]) => { setDays((cur) => fn(structuredClone(cur))); setDirty(true); };
  const patch = (di: number, ai: number, p: Partial<Activity>) => mutate((d) => { Object.assign(d[di].activities[ai], p); return d; });
  const remove = (di: number, ai: number) => mutate((d) => { d[di].activities.splice(ai, 1); return d; });
  const move = (di: number, ai: number, dir: -1 | 1) => mutate((d) => {
    const list = d[di].activities; const j = ai + dir;
    if (j < 0 || j >= list.length) return d;
    [list[ai], list[j]] = [list[j], list[ai]]; return d;
  });
  const add = () => {
    if (!nd.title.trim()) { toast("error", "Enter an activity title."); return; }
    mutate((d) => {
      const day = d.find((x) => x.day_number === nd.day);
      if (!day) return d;
      day.activities.push({ slot: nd.slot, title: nd.title.trim(), description: "", duration_hours: nd.hours, estimated_cost: nd.cost, latitude: null, longitude: null, position: day.activities.length });
      return d;
    });
    setNd({ ...nd, title: "" });
  };
  const save = async () => {
    setSaving(true);
    try {
      const body = days.map((d) => ({ ...d, activities: d.activities.map((a, i) => ({ ...a, position: i })) }));
      await api.put(`/api/trips/${trip.id}/itinerary`, body);
      toast("success", "Itinerary saved"); setDirty(false); onSaved();
    } catch (e) { toast("error", (e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      {trip.overview && <p className="card p-5 text-cream/85">{trip.overview}</p>}
      {days.length === 0 && <p className="card p-6 text-center text-cream/70">This trip has no itinerary yet. Add activities below.</p>}
      {days.map((d, di) => (
        <section key={d.day_number} className="card space-y-3 p-5" aria-label={`Day ${d.day_number}`}>
          <h2 className="font-display text-xl"><span className="text-amber-accent">Day {d.day_number}</span> · {d.title}</h2>
          {d.activities.length === 0 && <p className="text-sm text-cream/60">No activities. Add one below.</p>}
          <ol className="space-y-2">
            {d.activities.map((a, ai) => {
              const transit = ai < d.activities.length - 1 ? estimateTransit(a, d.activities[ai + 1], ai) : null;
              return (
                <div key={ai} className="space-y-2">
                  <li className="grid gap-2 rounded-2xl bg-forest-950/50 p-3 sm:grid-cols-[100px_1fr_90px_90px_auto] sm:items-center">
                    <select aria-label="Time of day" className="input !py-1.5" value={a.slot} onChange={(e) => patch(di, ai, { slot: e.target.value as Slot })}>{["morning", "afternoon", "evening"].map((s) => <option key={s}>{s}</option>)}</select>
                    <input aria-label="Activity title" className="input !py-1.5" value={a.title} onChange={(e) => patch(di, ai, { title: e.target.value })} />
                    <input aria-label="Hours" type="number" min={0} step={0.5} className="input !py-1.5" value={a.duration_hours} onChange={(e) => patch(di, ai, { duration_hours: Number(e.target.value) })} />
                    <input aria-label="Estimated cost per person" type="number" min={0} className="input !py-1.5" value={a.estimated_cost} onChange={(e) => patch(di, ai, { estimated_cost: Number(e.target.value) })} />
                    <div className="flex gap-1">
                      <button className="btn-ghost !p-2" aria-label="Move up" onClick={() => move(di, ai, -1)} disabled={ai === 0}><ArrowUp className="h-4 w-4" /></button>
                      <button className="btn-ghost !p-2" aria-label="Move down" onClick={() => move(di, ai, 1)} disabled={ai === d.activities.length - 1}><ArrowDown className="h-4 w-4" /></button>
                      <button className="btn-danger !p-2" aria-label={`Remove ${a.title}`} onClick={() => remove(di, ai)}><Trash2 className="h-4 w-4" /></button>
                    </div>
                    {a.description && <p className="text-xs text-cream/60 sm:col-span-5">{a.description}</p>}
                    {a.image_url ? (
                      <div className="flex items-center gap-3 rounded-xl bg-black/40 p-2 sm:col-span-5">
                        <img src={a.image_url} alt={a.title} className="h-12 w-16 rounded-lg object-cover" />
                        <div>
                          <span className="text-[10px] font-bold text-amber-accent uppercase tracking-wider">Verified Landmark Photo</span>
                          <p className="text-xs text-cream/70">Self-guided route stop · No guide required</p>
                        </div>
                      </div>
                    ) : null}
                  </li>
                  {transit && (
                    <div className="flex items-center gap-2 py-1 pl-4 text-xs sm:pl-28">
                      <div className="flex items-center gap-2 rounded-full border border-teal-500/25 bg-[#081b16]/90 px-3 py-1 text-teal-300 shadow-sm backdrop-blur-sm">
                        <span className="font-semibold text-white">
                          {transit.mode === "walk" ? "🚶" : "🚗"} {transit.durationLabel}
                        </span>
                        <span className="text-white/30">·</span>
                        <span className="text-cream/80">{transit.distanceLabel}</span>
                        <span className="hidden sm:inline text-white/30">|</span>
                        <span className="hidden sm:inline text-[11px] text-cream/50">{transit.note}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </ol>
        </section>
      ))}

      {days.length > 0 && (
        <div className="card grid gap-3 p-5 sm:grid-cols-[90px_110px_1fr_90px_90px_auto] sm:items-end">
          <div><label className="label" htmlFor="ad">Day</label><select id="ad" className="input" value={nd.day} onChange={(e) => setNd({ ...nd, day: Number(e.target.value) })}>{days.map((d) => <option key={d.day_number}>{d.day_number}</option>)}</select></div>
          <div><label className="label" htmlFor="as">Time</label><select id="as" className="input" value={nd.slot} onChange={(e) => setNd({ ...nd, slot: e.target.value as Slot })}>{["morning", "afternoon", "evening"].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label className="label" htmlFor="at">New activity</label><input id="at" className="input" value={nd.title} onChange={(e) => setNd({ ...nd, title: e.target.value })} placeholder="e.g. Sunset at the lake" /></div>
          <div><label className="label" htmlFor="ah">Hours</label><input id="ah" type="number" min={0} step={0.5} className="input" value={nd.hours} onChange={(e) => setNd({ ...nd, hours: Number(e.target.value) })} /></div>
          <div><label className="label" htmlFor="ac">Cost ₹</label><input id="ac" type="number" min={0} className="input" value={nd.cost} onChange={(e) => setNd({ ...nd, cost: Number(e.target.value) })} /></div>
          <button className="btn-ghost" onClick={add}><Plus className="h-4 w-4" aria-hidden="true" />Add</button>
        </div>
      )}

      <div className="sticky bottom-4 z-10 flex items-center gap-3">
        <button className="btn-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Save itinerary</button>
        {dirty && <span className="glass rounded-full px-3 py-1 text-xs">Unsaved changes</span>}
        {dirty && <button className="btn-ghost" onClick={() => { setDays(trip.days); setDirty(false); }}>Discard</button>}
      </div>

      {(trip.tips.length > 0 || trip.weather_alternatives.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {trip.tips.length > 0 && <div className="card p-5"><h2 className="font-display text-lg">Practical tips</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cream/80">{trip.tips.map((x) => <li key={x}>{x}</li>)}</ul></div>}
          {trip.weather_alternatives.length > 0 && <div className="card p-5"><h2 className="font-display text-lg">If plans change</h2><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-cream/80">{trip.weather_alternatives.map((x) => <li key={x}>{x}</li>)}</ul></div>}
        </div>
      )}

      {/* Veena World Standard: Guaranteed Tour Inclusions & Exclusions */}
      <InclusionsExclusions
        transportMode={trip.transport}
        travelers={trip.travelers}
        hotelTier={trip.accommodation}
      />
    </div>
  );
}

/* ----------------------------------------------------------------- budget */
function BudgetTab({ trip, onSaved }: { trip: Trip; onSaved: () => void }) {
  const toast = useToast();
  const server = useAsync(() => api.get<BudgetView>(`/api/trips/${trip.id}/budget`), [trip.id, trip.updated_at]);
  const initial = useMemo(() => {
    const est: Record<string, number> = {}; const actual: Record<string, number> = {};
    EXPENSE_CATEGORIES.forEach((c) => { const e = trip.expenses.find((x) => x.category === c); est[c] = e?.estimated ?? 0; actual[c] = e?.actual ?? 0; });
    return { est, actual };
  }, [trip.expenses]);
  const [est, setEst] = useState(initial.est);
  const [actual, setActual] = useState(initial.actual);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setEst(initial.est); setActual(initial.actual); }, [initial]);

  const days = daysBetween(trip.start_date, trip.end_date);
  const tot = budgetTotals(est, trip.travelers, days, trip.budget);
  const actualTotal = Object.values(actual).reduce((a, b) => a + (b || 0), 0);
  const pie = EXPENSE_CATEGORIES.map((c) => ({ name: EXPENSE_LABELS[c], value: est[c] })).filter((x) => x.value > 0);
  const compare = EXPENSE_CATEGORIES.map((c) => ({ name: EXPENSE_LABELS[c].split(" ")[0], Estimated: est[c], Actual: actual[c] }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put(`/api/trips/${trip.id}/budget`, { expenses: EXPENSE_CATEGORIES.map((c) => ({ category: c, estimated: est[c] || 0, actual: actual[c] || 0 })) });
      toast("success", "Budget saved"); server.reload(); onSaved();
    } catch (e) { toast("error", (e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-cream/55">All amounts are estimates from sample data in INR for the whole group. Edit any figure; totals update immediately. Enter actual spend as you travel.</p>
      {tot.over && (
        <div role="alert" className="card flex gap-3 border-coral-accent/50 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-coral-accent" aria-hidden="true" />
          <div>Estimated total is {inr(Math.abs(tot.difference))} over your {inr(trip.budget)} budget.
            {server.data && server.data.alternatives.length > 0 && <ul className="mt-1 list-disc pl-5 text-cream/80">{server.data.alternatives.map((a) => <li key={a}>{a}</li>)}</ul>}</div>
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card space-y-2 p-5">
          <div className="grid grid-cols-[1fr_110px_110px] gap-2 text-xs uppercase tracking-wide text-cream/50"><span>Category</span><span>Estimated ₹</span><span>Actual ₹</span></div>
          {EXPENSE_CATEGORIES.map((c) => (
            <div key={c} className="grid grid-cols-[1fr_110px_110px] items-center gap-2">
              <label htmlFor={`e-${c}`} className="text-sm">{EXPENSE_LABELS[c]}</label>
              <input id={`e-${c}`} type="number" min={0} className="input !py-1.5" value={est[c]} onChange={(e) => setEst({ ...est, [c]: Math.max(0, Number(e.target.value)) })} />
              <input aria-label={`${EXPENSE_LABELS[c]} actual`} type="number" min={0} className="input !py-1.5" value={actual[c]} onChange={(e) => setActual({ ...actual, [c]: Math.max(0, Number(e.target.value)) })} />
            </div>
          ))}
          <div className="space-y-1 border-t border-white/10 pt-3 text-sm">
            <p className="flex justify-between font-semibold"><span>Total estimate</span><span>{inr(tot.total)}</span></p>
            <p className="flex justify-between text-cream/70"><span>Per person</span><span>{inr(tot.perPerson)}</span></p>
            <p className="flex justify-between text-cream/70"><span>Per day ({days} days)</span><span>{inr(tot.perDay)}</span></p>
            <p className="flex justify-between text-cream/70"><span>Actual spend so far</span><span>{inr(actualTotal)}</span></p>
            {trip.budget > 0 && <p className={`flex justify-between ${tot.over ? "text-coral-accent" : "text-emerald-300"}`}><span>{tot.over ? "Over budget by" : "Under budget by"}</span><span>{inr(Math.abs(tot.difference))}</span></p>}
          </div>
          <button className="btn-primary mt-2" onClick={() => void save()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Save budget</button>
        </div>

        <div className="space-y-5">
          <div className="card p-5">
            <h2 className="font-display text-lg">Expense distribution</h2>
            <div className="h-64" role="img" aria-label="Donut chart of estimated expenses by category">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={pie} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2} isAnimationActive>
                  {pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie>
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "#0d211a", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12 }} /></PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">{pie.map((p, i) => <li key={p.name} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />{p.name}</li>)}</ul>
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg">Daily spending (saved estimate)</h2>
            {server.data && server.data.daily.length > 0 ? (
              <div className="h-52" role="img" aria-label="Bar chart of estimated spending per day">
                <ResponsiveContainer width="100%" height="100%"><BarChart data={server.data.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.1)" /><XAxis dataKey="day" tick={{ fill: "#f1ede4", fontSize: 11 }} /><YAxis tick={{ fill: "#f1ede4", fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "#0d211a", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12 }} /><Bar dataKey="amount" fill="#e9a24b" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-cream/60">{server.loading ? "Loading..." : "Save the budget to see the daily split. Transport is placed on the first and last day."}</p>}
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg">Budget versus actual</h2>
            <div className="h-56" role="img" aria-label="Bar chart comparing estimated and actual spending by category">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={compare}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.1)" /><XAxis dataKey="name" tick={{ fill: "#f1ede4", fontSize: 10 }} /><YAxis tick={{ fill: "#f1ede4", fontSize: 11 }} />
                <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "#0d211a", border: "1px solid rgba(255,255,255,.15)", borderRadius: 12 }} /><Legend />
                <Bar dataKey="Estimated" fill="#5f8f8b" radius={[4, 4, 0, 0]} /><Bar dataKey="Actual" fill="#e9a24b" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- map */
function MapTab({ trip }: { trip: Trip }) {
  const [view, setView] = useState<"map" | "list">("map");
  const stops = useMemo(() => {
    const out: (MapPoint & { day: number; slot: string })[] = [];
    trip.days.forEach((d) => d.activities.forEach((a) => {
      if (a.latitude !== null && a.longitude !== null) out.push({ id: `${d.day_number}-${out.length}`, lat: a.latitude, lng: a.longitude, title: a.title, subtitle: `Day ${d.day_number}, ${a.slot}`, order: out.length + 1, day: d.day_number, slot: a.slot });
    }));
    return out;
  }, [trip.days]);

  if (stops.length === 0) return <p className="card p-8 text-center text-cream/70">None of this trip's activities have map coordinates yet. Activities you add by hand are not placed on the map.</p>;
  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Map or list" className="flex gap-2">
        {(["map", "list"] as const).map((v) => <button key={v} role="tab" aria-selected={view === v} className={`chip ${view === v ? "chip-active" : ""}`} onClick={() => setView(v)}>{v === "map" ? "Map view" : "List view"}</button>)}
      </div>
      {view === "map" ? <MapView points={stops} route className="h-[520px]" /> : (
        <ol className="card divide-y divide-white/10">{stops.map((s) => <li key={s.id} className="flex gap-3 p-3 text-sm"><span className="font-bold text-amber-accent">{s.order}.</span><span>{s.title}<span className="block text-xs text-cream/55">{s.subtitle} · {s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span></span></li>)}</ol>
      )}
      <p className="text-xs text-cream/50">The dashed line joins stops in itinerary order; it is not a driving route. Pin positions are approximate.</p>
    </div>
  );
}

/* ----------------------------------------------------------------- packing */
function PackingTab({ trip }: { trip: Trip }) {
  const toast = useToast();
  const [items, setItems] = useState<PackingItem[]>(trip.packing);
  const [label, setLabel] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const packed = items.filter((i) => i.packed).length;
  const pct = items.length ? Math.round((100 * packed) / items.length) : 0;

  const save = async () => {
    setSaving(true);
    try { setItems(await api.put<PackingItem[]>(`/api/trips/${trip.id}/packing`, items.map(({ label: l, packed: p }) => ({ label: l, packed: p })))); setDirty(false); toast("success", "Checklist saved"); }
    catch (e) { toast("error", (e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="card space-y-4 p-5">
      <div>
        <div className="flex justify-between text-sm"><span>Packing progress</span><span>{packed} of {items.length} ({pct}%)</span></div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Packing progress"><div className="h-full bg-amber-accent transition-all duration-500" style={{ width: `${pct}%` }} /></div>
      </div>
      {items.length === 0 && <p className="text-sm text-cream/60">Your checklist is empty. Add the first item below.</p>}
      <ul className="grid gap-1 sm:grid-cols-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-white/5">
            <input id={`pk-${i}`} type="checkbox" checked={it.packed} onChange={() => { setItems(items.map((x, j) => (j === i ? { ...x, packed: !x.packed } : x))); setDirty(true); }} />
            <label htmlFor={`pk-${i}`} className={`flex-1 text-sm ${it.packed ? "text-cream/45 line-through" : ""}`}>{it.label}</label>
            <button className="text-cream/50 hover:text-coral-accent" aria-label={`Remove ${it.label}`} onClick={() => { setItems(items.filter((_, j) => j !== i)); setDirty(true); }}><Trash2 className="h-4 w-4" /></button>
          </li>
        ))}
      </ul>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (!label.trim()) return; setItems([...items, { label: label.trim(), packed: false }]); setLabel(""); setDirty(true); }}>
        <label htmlFor="newpack" className="sr-only">New checklist item</label>
        <input id="newpack" className="input" maxLength={160} placeholder="Add an item" value={label} onChange={(e) => setLabel(e.target.value)} />
        <button className="btn-ghost" type="submit"><Plus className="h-4 w-4" aria-hidden="true" />Add</button>
      </form>
      <button className="btn-primary" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Save checklist</button>
    </div>
  );
}

/* ----------------------------------------------------------------- flight ticket tab */
function FlightTicketTab({ trip }: { trip: Trip }) {
  const navigate = useNavigate();
  const seats = ["D1", "E1"];
  const flightNo = "VX-8754";
  const refCode = "VX-98241";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold">Confirmed Flight Tickets</h2>
          <p className="text-xs text-cream/70">MUSAFIQ Digital Boarding Pass &amp; Aircraft Seat Reservation</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="btn-ghost !py-2 text-xs">
            <Printer className="h-4 w-4 mr-1 inline" /> Print Boarding Pass
          </button>
          <button
            onClick={() => navigate(`/flights?from=${encodeURIComponent(trip.start_city)}&to=${encodeURIComponent(trip.destination_name || trip.title.replace("Trip to ", ""))}`)}
            className="btn-primary !py-2 text-xs"
          >
            <Plane className="h-4 w-4 mr-1 inline" /> Open Seat Visualizer
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-r from-[#102320] to-[#0a1815] shadow-2xl">
        <div className="flex items-center justify-between bg-gradient-to-r from-teal-700 to-emerald-900 px-6 py-3 text-white">
          <div className="flex items-center gap-2 font-display text-lg font-bold">
            <Plane className="h-5 w-5" /> MUSAFIQ E-Ticket &amp; Boarding Pass
          </div>
          <span className="text-xs font-mono font-bold tracking-widest">{refCode}</span>
        </div>

        <div className="grid gap-6 p-6 sm:grid-cols-3">
          <div className="space-y-4 sm:col-span-2">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] uppercase text-cream/50">Passenger</span>
                <p className="font-semibold text-white">Demo Traveller ({trip.travelers} Pax)</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-cream/50">Flight</span>
                <p className="font-mono font-bold text-white">{flightNo}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-cream/50">Class</span>
                <p className="font-bold text-[#ff6b2b]">Business Class</p>
              </div>
            </div>

            <div className="flex items-center justify-between border-y border-white/10 py-3">
              <div>
                <p className="font-display text-3xl font-black text-white">{trip.start_city.slice(0, 3).toUpperCase()}</p>
                <p className="text-xs text-cream/70">{trip.start_city}</p>
              </div>
              <div className="text-center">
                <Plane className="mx-auto h-4 w-4 text-teal-400" />
                <span className="text-[10px] text-cream/50">Scheduled</span>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl font-black text-white">{(trip.destination_name || "DST").slice(0, 3).toUpperCase()}</p>
                <p className="text-xs text-cream/70">{trip.destination_name || "Destination"}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-cream/50">Departure</span>
                <p className="font-semibold text-white">{fmtDate(trip.start_date)}</p>
              </div>
              <div>
                <span className="text-[10px] text-cream/50">Boarding</span>
                <p className="font-semibold text-white">06:05 AM</p>
              </div>
              <div>
                <span className="text-[10px] text-cream/50">Gate</span>
                <p className="font-semibold text-emerald-400">14B</p>
              </div>
              <div>
                <span className="text-[10px] text-cream/50">Seats</span>
                <p className="font-mono font-bold text-[#ff6b2b]">{seats.join(", ")}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-t border-dashed border-white/20 pt-4 sm:border-t-0 sm:border-l sm:pl-6 sm:pt-0">
            <div className="rounded-xl bg-white p-2 text-slate-950 shadow-md">
              <QrCode className="h-24 w-24" />
            </div>
            <p className="mt-2 text-center font-mono text-[10px] tracking-widest text-cream/60">
              ||||| | ||||| || |||
            </p>
            <span className="mt-1 text-[9px] uppercase tracking-wider text-emerald-400">Gate Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
