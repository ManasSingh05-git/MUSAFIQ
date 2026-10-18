import { Clock, Heart, Info, Ticket } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { dailyCost } from "../components/DestinationCard";
import { TLink } from "../components/Layout";
import { MapView, type MapPoint } from "../components/MapView";
import { AttractionImage, DestinationImage, ErrorState, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync } from "../lib/contexts";
import { useFavorites } from "../lib/favorites";
import { inr, monthName } from "../lib/format";
import { pushRecent } from "../lib/recent";
import type { DestinationDetail, Weather } from "../lib/types";

export default function DestinationDetailPage() {
  const { id } = useParams();
  const fav = useFavorites();
  const { data: d, error, loading, reload } = useAsync(() => api.get<DestinationDetail>(`/api/destinations/${id}`), [id]);
  const weather = useAsync(
    () => (d ? api.get<Weather>(`/api/weather?lat=${d.latitude}&lon=${d.longitude}`) : Promise.resolve(null)),
    [d?.id],
  );
  useEffect(() => { if (d) pushRecent(d.id); }, [d]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-72" /><Skeleton className="h-40" /></div>;
  if (error || !d) return <ErrorState message={error ?? "Destination not found."} onRetry={reload} />;

  const points: MapPoint[] = d.attractions.map((a, i) => ({ id: a.id, lat: a.latitude, lng: a.longitude, title: a.name, subtitle: a.description, order: i + 1 }));
  const isFav = fav.isFav(d.id);

  return (
    <div className="space-y-8">
      <section className="card group relative overflow-hidden">
        <DestinationImage dest={d} className="h-72 sm:h-96" />
        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-4 p-6">
          <div>
            <p className="text-sm text-cream/75">{d.region}, {d.country}</p>
            <h1 className="font-display text-4xl sm:text-5xl">{d.name}</h1>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost" aria-pressed={isFav} onClick={() => void fav.toggle(d.id)}>
              <Heart className={`h-4 w-4 ${isFav ? "fill-coral-accent text-coral-accent" : ""}`} aria-hidden="true" />{isFav ? "Saved" : "Save"}
            </button>
            <TLink to={`/trips/new?destination=${d.id}`} className="btn-primary">Plan a trip here</TLink>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card space-y-4 p-6 lg:col-span-2">
          <p className="text-cream/85">{d.description}</p>
          <div className="flex flex-wrap gap-2">{d.categories.map((c) => <span key={c} className="chip">{c}</span>)}{d.interests.map((c) => <span key={c} className="chip chip-active">{c}</span>)}</div>
          <p className="flex gap-2 rounded-2xl bg-forest-950/50 p-4 text-sm"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-accent" aria-hidden="true" />{d.practical_info}</p>
        </section>
        <aside className="card space-y-3 p-6 text-sm">
          <h2 className="font-display text-xl">Practical facts</h2>
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-cream/60">Suggested stay</dt><dd>{d.suggested_days} days</dd></div>
            <div className="flex justify-between"><dt className="text-cream/60">Climate</dt><dd>{d.climate}</dd></div>
            <div className="flex justify-between"><dt className="text-cream/60">Crowds</dt><dd>{d.crowd_level}</dd></div>
            <div className="flex justify-between"><dt className="text-cream/60">Best months</dt><dd>{d.best_months.map(monthName).join(", ")}</dd></div>
            <div className="flex justify-between"><dt className="text-cream/60">Est. per person/day</dt><dd>{inr(dailyCost(d))}</dd></div>
            <div className="flex justify-between"><dt className="text-cream/60">Stay per night (room)</dt><dd>{inr(d.stay_per_night_inr)}</dd></div>
          </dl>
          <p className="text-xs text-cream/50">Costs are indicative sample estimates in INR, not live prices.</p>
          <div className="rounded-2xl bg-forest-950/50 p-3">
            <p className="text-xs uppercase tracking-wide text-cream/50">Weather now</p>
            {weather.data?.available ? (
              <p>{weather.data.temperature_c}°C (high {weather.data.high_c}°, low {weather.data.low_c}°) <span className="text-xs text-cream/50">via {weather.data.source}</span></p>
            ) : <p className="text-cream/60">{weather.loading ? "Loading..." : "Live weather is not available."}</p>}
          </div>
        </aside>
      </div>

      <section className="space-y-4" aria-labelledby="att">
        <h2 id="att" className="font-display text-2xl">Attractions and activities</h2>
        <div className="grid gap-5 lg:grid-cols-2">
          <ul className="space-y-4">
            {d.attractions.map((a, i) => (
              <li key={a.id} className="card group overflow-hidden !p-0 transition hover:border-amber-accent/40">
                <div className="flex flex-col sm:flex-row">
                  {a.image_url ? (
                    <div className="h-40 sm:h-auto sm:w-48 shrink-0 overflow-hidden">
                      <AttractionImage src={a.image_url} alt={a.name} className="h-full w-full" />
                    </div>
                  ) : null}
                  <div className="flex flex-1 gap-3 p-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-accent text-sm font-bold text-forest-950">{i + 1}</span>
                    <div className="space-y-1">
                      <h3 className="font-semibold text-cream">{a.name} {a.crowded && <span className="chip ml-1 text-xs">often crowded</span>}</h3>
                      <p className="text-sm text-cream/70">{a.description}</p>
                      <p className="flex flex-wrap gap-4 pt-1 text-xs text-cream/60">
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden="true" />{a.duration_hours} h, best in {a.best_time}</span>
                        <span className="inline-flex items-center gap-1"><Ticket className="h-3 w-3" aria-hidden="true" />{a.entry_fee_inr ? inr(a.entry_fee_inr) : "Free"}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div>
            <MapView points={points} className="h-[420px]" />
            <p className="mt-2 text-xs text-cream/50">Pin positions are approximate; check the exact location before travelling.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
