import { Copy, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { TLink } from "../components/Layout";
import { ConfirmDialog, EmptyState, ErrorState, Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useToast } from "../lib/contexts";
import { fmtDate, inr } from "../lib/format";
import type { Trip, TripSummary } from "../lib/types";

const TABS = [["", "All"], ["upcoming", "Upcoming"], ["ongoing", "Ongoing"], ["completed", "Completed"]] as const;

export default function MyTrips() {
  const toast = useToast();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [del, setDel] = useState<TripSummary | null>(null);
  const trips = useAsync(() => api.get<TripSummary[]>(`/api/trips?${new URLSearchParams({ ...(status ? { status } : {}), ...(q ? { q } : {}) })}`), [status, q]);

  const duplicate = async (t: TripSummary) => {
    try { await api.post<Trip>(`/api/trips/${t.id}/duplicate`); toast("success", "Trip duplicated"); trips.reload(); }
    catch (e) { toast("error", (e as Error).message); }
  };
  const remove = async () => {
    if (!del) return;
    try { await api.del(`/api/trips/${del.id}`); toast("success", "Trip deleted"); trips.reload(); }
    catch (e) { toast("error", (e as Error).message); }
    finally { setDel(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl">My trips</h1>
        <TLink to="/trips/new" className="btn-primary"><Plus className="h-4 w-4" aria-hidden="true" />New trip</TLink>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Trip status" className="flex gap-2">
          {TABS.map(([v, l]) => <button key={l} role="tab" aria-selected={status === v} className={`chip ${status === v ? "chip-active" : ""}`} onClick={() => setStatus(v)}>{l}</button>)}
        </div>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/50" aria-hidden="true" />
          <label htmlFor="tq" className="sr-only">Search trips</label>
          <input id="tq" className="input !pl-9" placeholder="Search trips" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {trips.error ? <ErrorState message={trips.error} onRetry={trips.reload} /> : trips.loading ? (
        <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <Skeleton key={i} className="h-36" />)}</div>
      ) : trips.data && trips.data.length === 0 ? (
        <EmptyState title={status || q ? "No trips match" : "No trips yet"} text={status || q ? "Try another filter." : "Generate your first plan: it takes under a minute and everything stays editable."}
          action={<TLink to="/trips/new" className="btn-primary">Plan a trip</TLink>} />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {trips.data?.map((t) => (
            <li key={t.id} className="card space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <h2 className="font-display text-xl"><TLink to={`/trips/${t.id}`} className="hover:text-amber-accent">{t.title}</TLink></h2>
                <span className="chip">{t.status}</span>
              </div>
              <p className="text-sm text-cream/70">{t.start_city} to {t.destination_name ?? "custom"} · {fmtDate(t.start_date)} to {fmtDate(t.end_date)} · {t.travelers} traveller(s)</p>
              <p className="text-sm">Estimated {inr(t.estimated_total)} <span className="text-cream/50">of {inr(t.budget)} budget</span></p>
              <div className="flex flex-wrap gap-2">
                <TLink to={`/trips/${t.id}`} className="btn-primary !py-1.5">Open</TLink>
                <button className="btn-ghost !py-1.5" onClick={() => void duplicate(t)}><Copy className="h-4 w-4" aria-hidden="true" />Duplicate</button>
                <button className="btn-danger !py-1.5" onClick={() => setDel(t)}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog open={!!del} title="Delete this trip?" text={`"${del?.title ?? ""}" and its itinerary, budget and checklist will be permanently removed.`} onConfirm={() => void remove()} onCancel={() => setDel(null)} />
    </div>
  );
}
