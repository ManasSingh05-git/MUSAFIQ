import { motion } from "framer-motion";
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  MapPin,
  Plane,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { CuratedPackage } from "../lib/curatedPackages";
import { inr } from "../lib/format";

export function PackageCard({ pkg, index = 0 }: { pkg: CuratedPackage; index?: number }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  const discountPercent = Math.round(
    ((pkg.original_price_inr - pkg.price_inr) / pkg.original_price_inr) * 100
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 6) * 0.06, duration: 0.4 }}
      className="card group overflow-hidden border border-white/10 bg-[#071513]/85 shadow-2xl backdrop-blur-xl transition hover:border-amber-accent/40"
    >
      {/* Top Media Banner */}
      <div className="relative h-56 overflow-hidden">
        <img
          src={pkg.cover_image}
          alt={pkg.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#071513] via-black/25 to-transparent" />

        {/* Top Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          <span className="chip border-amber-500/40 bg-black/75 text-xs font-bold text-amber-accent backdrop-blur-md">
            <Sparkles className="mr-1 inline h-3 w-3" />
            {pkg.badge}
          </span>
          <span className="chip border-teal-500/30 bg-teal-950/80 text-[11px] font-semibold text-teal-300 backdrop-blur-md">
            {pkg.theme}
          </span>
        </div>

        {/* Discount Badge */}
        <div className="absolute right-3 top-3 rounded-xl bg-[#ff6b2b] px-2.5 py-1 text-xs font-black text-white shadow-lg">
          {discountPercent}% OFF
        </div>

        {/* Bottom Destination & Duration Pill */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
          <span className="chip border-white/10 bg-black/80 font-medium text-white backdrop-blur-md">
            <MapPin className="mr-1 inline h-3 w-3 text-amber-accent" />
            {pkg.region}
          </span>
          <span className="chip border-white/10 bg-black/80 font-bold text-white backdrop-blur-md">
            <Calendar className="mr-1 inline h-3 w-3 text-teal-400" />
            {pkg.duration_days}D / {pkg.duration_nights}N
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="space-y-4 p-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-amber-accent">
            <div className="flex items-center gap-0.5 font-bold">
              <Star className="h-3.5 w-3.5 fill-amber-accent text-amber-accent" />
              <span>{pkg.rating}</span>
            </div>
            <span className="text-cream/40">·</span>
            <span className="text-cream/60">({pkg.reviews_count} verified reviews)</span>
          </div>

          <h3 className="mt-1 font-display text-xl font-bold text-white group-hover:text-amber-accent transition">
            {pkg.title}
          </h3>
          <p className="mt-1 text-xs text-cream/70">
            🏨 {pkg.hotel_tier} · 🍽️ {pkg.meal_plan}
          </p>
        </div>

        {/* Inclusions Highlights */}
        <div className="rounded-2xl border border-white/5 bg-black/40 p-3.5 space-y-1.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" /> What&apos;s Included (Veena World Standard):
          </p>
          <ul className="grid gap-1 text-xs text-cream/80 sm:grid-cols-2">
            {pkg.inclusions.slice(0, 4).map((inc, i) => (
              <li key={i} className="flex items-start gap-1.5 line-clamp-1">
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400 mt-0.5" />
                <span>{inc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Collapsible Day-by-Day Itinerary Highlights */}
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between py-1 text-xs font-semibold text-teal-300 hover:text-white transition"
          >
            <span>{expanded ? "Hide Day-by-Day Highlights" : "View Day-by-Day Schedule & Sights"}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {expanded && (
            <div className="mt-3 space-y-2.5 rounded-2xl border border-white/10 bg-black/60 p-4 text-xs">
              {pkg.day_highlights.map((d) => (
                <div key={d.day} className="border-b border-white/5 pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-accent">Day {d.day}: {d.title}</span>
                    <span className="text-[10px] text-teal-400">{d.transit_note}</span>
                  </div>
                  <p className="mt-1 text-cream/75">
                    {d.activities.join(" • ")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pricing & CTA Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          <div>
            <span className="text-[10px] uppercase tracking-wider text-cream/50">Starting From</span>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-2xl font-black text-white">
                {inr(pkg.price_inr)}
              </span>
              <span className="text-xs text-cream/40 line-through">
                {inr(pkg.original_price_inr)}
              </span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">per person · all taxes included</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                navigate("/flights", {
                  state: {
                    from: "Mumbai",
                    to: pkg.destination_name,
                    destinationId: pkg.destination_id,
                  },
                });
              }}
              className="btn-ghost !py-2 !px-3 text-xs border-teal-500/30 text-teal-300 hover:text-white"
              title="Book Flights & Cockpit Seats"
            >
              <Plane className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                navigate(`/trips/new?destination=${pkg.destination_id}`);
              }}
              className="btn-primary !py-2.5 !px-5 text-xs font-bold shadow-lg shadow-amber-950/40 hover:brightness-110"
            >
              <Compass className="mr-1.5 inline h-3.5 w-3.5" />
              1-Click Customize &amp; Plan
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
