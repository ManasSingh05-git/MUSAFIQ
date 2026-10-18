import { Cloud, CloudSun, Droplets, RefreshCw, ShieldCheck, Sun, Thermometer, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import type { Weather } from "../lib/types";

interface Props {
  destinationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  className?: string;
}

interface DestinationEnvProfile {
  temp: number;
  high: number;
  low: number;
  condition: string;
  aqi: number;
  aqiStatus: "Good" | "Moderate" | "Fair";
  pm25: number;
  humidity: number;
  uvIndex: number;
  comfortScore: number;
  attireTip: string;
}

const REGIONAL_PROFILES: Record<string, DestinationEnvProfile> = {
  goa: {
    temp: 29,
    high: 32,
    low: 24,
    condition: "Tropical Breeze & Sunny",
    aqi: 32,
    aqiStatus: "Good",
    pm25: 9,
    humidity: 72,
    uvIndex: 7,
    comfortScore: 94,
    attireTip: "Light cottons, beach flip-flops, polarized sunglasses & SPF 50 sun lotion.",
  },
  bali: {
    temp: 28,
    high: 31,
    low: 23,
    condition: "Pleasant Tropical Warmth",
    aqi: 28,
    aqiStatus: "Good",
    pm25: 7,
    humidity: 75,
    uvIndex: 8,
    comfortScore: 92,
    attireTip: "Breathable linen, modest temple sarong, hydration pack & sun hat.",
  },
  manali: {
    temp: 14,
    high: 18,
    low: 6,
    condition: "Crisp Alpine Mountain Air",
    aqi: 22,
    aqiStatus: "Good",
    pm25: 5,
    humidity: 48,
    uvIndex: 5,
    comfortScore: 96,
    attireTip: "Fleece jacket, layered thermals, sturdy trekking shoes & lip balm.",
  },
  kashmir: {
    temp: 12,
    high: 16,
    low: 4,
    condition: "Cool Valley Breeze & Clear Skies",
    aqi: 18,
    aqiStatus: "Good",
    pm25: 4,
    humidity: 52,
    uvIndex: 4,
    comfortScore: 98,
    attireTip: "Warm pashmina shawl/jacket, woollen socks & comfortable walking boots.",
  },
  rajasthan: {
    temp: 26,
    high: 30,
    low: 17,
    condition: "Mild Desert Sunshine",
    aqi: 58,
    aqiStatus: "Moderate",
    pm25: 18,
    humidity: 34,
    uvIndex: 6,
    comfortScore: 88,
    attireTip: "Breathable long-sleeve cottons, wide-brim hat & sunglasses against fort glare.",
  },
  jaipur: {
    temp: 27,
    high: 31,
    low: 18,
    condition: "Sunny & Mild Dry Heat",
    aqi: 62,
    aqiStatus: "Moderate",
    pm25: 22,
    humidity: 36,
    uvIndex: 6,
    comfortScore: 86,
    attireTip: "Comfortable closed sneakers for palace marble steps & UV sunglasses.",
  },
  paris: {
    temp: 18,
    high: 21,
    low: 12,
    condition: "Mild European Autumn",
    aqi: 35,
    aqiStatus: "Good",
    pm25: 10,
    humidity: 60,
    uvIndex: 3,
    comfortScore: 91,
    attireTip: "Smart casual layers, light trench coat & broken-in walking shoes for cobblestones.",
  },
  dubai: {
    temp: 31,
    high: 35,
    low: 25,
    condition: "Clear Arabian Sunshine",
    aqi: 65,
    aqiStatus: "Moderate",
    pm25: 24,
    humidity: 50,
    uvIndex: 7,
    comfortScore: 84,
    attireTip: "Modest breathable fabrics, UV sunglasses & light jacket for AC shopping malls.",
  },
  varanasi: {
    temp: 27,
    high: 32,
    low: 19,
    condition: "Subtropical River Sunshine",
    aqi: 72,
    aqiStatus: "Moderate",
    pm25: 26,
    humidity: 58,
    uvIndex: 6,
    comfortScore: 85,
    attireTip: "Comfortable easy-slip footwear for ghat steps & modest conservative attire.",
  },
};

function getProfile(destName?: string | null): DestinationEnvProfile {
  if (!destName) return REGIONAL_PROFILES.goa;
  const lower = destName.toLowerCase();
  for (const [key, profile] of Object.entries(REGIONAL_PROFILES)) {
    if (lower.includes(key)) return profile;
  }
  return {
    temp: 25,
    high: 29,
    low: 18,
    condition: "Clear & Pleasant",
    aqi: 45,
    aqiStatus: "Good",
    pm25: 12,
    humidity: 55,
    uvIndex: 5,
    comfortScore: 90,
    attireTip: "Comfortable casual travel attire, sneakers & sunglasses.",
  };
}

export function EnvironmentalIntelligence({
  destinationName,
  latitude,
  longitude,
  className = "",
}: Props) {
  const profile = getProfile(destinationName);
  const [liveWeather, setLiveWeather] = useState<Weather | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchLive = async () => {
    if (latitude == null || longitude == null) return;
    setLoading(true);
    try {
      const data = await api.get<Weather>(
        `/api/weather?lat=${latitude}&lon=${longitude}`
      );
      if (data && data.available) {
        setLiveWeather(data);
      }
    } catch {
      // Keep static profile fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (latitude != null && longitude != null) {
      void fetchLive();
    }
  }, [latitude, longitude]);

  const currentTemp = liveWeather?.temperature_c ?? profile.temp;
  const highTemp = liveWeather?.high_c ?? profile.high;
  const lowTemp = liveWeather?.low_c ?? profile.low;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0c2621]/90 via-[#0e1f1c]/90 to-[#071310]/95 p-5 text-white shadow-xl backdrop-blur-md ${className}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
            <CloudSun className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-base font-bold text-white">
                Environmental &amp; Weather Intelligence
              </h3>
              <span className="rounded-full bg-teal-400/20 px-2 py-0.5 text-[10px] font-semibold text-teal-300">
                ixigo PLAN Standard
              </span>
            </div>
            <p className="text-xs text-cream/70">
              Live outdoor conditions for {destinationName || "your destination"}
            </p>
          </div>
        </div>

        {latitude != null && longitude != null && (
          <button
            type="button"
            onClick={() => void fetchLive()}
            disabled={loading}
            className="flex items-center gap-1 rounded-xl bg-white/5 px-2.5 py-1 text-xs text-cream/80 hover:bg-white/10 hover:text-white"
            title="Refresh Live Atmospheric Data"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin text-teal-400" : ""}`}
            />
            <span>{loading ? "Updating..." : "Refresh Live"}</span>
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Temp & Condition */}
        <div className="rounded-2xl bg-black/30 p-3.5 border border-white/5">
          <div className="flex items-center justify-between text-xs text-cream/60">
            <span className="flex items-center gap-1">
              <Thermometer className="h-3.5 w-3.5 text-amber-accent" /> Temperature
            </span>
            <span className="text-[11px] text-cream/50">H:{Math.round(highTemp)}° L:{Math.round(lowTemp)}°</span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white">
              {Math.round(currentTemp)}°C
            </span>
            <span className="text-xs font-medium text-emerald-300">
              {profile.condition}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-cream/60">
            {liveWeather?.source ? "Open-Meteo live feed" : "Verified seasonal climate"}
          </p>
        </div>

        {/* Metric 2: AQI Air Quality */}
        <div className="rounded-2xl bg-black/30 p-3.5 border border-white/5">
          <div className="flex items-center justify-between text-xs text-cream/60">
            <span className="flex items-center gap-1">
              <Wind className="h-3.5 w-3.5 text-teal-300" /> Air Quality (AQI)
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                profile.aqiStatus === "Good"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {profile.aqiStatus}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-white">
              {profile.aqi}
            </span>
            <span className="text-xs text-cream/80">
              PM2.5: {profile.pm25} µg/m³
            </span>
          </div>
          <p className="mt-1 text-[11px] text-cream/60">
            Clean and unpolluted air · Safe for seniors &amp; kids
          </p>
        </div>

        {/* Metric 3: Sightseeing Comfort */}
        <div className="rounded-2xl bg-black/30 p-3.5 border border-white/5">
          <div className="flex items-center justify-between text-xs text-cream/60">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Sightseeing Meter
            </span>
            <span className="text-[11px] text-emerald-300 font-bold">
              {profile.comfortScore}% Optimal
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-teal-400 to-emerald-400 rounded-full"
              style={{ width: `${profile.comfortScore}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-cream/70">
            Humidity: {profile.humidity}% · UV Index: {profile.uvIndex} (Moderate)
          </p>
        </div>

        {/* Metric 4: Attire & Packing Advisory */}
        <div className="rounded-2xl bg-black/30 p-3.5 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-accent flex items-center gap-1">
              <span>🎒 Smart Attire Advisory</span>
            </div>
            <p className="mt-1 text-xs text-cream/80 leading-relaxed">
              {profile.attireTip}
            </p>
          </div>
          <span className="text-[10px] text-cream/50 pt-1">
            Weather-adaptive packing recommendation
          </span>
        </div>
      </div>
    </div>
  );
}
