import { describe, expect, it } from "vitest";
import { estimateTransit, haversineDistanceKm } from "./transit";
import type { Activity } from "./types";

describe("transit estimation utilities", () => {
  it("calculates haversine distance between two coordinates accurately", () => {
    // Mumbai (approx 19.0760, 72.8777) to Pune (approx 18.5204, 73.8567) is ~120-150 km
    const dist = haversineDistanceKm(19.076, 72.8777, 18.5204, 73.8567);
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(160);
  });

  it("recommends pedestrian walking when stops are within 1.2km", () => {
    // Two close points in Old Goa (~300m apart)
    const act1: Activity = {
      slot: "morning",
      title: "Basilica of Bom Jesus",
      description: "",
      duration_hours: 1.5,
      estimated_cost: 0,
      latitude: 15.5009,
      longitude: 73.9116,
      position: 0,
    };
    const act2: Activity = {
      slot: "morning",
      title: "Se Cathedral",
      description: "",
      duration_hours: 1.0,
      estimated_cost: 0,
      latitude: 15.5035,
      longitude: 73.9126,
      position: 1,
    };

    const estimate = estimateTransit(act1, act2);
    expect(estimate.mode).toBe("walk");
    expect(estimate.durationLabel).toContain("walk");
  });

  it("recommends drive/cab when stops are further apart", () => {
    // North Goa to South Goa
    const act1: Activity = {
      slot: "morning",
      title: "Fort Aguada",
      description: "",
      duration_hours: 2,
      estimated_cost: 50,
      latitude: 15.492,
      longitude: 73.7737,
      position: 0,
    };
    const act2: Activity = {
      slot: "afternoon",
      title: "Dudhsagar Waterfalls",
      description: "",
      duration_hours: 3,
      estimated_cost: 500,
      latitude: 15.3144,
      longitude: 74.3143,
      position: 1,
    };

    const estimate = estimateTransit(act1, act2);
    expect(estimate.mode).toBe("drive");
    expect(estimate.durationLabel).toContain("drive");
    expect(estimate.distanceKm).toBeGreaterThan(10);
  });

  it("provides sensible fallback estimation when coordinates are null", () => {
    const act1: Activity = {
      slot: "morning",
      title: "Morning Market Tour",
      description: "",
      duration_hours: 2,
      estimated_cost: 100,
      latitude: null,
      longitude: null,
      position: 0,
    };
    const act2: Activity = {
      slot: "afternoon",
      title: "Afternoon Museum",
      description: "",
      duration_hours: 2,
      estimated_cost: 200,
      latitude: null,
      longitude: null,
      position: 1,
    };

    const estimate = estimateTransit(act1, act2);
    expect(estimate.durationMinutes).toBeGreaterThan(0);
    expect(estimate.durationLabel).toBeDefined();
    expect(estimate.distanceLabel).toBeDefined();
  });
});
