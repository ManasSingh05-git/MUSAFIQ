/**
 * Inter-stop transit and travel-time estimation utilities
 * Standardized after Trip Planner AI (BuildAI) visual route connector
 */

import type { Activity } from "./types";

export interface TransitEstimate {
  mode: "walk" | "drive" | "transit";
  modeLabel: string;
  durationMinutes: number;
  durationLabel: string;
  distanceKm: number;
  distanceLabel: string;
  note: string;
}

export function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateTransit(
  fromActivity: Activity,
  toActivity: Activity,
  stepIndex = 0
): TransitEstimate {
  const hasCoords =
    fromActivity.latitude !== null &&
    fromActivity.longitude !== null &&
    toActivity.latitude !== null &&
    toActivity.longitude !== null;

  if (hasCoords) {
    const rawDist = haversineDistanceKm(
      fromActivity.latitude!,
      fromActivity.longitude!,
      toActivity.latitude!,
      toActivity.longitude!
    );

    // Apply route winding factor (~1.25x for road network)
    const roadDist = Math.max(0.3, rawDist * 1.25);

    if (roadDist < 1.2) {
      const walkMins = Math.max(4, Math.round(roadDist * 13));
      return {
        mode: "walk",
        modeLabel: "Pedestrian Walk",
        durationMinutes: walkMins,
        durationLabel: `${walkMins} mins walk`,
        distanceKm: roadDist,
        distanceLabel: `${Math.round(roadDist * 1000)} m`,
        note: "Pedestrian walkway · Scenic walking route",
      };
    }

    const driveMins = Math.max(8, Math.round(roadDist * 2.5 + 4));
    return {
      mode: "drive",
      modeLabel: "Cab / Taxi Transfer",
      durationMinutes: driveMins,
      durationLabel: `${driveMins} mins drive`,
      distanceKm: roadDist,
      distanceLabel: `${roadDist.toFixed(1)} km`,
      note: "Via city arterial road · Expected smooth flow",
    };
  }

  // Fallback estimates based on transition slots & step index
  const slotTransitions: Record<string, { mins: number; km: number; mode: "drive" | "walk" }> = {
    "morning->afternoon": { mins: 15, km: 5.2, mode: "drive" },
    "afternoon->evening": { mins: 20, km: 6.8, mode: "drive" },
    "morning->evening": { mins: 25, km: 8.5, mode: "drive" },
  };

  const key = `${fromActivity.slot}->${toActivity.slot}`;
  const fallback = slotTransitions[key] || {
    mins: 12 + (stepIndex % 3) * 4,
    km: 3.5 + (stepIndex % 3) * 1.5,
    mode: "drive" as const,
  };

  return {
    mode: fallback.mode,
    modeLabel: fallback.mode === "walk" ? "Scenic Walk" : "Local Cab / Auto",
    durationMinutes: fallback.mins,
    durationLabel: `${fallback.mins} mins drive`,
    distanceKm: fallback.km,
    distanceLabel: `~${fallback.km.toFixed(1)} km`,
    note: "Inter-attraction transit · Dedicated vehicle route",
  };
}
