import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

export interface MapPoint {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  selected?: boolean;
  order?: number; // shown in the marker for itinerary stops
}

function icon(p: MapPoint): L.DivIcon {
  const inner = p.order
    ? `<div style="position:absolute;inset:-4px;display:flex;align-items:center;justify-content:center;border-radius:9999px;background:#e9a24b;border:2px solid #08140f;color:#08140f;font:700 11px system-ui">${p.order}</div>`
    : `<span class="ring"></span><span class="dot"></span>`;
  return L.divIcon({ className: "", html: `<div class="tp-marker ${p.selected ? "sel" : ""}">${inner}</div>`, iconSize: [18, 18], iconAnchor: [9, 9] });
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) { map.setView([points[0].lat, points[0].lng], 11); return; }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [40, 40], maxZoom: 13 });
  }, [points, map]);
  return null;
}

/**
 * OpenStreetMap map. Only real coordinates are accepted (callers filter out missing ones).
 * If tiles fail to load the user sees a clear notice; markers and the route line still render.
 */
export function MapView({ points, route = false, onSelect, className = "h-96", fit = true }: {
  points: MapPoint[]; route?: boolean; onSelect?: (p: MapPoint) => void; className?: string; fit?: boolean;
}) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const valid = useMemo(() => points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)), [points]);
  const center: [number, number] = valid.length ? [valid[0].lat, valid[0].lng] : [20.5, 78.9];
  const icons = useMemo(() => new Map(valid.map((p) => [p.id, icon(p)])), [valid]);

  return (
    <div className={`tp-dark-tiles relative overflow-hidden rounded-3xl border border-white/10 ${className}`}>
      <MapContainer center={center} zoom={valid.length ? 6 : 4} scrollWheelZoom className="h-full w-full" aria-label="Interactive map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setTilesFailed(true), tileload: () => setTilesFailed(false) }}
        />
        {fit && <FitBounds points={valid} />}
        {route && valid.length > 1 && (
          <Polyline positions={valid.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#e9a24b", weight: 3, dashArray: "6 8" }} />
        )}
        {valid.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]} icon={icons.get(p.id)} eventHandlers={{ click: () => onSelect?.(p) }}>
            <Popup><strong>{p.title}</strong>{p.subtitle ? <><br />{p.subtitle}</> : null}</Popup>
          </Marker>
        ))}
      </MapContainer>
      {tilesFailed && (
        <div role="alert" className="glass-strong absolute left-3 right-3 top-3 z-[500] rounded-xl px-3 py-2 text-xs">
          Map tiles could not be loaded (offline or blocked). Pins and the route are still shown; use the list view for details.
        </div>
      )}
    </div>
  );
}
