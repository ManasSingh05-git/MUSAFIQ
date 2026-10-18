import { motion } from "framer-motion";
import { Heart, MapPin } from "lucide-react";
import { inr } from "../lib/format";
import type { Destination } from "../lib/types";
import { TLink } from "./Layout";
import { DestinationImage } from "./ui";

export const dailyCost = (d: Destination) => Math.round(d.stay_per_night_inr / 2 + d.food_per_day_inr + d.local_transport_per_day_inr);

export function DestinationCard({ dest, fav, onFav, index = 0 }: { dest: Destination; fav: boolean; onFav: () => void; index?: number }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index, 8) * 0.05, duration: 0.4 }}
      className="card group overflow-hidden"
    >
      <div className="relative h-44">
        <DestinationImage dest={dest} className="h-full" />
        <button
          onClick={onFav} aria-pressed={fav} aria-label={fav ? `Remove ${dest.name} from favourites` : `Save ${dest.name} to favourites`}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-forest-950/70 backdrop-blur transition hover:scale-110"
        >
          <Heart className={`h-4 w-4 ${fav ? "fill-coral-accent text-coral-accent" : "text-cream"}`} />
        </button>
        <span className="chip absolute bottom-3 left-3 bg-forest-950/80 backdrop-blur border border-white/10 text-xs font-medium">
          <MapPin className="mr-1 h-3 w-3 text-amber-accent" aria-hidden="true" />
          {dest.region ? `${dest.region.split(',')[0]}, ${dest.country}` : dest.country}
        </span>
        <span className="chip absolute bottom-3 right-3 bg-forest-950/80 backdrop-blur border border-white/10 text-[10px] text-teal-accent font-bold tracking-wider">
          HD
        </span>
      </div>
      <div className="space-y-2 p-4">
        <h3 className="font-display text-xl">
          <TLink to={`/discover/${dest.id}`} className="hover:text-amber-accent">{dest.name}</TLink>
        </h3>
        <p className="line-clamp-2 text-sm text-cream/70">{dest.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {dest.categories.slice(0, 3).map((c) => <span key={c} className="chip">{c}</span>)}
        </div>
        <p className="text-xs text-cream/60">
          About <strong className="text-cream">{inr(dailyCost(dest))}</strong> per person per day, about {dest.suggested_days} days suggested.
          <span className="block text-cream/45">Sample estimate, not a live price.</span>
        </p>
      </div>
    </motion.article>
  );
}
