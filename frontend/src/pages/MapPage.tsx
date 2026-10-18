import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { TLink } from "../components/Layout";
import { MapView, type MapPoint } from "../components/MapView";
import { ErrorState, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useAuth } from "../lib/contexts";
import type { Destination, DestinationDetail, Trip, TripSummary } from "../lib/types";

export default function MapPage() {
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const [view, setView] = useState<"map" | "list">("map");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(sp.get("destination") ? Number(sp.get("destination")) : null);
  const tripId = sp.get("trip");

  const dests = useAsync(() => api.get<Destination[]>("/api/destinations"), []);
  const trips = useAsync(() => (user ? api.get<TripSummary[]>("/api/trips") : Promise.resolve([] as TripSummary[])), [user?.id]);
  const trip = useAsync(() => (tripId && user ? api.get<Trip>(`/api/trips/${tripId}`) : Promise.resolve(null)), [tripId, user?.id]);
  const detail = useAsync(() => (selected ? api.get<DestinationDetail>(`/api/destinations/${selected}`) : Promise.resolve(null)), [selected]);

  const filtered = useMemo(() => (dests.data ?? []).filter((d) => `${d.name} ${d.country} ${d.region}`.toLowerCase().includes(q.toLowerCase())), [dests.data, q]);

  const points: MapPoint[] = useMemo(() => {
    if (trip.data) {
      const out: MapPoint[] = [];
      trip.data.days.forEach((d) => d.activities.forEach((a) => {
        if (a.latitude !== null && a.longitude !== null) out.push({ id: `t-${out.length}`, lat: a.latitude, lng: a.longitude, title: a.title, subtitle: `Day ${d.day_number}, ${a.slot}`, order: out.length + 1 });
      }));
      return out;
    }
    if (detail.data) return detail.data.attractions.map((a, i) => ({ id: a.id, lat: a.latitude, lng: a.longitude, title: a.name, subtitle: a.description, order: i + 1 }));
    return filtered.map((d) => ({ id: d.id, lat: d.latitude, lng: d.longitude, title: d.name, subtitle: `${d.region}, ${d.country}`, selected: d.id === selected }));
  }, [trip.data, detail.data, filtered, selected]);

  const mode = trip.data ? `Trip stops: ${trip.data.title}` : detail.data ? `Attractions in ${detail.data.name}` : "All destinations";

  if (dests.error) return <ErrorState message={dests.error} onRetry={dests.reload} />;

  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl">Interactive map</h1>
      <div className="card grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/50" aria-hidden="true" />
          <label htmlFor="mq" className="sr-only">Search destinations</label>
          <input id="mq" className="input !pl-9" placeholder="Search destinations" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {user ? (
          <div><label htmlFor="mt" className="sr-only">Show a trip</label>
            <select id="mt" className="input" value={tripId ?? ""} onChange={(e) => { const n = new URLSearchParams(sp); if (e.target.value) n.set("trip", e.target.value); else n.delete("trip"); setSp(n, { replace: true }); }}>
              <option value="">No trip selected</option>{trips.data?.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select></div>
        ) : <TLink to="/login" className="btn-ghost">Log in to see your trips</TLink>}
        <div role="tablist" aria-label="Map or list" className="flex gap-2">
          {(["map", "list"] as const).map((v) => <button key={v} role="tab" aria-selected={view === v} className={`chip ${view === v ? "chip-active" : ""}`} onClick={() => setView(v)}>{v === "map" ? "Map" : "List"}</button>)}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm"><span className="text-cream/70">{mode}</span>
        {(selected || tripId) && <button className="text-amber-accent underline" onClick={() => { setSelected(null); setSp({}, { replace: true }); }}>Show all destinations</button>}</div>

      {dests.loading ? <Skeleton className="h-[520px]" /> : view === "map" ? (
        points.length === 0 ? <p className="card p-8 text-center text-cream/70">No places match your search.</p> :
          <MapView points={points} route={!!trip.data || !!detail.data} className="h-[560px]" onSelect={(p) => { if (!trip.data && !detail.data && typeof p.id === "number") setSelected(p.id); }} />
      ) : (
        <ul className="card divide-y divide-white/10">
          {points.map((p) => <li key={p.id} className="flex items-center justify-between gap-3 p-3 text-sm"><span>{p.order ? `${p.order}. ` : ""}{p.title}<span className="block text-xs text-cream/55">{p.subtitle} · {p.lat.toFixed(3)}, {p.lng.toFixed(3)}</span></span>
            {!trip.data && !detail.data && typeof p.id === "number" && <button className="btn-ghost !py-1.5" onClick={() => setSelected(p.id as number)}>Attractions</button>}</li>)}
        </ul>
      )}
      <p className="text-xs text-cream/50">Pins use coordinates from the project's sample dataset and are approximate. Map tiles come from OpenStreetMap; if they cannot load, pins and the list view still work.</p>
      {detail.data && <p className="card p-4 text-sm"><strong>{detail.data.name}</strong>: {detail.data.description} <TLink to={`/discover/${detail.data.id}`} className="text-amber-accent underline">Details</TLink></p>}
    </div>
  );
}
