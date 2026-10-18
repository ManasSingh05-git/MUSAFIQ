import { motion } from "framer-motion";
import { Bot, Compass, Map as MapIcon, Search, Sparkles, Wallet } from "lucide-react";
import { useState } from "react";
import { DestinationCard } from "../components/DestinationCard";
import { TLink } from "../components/Layout";
import { Skeleton } from "../components/ui";
import { api } from "../lib/api";
import { useAsync, useMotion } from "../lib/contexts";
import { useFavorites } from "../lib/favorites";
import { CATEGORIES, type Destination } from "../lib/types";

function Globe() {
  // Decorative rotating route illustration (pure SVG/CSS).
  return (
    <svg viewBox="0 0 200 200" className="h-56 w-56 animate-spinSlow opacity-80" aria-hidden="true">
      <circle cx="100" cy="100" r="86" fill="rgba(95,143,139,0.18)" stroke="rgba(255,255,255,0.25)" />
      {[30, 60].map((rx) => <ellipse key={rx} cx="100" cy="100" rx={rx} ry="86" fill="none" stroke="rgba(255,255,255,0.18)" />)}
      {[-45, 0, 45].map((y) => <ellipse key={y} cx="100" cy={100 + y} rx={Math.sqrt(86 * 86 - y * y)} ry="10" fill="none" stroke="rgba(255,255,255,0.15)" />)}
      <path d="M50 120 Q100 30 160 85" fill="none" stroke="#e9a24b" strokeWidth="2.5" strokeDasharray="5 6" />
      <circle cx="50" cy="120" r="4.5" fill="#e9a24b" /><circle cx="160" cy="85" r="4.5" fill="#e8795f" />
    </svg>
  );
}

export default function Landing() {
  const { go } = useMotion();
  const fav = useFavorites();
  const [q, setQ] = useState("");
  const dests = useAsync(() => api.get<Destination[]>("/api/destinations?sort=name"), []);

  return (
    <div className="space-y-20">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 px-6 py-16 sm:px-12 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-forest-700/60 via-forest-900/40 to-forest-950" />
        <div className="pointer-events-none absolute -right-10 top-6 hidden animate-float md:block"><Globe /></div>
        <div className="relative max-w-2xl space-y-6">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="chip"><Sparkles className="mr-1.5 h-3 w-3 text-amber-accent" aria-hidden="true" />AI-assisted trip planner</motion.p>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="font-display text-4xl leading-tight sm:text-6xl">
            Your Next Adventure, Intelligently Planned.
          </motion.h1>
          <p className="max-w-xl text-cream/75">
            Tell MUSAFIQ AI where you are starting, your budget and what you enjoy. Get ranked destinations with the reasons shown,
            a day-by-day itinerary, interactive flight booking and maps.
          </p>
          <form className="flex max-w-lg gap-2" role="search" onSubmit={(e) => { e.preventDefault(); go(`/discover?q=${encodeURIComponent(q)}`); }}>
            <label htmlFor="hero-search" className="sr-only">Search destinations</label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/50" aria-hidden="true" />
              <input id="hero-search" className="input !rounded-full !py-3 !pl-10" placeholder="Try Goa, mountains, Japan..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <button className="btn-primary" type="submit">Search</button>
          </form>
          <div className="flex flex-wrap gap-3">
            <TLink to="/trips/new" className="btn-primary">Plan My Trip</TLink>
            <TLink to="/discover" className="btn-ghost">Explore Destinations</TLink>
          </div>
        </div>
      </section>

      <section aria-labelledby="cat">
        <h2 id="cat" className="font-display text-2xl">Travel categories</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => <TLink key={c} to={`/discover?category=${c}`} className="chip hover:border-amber-accent hover:text-amber-accent">{c}</TLink>)}
        </div>
      </section>

      <section aria-labelledby="feat">
        <div className="flex items-end justify-between">
          <h2 id="feat" className="font-display text-2xl">Featured destinations</h2>
          <TLink to="/discover" className="text-sm text-amber-accent hover:underline">See all</TLink>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dests.loading && [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-72" />)}
          {dests.error && <p role="alert" className="text-sm text-coral-accent">Could not load destinations: {dests.error}</p>}
          {dests.data?.slice(0, 4).map((d, i) => <DestinationCard key={d.id} dest={d} index={i} fav={fav.isFav(d.id)} onFav={() => void fav.toggle(d.id)} />)}
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="font-display text-2xl">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {[
            { icon: Compass, t: "1. Describe your trip", d: "Start city, dates, group size, budget and interests, either in a form or in plain language to the assistant." },
            { icon: Wallet, t: "2. Compare with reasons", d: "Destinations are scored on budget fit, interests, season, duration and style. You see the points for each." },
            { icon: MapIcon, t: "3. Edit and keep it", d: "Reorder activities, adjust the budget, view stops on a map, save the trip and export a PDF." },
          ].map(({ icon: I, t, d }) => (
            <div key={t} className="card p-6"><I className="h-7 w-7 text-amber-accent" aria-hidden="true" /><h3 className="mt-3 font-display text-lg">{t}</h3><p className="mt-1 text-sm text-cream/70">{d}</p></div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ai" className="card grid gap-6 p-6 md:grid-cols-2 md:p-10">
        <div className="space-y-3">
          <h2 id="ai" className="font-display text-2xl"><Bot className="mr-2 inline h-6 w-6 text-amber-accent" aria-hidden="true" />AI travel assistant</h2>
          <p className="text-sm text-cream/75">
            Ask in your own words and refine as you go: "make it cheaper", "add more adventure". The assistant is available on every page
            (bottom-right once you log in). With no AI key configured it uses a rule-based engine and says so in each reply.
          </p>
        </div>
        <div className="space-y-2 rounded-2xl bg-forest-950/50 p-4 text-sm" aria-label="Example conversation, not live">
          <p className="text-xs uppercase tracking-wide text-cream/50">Example conversation (illustration)</p>
          <p className="ml-auto w-fit max-w-[90%] rounded-2xl bg-amber-accent px-3 py-2 text-forest-950">4 days from Mumbai, 3 of us, ₹20,000, mountains and photography.</p>
          <p className="w-fit max-w-[90%] rounded-2xl bg-white/10 px-3 py-2">I will compare destinations against your budget and interests, show the reasons, and flag anything over budget.</p>
        </div>
      </section>

      <section aria-labelledby="demo">
        <h2 id="demo" className="font-display text-2xl">Sample testimonials</h2>
        <p className="text-xs text-cream/50">Placeholder demo content for the project. These are not from real users.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {["Demo: a clear budget breakdown helps me decide quickly.", "Demo: I like that the app explains why a place was ranked first."].map((t) => (
            <blockquote key={t} className="card p-5 text-sm text-cream/80">{t}</blockquote>
          ))}
        </div>
      </section>
    </div>
  );
}
