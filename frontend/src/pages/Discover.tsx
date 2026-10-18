import {
  Award,
  Check,
  Compass,
  Globe,
  Heart,
  MapPin,
  Plane,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { DestinationCard } from "../components/DestinationCard";
import { PackageCard } from "../components/PackageCard";
import { EmptyState, ErrorState, Skeleton } from "../components/ui";
import { api, qs } from "../lib/api";
import { useAsync } from "../lib/contexts";
import { SIGNATURE_PACKAGES } from "../lib/curatedPackages";
import { useFavorites } from "../lib/favorites";
import { MONTHS } from "../lib/format";
import { CATEGORIES, INTERESTS, type Destination } from "../lib/types";

const POPULAR_LOCATIONS = [
  { label: "All Destinations", value: "" },
  { label: "India", value: "India" },
  { label: "Rajasthan", value: "Rajasthan" },
  { label: "Goa", value: "Goa" },
  { label: "Himachal", value: "Himachal Pradesh" },
  { label: "Uttarakhand", value: "Uttarakhand" },
  { label: "Kerala", value: "Kerala" },
  { label: "Maharashtra", value: "Maharashtra" },
  { label: "Kashmir", value: "Kashmir" },
  { label: "Ladakh", value: "Ladakh" },
  { label: "Japan", value: "Japan" },
  { label: "Switzerland", value: "Switzerland" },
  { label: "France", value: "France" },
  { label: "UAE / Dubai", value: "United Arab Emirates" },
  { label: "Italy", value: "Italy" },
  { label: "USA", value: "United States" },
  { label: "Thailand", value: "Thailand" },
];

const PACKAGE_THEMES = [
  "All Themes",
  "Honeymoon & Couples",
  "Family Vacation",
  "Adventure & Wildlife",
  "Heritage & Culture",
  "Scenic & Wellness",
];

export default function Discover() {
  const [sp, setSp] = useSearchParams();
  const fav = useFavorites();
  const [viewMode, setViewMode] = useState<"destinations" | "packages">(
    (sp.get("mode") as "destinations" | "packages") || "destinations"
  );
  const [packageTheme, setPackageTheme] = useState<string>("All Themes");

  const get = (k: string) => sp.get(k) ?? "";
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp);
    if (v) n.set(k, v);
    else n.delete(k);
    setSp(n, { replace: true });
  };

  const query = qs({
    q: get("q"),
    country: get("country"),
    region: get("region"),
    category: get("category"),
    climate: get("climate"),
    interest: get("interest"),
    month: get("month"),
    max_daily_cost: get("max_daily_cost"),
    sort: get("sort") || "name",
  });

  const { data, loading, error, reload } = useAsync(
    () => api.get<Destination[]>(`/api/destinations${query}`),
    [query]
  );
  const active = [
    "q",
    "country",
    "region",
    "category",
    "climate",
    "interest",
    "month",
    "max_daily_cost",
  ].some((k) => get(k));

  const currentSearch = get("q") || get("country") || "";

  // Filter signature tour packages
  const filteredPackages = SIGNATURE_PACKAGES.filter((p) => {
    const q = get("q").toLowerCase();
    const matchesQ =
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.destination_name.toLowerCase().includes(q) ||
      p.country.toLowerCase().includes(q) ||
      p.region.toLowerCase().includes(q) ||
      p.theme.toLowerCase().includes(q);

    const matchesTheme =
      packageTheme === "All Themes" || p.theme === packageTheme;

    return matchesQ && matchesTheme;
  });

  return (
    <div className="space-y-6">
      {/* Title & Badge */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white">
              Discover &amp; Plan Tours
            </h1>
            <span className="chip border border-teal-500/30 bg-teal-500/10 text-xs font-semibold text-teal-400">
              <Sparkles className="mr-1 inline h-3 w-3" /> 100% Real HD Imagery
            </span>
          </div>
          <p className="mt-1 text-sm text-cream/75">
            Explore 25+ verified global destinations or choose all-inclusive curated holiday packages with transparent hotel tiers, meal plans, and real-time flight bookings.
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs (Veena World & Ixigo Style) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => {
            setViewMode("destinations");
            set("mode", "destinations");
          }}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            viewMode === "destinations"
              ? "bg-amber-accent font-bold text-forest-950 shadow-md"
              : "border border-white/10 bg-white/5 text-cream/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Compass className="h-4 w-4" /> Explore Destinations ({data?.length ?? 25})
        </button>
        <button
          type="button"
          onClick={() => {
            setViewMode("packages");
            set("mode", "packages");
          }}
          className={`flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
            viewMode === "packages"
              ? "bg-gradient-to-r from-orange-500 to-[#ff6b2b] font-bold text-white shadow-lg shadow-orange-950/40"
              : "border border-white/10 bg-white/5 text-cream/70 hover:bg-white/10 hover:text-white"
          }`}
        >
          <Award className="h-4 w-4" /> Signature Tour Packages (Veena World &amp; Ixigo Style)
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-extrabold text-white">
            {SIGNATURE_PACKAGES.length} Ready
          </span>
        </button>
      </div>

      {/* Global Search Bar */}
      <section className="card space-y-4 p-4 sm:p-5" aria-label="Filters">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream/50"
            aria-hidden="true"
          />
          <label htmlFor="dq" className="sr-only">
            Search by name, country, state, or package theme
          </label>
          <input
            id="dq"
            className="input text-base !pl-10"
            placeholder="Search any country, state, city or tour package... (e.g. Rajasthan, Bali, Paris, Goa, Manali, Switzerland, Kashmir)"
            value={get("q")}
            onChange={(e) => set("q", e.target.value)}
          />
          {get("q") && (
            <button
              onClick={() => set("q", "")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-cream/50 hover:text-cream"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Pills for Packages vs Destinations */}
        {viewMode === "packages" ? (
          <div className="space-y-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-cream/60">
              <Award className="h-3 w-3 text-amber-accent" /> Filter by Holiday Theme:
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Package Themes">
              {PACKAGE_THEMES.map((th) => {
                const isSelected = packageTheme === th;
                return (
                  <button
                    key={th}
                    type="button"
                    className={`chip text-xs transition ${
                      isSelected ? "chip-active font-bold shadow-sm" : "hover:border-cream/40"
                    }`}
                    onClick={() => setPackageTheme(th)}
                  >
                    {th}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <span className="flex items-center gap-1 text-xs font-medium text-cream/60">
              <Globe className="h-3 w-3 text-amber-accent" /> Popular States &amp; Countries:
            </span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Quick States and Countries">
              {POPULAR_LOCATIONS.map((loc) => {
                const isSelected =
                  (!loc.value && !get("q") && !get("country")) ||
                  get("q") === loc.value ||
                  get("country") === loc.value;
                return (
                  <button
                    key={loc.label}
                    aria-pressed={isSelected}
                    className={`chip text-xs transition ${
                      isSelected ? "chip-active font-semibold shadow-sm" : "hover:border-cream/40"
                    }`}
                    onClick={() => {
                      if (!loc.value) {
                        const n = new URLSearchParams(sp);
                        n.delete("q");
                        n.delete("country");
                        setSp(n, { replace: true });
                      } else {
                        set("q", loc.value);
                      }
                    }}
                  >
                    {loc.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Detailed Filters (Available in Destination view) */}
        {viewMode === "destinations" && (
          <div className="grid gap-3 pt-2 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <label className="label" htmlFor="f-cat">
                Category
              </label>
              <select
                id="f-cat"
                className="input"
                value={get("category")}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="f-int">
                Interest
              </label>
              <select
                id="f-int"
                className="input"
                value={get("interest")}
                onChange={(e) => set("interest", e.target.value)}
              >
                <option value="">All interests</option>
                {INTERESTS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="f-month">
                Best month
              </label>
              <select
                id="f-month"
                className="input"
                value={get("month")}
                onChange={(e) => set("month", e.target.value)}
              >
                <option value="">Any month</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label" htmlFor="f-sort">
                Sort by
              </label>
              <select
                id="f-sort"
                className="input"
                value={get("sort") || "name"}
                onChange={(e) => set("sort", e.target.value)}
              >
                <option value="name">Name (A-Z)</option>
                <option value="cost">Estimated cost (low to high)</option>
                <option value="days">Suggested duration</option>
              </select>
            </div>
          </div>
        )}

        {active && (
          <div className="pt-1">
            <button className="btn-ghost text-xs" onClick={() => setSp({}, { replace: true })}>
              <SlidersHorizontal className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Reset all filters
            </button>
          </div>
        )}
      </section>

      {/* ===================== VIEW 1: SIGNATURE TOUR PACKAGES ===================== */}
      {viewMode === "packages" ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-cream/70">
              Showing <strong className="text-white">{filteredPackages.length}</strong> all-inclusive tour package(s)
            </p>
            <span className="text-xs text-teal-400 font-semibold">
              ✓ Verified Inclusions &amp; Direct Flight Connect
            </span>
          </div>

          {filteredPackages.length === 0 ? (
            <EmptyState
              title={`No tour packages match "${get("q") || packageTheme}"`}
              text="Try selecting 'All Themes' or clearing your search term."
              action={
                <button
                  className="btn-primary"
                  onClick={() => {
                    set("q", "");
                    setPackageTheme("All Themes");
                  }}
                >
                  View All Packages
                </button>
              }
            />
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredPackages.map((pkg, i) => (
                <PackageCard key={pkg.id} pkg={pkg} index={i} />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ===================== VIEW 2: ALL DESTINATIONS GRID ===================== */
        <>
          {error ? (
            <ErrorState message={`Could not load destinations: ${error}`} onRetry={reload} />
          ) : loading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-80" />
              ))}
            </div>
          ) : data && data.length === 0 ? (
            <EmptyState
              title={`No destinations match "${currentSearch}"`}
              text="Try searching a different country or state name (e.g. Rajasthan, Japan, France, Goa, Norway)."
              action={
                <button className="btn-primary" onClick={() => setSp({}, { replace: true })}>
                  View All Destinations
                </button>
              }
            />
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-cream/70" aria-live="polite">
                  Showing <strong className="text-cream">{data?.length ?? 0}</strong> destination(s) with HD imagery
                </p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {data?.map((d, i) => (
                  <DestinationCard
                    key={d.id}
                    dest={d}
                    index={i}
                    fav={fav.isFav(d.id)}
                    onFav={() => void fav.toggle(d.id)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
