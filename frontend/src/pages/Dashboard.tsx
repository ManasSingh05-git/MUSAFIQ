import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, CloudSun, Heart, Plane, Star } from "lucide-react";
import { useMemo, useRef, useState, type MouseEvent } from "react";
import { dailyCost } from "../components/DestinationCard";
import { TLink } from "../components/Layout";
import { MapView, type MapPoint } from "../components/MapView";
import { DestinationImage, EmptyState, Ring, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useAuth, useMotion } from "../lib/contexts";
import { useFavorites } from "../lib/favorites";
import { fmtDate, inr } from "../lib/format";
import { getRecent } from "../lib/recent";
import type { Destination, GenerateResult, Preferences, Stats, TripSummary, Weather } from "../lib/types";

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function Dashboard() {
  const { user } = useAuth();
  const { go, reducedMotion } = useMotion();
  const fav = useFavorites();
  const [idx, setIdx] = useState(0);
  const dests = useAsync(() => api.get<Destination[]>("/api/destinations"), []);
  const trips = useAsync(() => api.get<TripSummary[]>("/api/trips"), []);
  const stats = useAsync(() => api.get<Stats>("/api/stats"), []);
  const prefs = useAsync(() => api.get<Preferences>("/api/auth/preferences"), []);
  const list = dests.data ?? [];
  const featured = list.length ? list[idx % list.length] : null;
  const weather = useAsync(
    () => (featured ? api.get<Weather>(`/api/weather?lat=${featured.latitude}&lon=${featured.longitude}`) : Promise.resolve(null)),
    [featured?.id],
  );
  // Rule-based picks (use_llm false => no AI quota is used and the label stays honest)
  const recs = useAsync(async () => {
    const p = prefs.data;
    if (!p) return null;
    const start = new Date(); start.setDate(start.getDate() + 30);
    const end = new Date(start); end.setDate(end.getDate() + 2);
    const r = await api.post<GenerateResult>("/api/trips/generate", {
      start_city: p.home_city, destination_id: null, start_date: iso(start), end_date: iso(end), travelers: 2, budget: 15000,
      interests: p.interests, travel_style: p.travel_style, use_llm: false,
    });
    return r.recommendations;
  }, [prefs.data?.home_city]);

  const tilt = useRef<HTMLDivElement>(null);
  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !tilt.current) return;
    const r = tilt.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    tilt.current.style.transform = `perspective(900px) rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`;
  };
  const onLeave = () => { if (tilt.current) tilt.current.style.transform = ""; };

  const points: MapPoint[] = useMemo(() => list.map((d) => ({ id: d.id, lat: d.latitude, lng: d.longitude, title: d.name, subtitle: d.country, selected: d.id === featured?.id })), [list, featured?.id]);
  const upcoming = (trips.data ?? []).filter((t) => t.status !== "completed");
  const next = upcoming.length ? [...upcoming].sort((a, b) => a.start_date.localeCompare(b.start_date))[0] : null;
  const recent = getRecent().map((id) => list.find((d) => d.id === id)).filter((d): d is Destination => !!d).slice(0, 4);
  const favDests = fav.favs.map((f) => f.destination);
  const s = stats.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl">Welcome back, {user?.name.split(" ")[0]}</h1>
          <p className="text-sm text-cream/65">Your trips, favourites and travel stats. Destination data is a sample dataset.</p>
        </div>
        <div className="flex gap-2"><TLink to="/trips/new" className="btn-primary">Plan a trip</TLink><TLink to="/trips" className="btn-ghost">My trips</TLink><TLink to="/map" className="btn-ghost">Open map</TLink></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        {/* featured destination */}
        <div ref={tilt} onMouseMove={onMove} onMouseLeave={onLeave} className="card group relative min-h-[420px] overflow-hidden transition-transform duration-200">
          {featured ? (
            <>
              <DestinationImage dest={featured} className="absolute inset-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />
              <div className="relative flex h-full min-h-[420px] flex-col justify-between p-6">
                <div className="flex items-center justify-between">
                  <span className="chip bg-black/40 backdrop-blur">{featured.region}, {featured.country}</span>
                  <div className="flex gap-2">
                    <button className="btn-ghost !p-2" aria-label="Previous destination" onClick={() => setIdx((i) => (i - 1 + list.length) % list.length)}><ChevronLeft className="h-4 w-4" /></button>
                    <button className="btn-ghost !p-2" aria-label="Next destination" onClick={() => setIdx((i) => (i + 1) % list.length)}><ChevronRight className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="space-y-3">
                  <motion.h2 key={featured.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="font-display text-4xl">{featured.name}</motion.h2>
                  <p className="max-w-lg text-sm text-cream/85">{featured.description}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <TLink to={`/discover/${featured.id}`} className="btn-primary">Explore {featured.name}</TLink>
                    <button className="btn-ghost" aria-pressed={fav.isFav(featured.id)} onClick={() => void fav.toggle(featured.id)}>
                      <Heart className={`h-4 w-4 ${fav.isFav(featured.id) ? "fill-coral-accent text-coral-accent" : ""}`} aria-hidden="true" />{fav.isFav(featured.id) ? "Saved" : "Favourite"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : <Skeleton className="absolute inset-0" />}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-2">
          {/* weather */}
          <div className="rounded-3xl bg-[#f0e6c8] p-5 text-forest-950 shadow-glass">
            <p className="flex items-center gap-2 text-sm font-semibold"><CloudSun className="h-4 w-4" aria-hidden="true" />{featured?.name ?? "Weather"}</p>
            {weather.data?.available ? (
              <div className="mt-3"><p className="font-display text-5xl">{Math.round(weather.data.temperature_c ?? 0)}°</p>
                <p className="text-xs">H {weather.data.high_c}° · L {weather.data.low_c}°</p><p className="mt-1 text-[10px] opacity-70">Live: {weather.data.source}</p></div>
            ) : <p className="mt-3 text-sm opacity-80">{weather.loading ? "Loading..." : "Live weather is unavailable right now."}</p>}
          </div>
          {/* transport */}
          <div className="rounded-3xl bg-[#f3d5d0] p-5 text-forest-950 shadow-glass">
            <p className="flex items-center gap-2 text-sm font-semibold"><Plane className="h-4 w-4" aria-hidden="true" />Next trip</p>
            {next ? (
              <div className="mt-3 text-sm"><p className="font-semibold">{next.start_city} to {next.destination_name ?? "custom"}</p><p>{fmtDate(next.start_date)} to {fmtDate(next.end_date)}</p>
                <TLink to={`/trips/${next.id}`} className="mt-2 inline-block text-xs underline">Open itinerary</TLink></div>
            ) : <p className="mt-3 text-sm opacity-80">No upcoming trip. Plan one to see its route here.</p>}
          </div>
          {/* map */}
          <div className="card overflow-hidden p-4 sm:col-span-2">
            <p className="mb-2 font-display text-lg">Destinations</p>
            {points.length ? <MapView points={points} className="h-48" onSelect={(p) => { const i = list.findIndex((d) => d.id === p.id); if (i >= 0) setIdx(i); }} /> : <Skeleton className="h-48" />}
          </div>
        </div>
      </div>

      {/* stats */}
      <section className="card grid items-center gap-5 p-5 sm:grid-cols-[auto_1fr]" aria-label="Travel statistics">
        <div className="flex flex-wrap justify-around gap-6">
          <Ring value={s?.saved_destinations ?? 0} max={Math.max(list.length, 1)} label="Saved destinations" />
          <Ring value={s?.countries_visited ?? 0} max={Math.max(new Set(list.map((d) => d.country)).size, 1)} label="Countries visited" color="#5f8f8b" />
          <Ring value={s?.total_trips ?? 0} max={Math.max(s?.total_trips ?? 1, 1)} label="Trips planned" color="#e8795f" />
        </div>
        <div>
          <p className="text-sm">Trips completed: <strong>{s?.completed_trips ?? 0}</strong> of {s?.total_trips ?? 0}</p>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={s?.trip_completion_pct ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label="Trip completion">
            <div className="h-full bg-amber-accent transition-all duration-700" style={{ width: `${s?.trip_completion_pct ?? 0}%` }} />
          </div>
          <p className="mt-2 text-xs text-cream/50">{s?.note ?? "Computed from your saved trips."}</p>
        </div>
      </section>

      {/* favourites */}
      <section aria-labelledby="favs" className="space-y-3">
        <div className="flex items-end justify-between"><h2 id="favs" className="font-display text-2xl">Favourite destinations</h2><TLink to="/discover" className="text-sm text-amber-accent hover:underline">Explore destinations</TLink></div>
        {favDests.length === 0 ? (
          <EmptyState title="No favourites yet" text="Tap the heart on any destination to keep it here." action={<TLink to="/discover" className="btn-primary">Discover</TLink>} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favDests.slice(0, 3).map((d) => (
              <TLink key={d.id} to={`/discover/${d.id}`} className="card group block overflow-hidden">
                <DestinationImage dest={d} className="h-36" />
                <div className="p-4"><p className="font-display text-lg">{d.name}</p><p className="flex items-center gap-1 text-xs text-cream/60"><Star className="h-3 w-3 text-amber-accent" aria-hidden="true" />{d.country} · {inr(dailyCost(d))}/day est.</p></div>
              </TLink>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card space-y-3 p-5" aria-labelledby="up">
          <h2 id="up" className="font-display text-xl">Upcoming trips</h2>
          {upcoming.length === 0 ? <p className="text-sm text-cream/60">Nothing planned yet.</p> : upcoming.slice(0, 4).map((t) => (
            <TLink key={t.id} to={`/trips/${t.id}`} className="flex justify-between rounded-xl bg-forest-950/50 px-3 py-2 text-sm hover:bg-white/10"><span>{t.title}</span><span className="text-cream/60">{fmtDate(t.start_date)}</span></TLink>
          ))}
        </section>
        <section className="card space-y-3 p-5" aria-labelledby="rec">
          <h2 id="rec" className="font-display text-xl">Recommended for you</h2>
          <p className="text-xs text-cream/50">Rule-based picks from sample data, for a 3-day trip about a month from now (₹15,000, 2 travellers) using your saved preferences.</p>
          {recs.loading ? <Skeleton className="h-24" /> : recs.data && recs.data.length > 0 ? recs.data.map((r) => (
            <TLink key={r.destination_id} to={`/trips/new?destination=${r.destination_id}`} className="block rounded-xl bg-forest-950/50 px-3 py-2 text-sm hover:bg-white/10">
              <span className="font-semibold">{r.name}</span> <span className="text-cream/60">score {r.score}/100</span>
              <span className="block text-xs text-cream/60">{r.breakdown.interest_match?.reason}</span>
            </TLink>
          )) : <p className="text-sm text-cream/60">Set your home city and interests in Settings to see picks.</p>}
        </section>
      </div>

      {recent.length > 0 && (
        <section aria-labelledby="rv" className="space-y-3">
          <h2 id="rv" className="font-display text-xl">Recently viewed</h2>
          <div className="flex flex-wrap gap-2">{recent.map((d) => <button key={d.id} className="chip hover:border-amber-accent" onClick={() => go(`/discover/${d.id}`)}>{d.name}</button>)}</div>
        </section>
      )}
    </div>
  );
}
