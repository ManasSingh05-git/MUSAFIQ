import { Loader2, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useAuth, useMotion, useToast } from "../lib/contexts";
import { INTERESTS, type Preferences } from "../lib/types";

export default function Settings() {
  const { user, logout } = useAuth();
  const { fancyTransitions, setFancyTransitions, reducedMotion } = useMotion();
  const toast = useToast();
  const nav = useNavigate();
  const cities = useAsync(() => api.get<{ cities: { name: string }[] }>("/api/cities"), []);
  const prefs = useAsync(() => api.get<Preferences>("/api/auth/preferences"), []);
  const [p, setP] = useState<Preferences | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (prefs.data) setP(prefs.data); }, [prefs.data]);

  const save = async () => {
    if (!p) return;
    setBusy(true);
    try { setP(await api.put<Preferences>("/api/auth/preferences", p)); toast("success", "Preferences saved"); }
    catch (e) { toast("error", (e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="font-display text-3xl">Profile and settings</h1>
      <section className="card space-y-1 p-5"><p className="font-semibold">{user?.name}</p><p className="text-sm text-cream/65">{user?.email}</p></section>

      <section className="card space-y-4 p-5" aria-labelledby="tp">
        <h2 id="tp" className="font-display text-xl">Travel preferences</h2>
        {!p ? <Skeleton className="h-32" /> : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><label className="label" htmlFor="hc">Home city</label>
                <select id="hc" className="input" value={p.home_city} onChange={(e) => setP({ ...p, home_city: e.target.value })}>{(cities.data?.cities ?? [{ name: p.home_city }]).map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
              <div><label className="label" htmlFor="ts">Default travel style</label>
                <select id="ts" className="input" value={p.travel_style} onChange={(e) => setP({ ...p, travel_style: e.target.value })}>{["budget", "comfort", "luxury", "adventure"].map((s) => <option key={s}>{s}</option>)}</select></div>
            </div>
            <fieldset><legend className="label">Interests</legend>
              <div className="flex flex-wrap gap-2">{INTERESTS.map((i) => {
                const on = p.interests.includes(i);
                return <button type="button" key={i} aria-pressed={on} className={`chip ${on ? "chip-active" : ""}`} onClick={() => setP({ ...p, interests: on ? p.interests.filter((x) => x !== i) : [...p.interests, i] })}>{i}</button>;
              })}</div></fieldset>
            <p className="text-xs text-cream/50">Currency is INR in this version.</p>
            <button className="btn-primary" onClick={() => void save()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}Save preferences</button>
          </>
        )}
      </section>

      <section className="card space-y-3 p-5" aria-labelledby="mo">
        <h2 id="mo" className="font-display text-xl">Animation</h2>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={fancyTransitions} onChange={(e) => setFancyTransitions(e.target.checked)} />Airplane page transitions</label>
        {reducedMotion && <p className="text-xs text-cream/60">Your system requests reduced motion, so transitions are skipped regardless of this setting.</p>}
      </section>

      <button className="btn-danger" onClick={() => { logout(); nav("/"); }}><LogOut className="h-4 w-4" aria-hidden="true" />Log out</button>
    </div>
  );
}
