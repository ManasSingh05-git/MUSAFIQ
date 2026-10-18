import { CheckCircle2, HelpCircle, Shield, XCircle } from "lucide-react";

interface Props {
  transportMode?: string;
  travelers?: number;
  hotelTier?: string;
  mealPlan?: string;
  className?: string;
}

export function InclusionsExclusions({
  transportMode = "Private Cab",
  travelers = 2,
  hotelTier = "4★ Premium Stay",
  mealPlan = "CP - Continental Breakfast Included",
  className = "",
}: Props) {
  const inclusions = [
    `Handpicked ${hotelTier} accommodation for all nights with sanitized rooms`,
    `${mealPlan} at the hotel dining room`,
    `All inter-city transfers and local sightseeing in AC ${transportMode.toLowerCase().includes("flight") ? "private vehicle & booked flight tickets" : "dedicated private vehicle"}`,
    `All vehicle fuel charges, interstate taxes, highway tolls, and driver night allowances`,
    `Detailed self-guided digital itinerary with verified GPS coordinates (No tourist guide fees needed)`,
    `24x7 dedicated on-trip concierge helpline and emergency support for all ${travelers} guest(s)`,
  ];

  const exclusions = [
    "Personal expenses such as laundry, room service, telephone calls, mini-bar, and tips",
    "Monument entrance tickets, museum permits, and personal camera/drone fees (unless pre-booked)",
    "Meals other than those specified in the selected meal plan (lunch or dinners)",
    "Optional adventure sports (e.g. scuba diving, paragliding, hot air balloon, snowmobile)",
    "Personal travel, health, and baggage loss insurance (strongly recommended)",
    "Any surge charges, peak season hotel supplements, or costs arising due to natural roadblocks",
  ];

  return (
    <div
      className={`overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0e211b]/95 to-[#091713]/95 p-5 text-white shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <h3 className="font-display text-lg font-bold text-white">
              Package Inclusions &amp; Exclusions Matrix
            </h3>
            <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
              Veena World Standard
            </span>
          </div>
          <p className="mt-1 text-xs text-cream/70">
            100% transparent pricing with zero hidden surcharges or surprise fees
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-amber-accent border border-amber-500/20">
          <span>✓ Guaranteed Transparent Breakdown</span>
        </div>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        {/* Inclusions Column */}
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4">
          <div className="flex items-center gap-2 border-b border-emerald-500/20 pb-2.5 text-sm font-bold text-emerald-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>What&apos;s Included in Your Package</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {inclusions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-cream/90 leading-relaxed">
                <span className="mt-0.5 text-emerald-400 font-bold shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Exclusions Column */}
        <div className="rounded-2xl border border-coral-accent/20 bg-coral-accent/10 p-4">
          <div className="flex items-center gap-2 border-b border-coral-accent/20 pb-2.5 text-sm font-bold text-coral-accent">
            <XCircle className="h-4 w-4 text-coral-accent shrink-0" />
            <span>What&apos;s Excluded (Pay as You Go)</span>
          </div>
          <ul className="mt-3 space-y-2.5">
            {exclusions.map((item, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-cream/80 leading-relaxed">
                <span className="mt-0.5 text-coral-accent font-bold shrink-0">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 px-4 py-2 text-[11px] text-cream/60">
        <div className="flex items-center gap-1.5">
          <HelpCircle className="h-3.5 w-3.5 text-teal-300" />
          <span>Have special dietary or accessibility requirements? You can update preferences at any time.</span>
        </div>
        <span className="font-semibold text-emerald-400">All prices in INR including standard GST</span>
      </div>
    </div>
  );
}
