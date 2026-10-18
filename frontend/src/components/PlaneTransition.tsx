import { AnimatePresence, motion } from "framer-motion";
import { useMemo } from "react";
import { useMotion } from "../lib/contexts";

/**
 * Signature page transition (~1.1 s): page dims/blurs -> plane flies a curved path leaving a contrail ->
 * cloud wipe covers the screen (route changes underneath) -> clouds clear to reveal the new page.
 * Skipped entirely for prefers-reduced-motion or when the user disables it in Settings.
 */
function bezier(p0: [number, number], p1: [number, number], p2: [number, number], t: number): [number, number] {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
}

export function PlaneTransition() {
  const { flying, flightKey } = useMotion();
  const geo = useMemo(() => {
    const W = typeof window !== "undefined" ? window.innerWidth : 1200;
    const H = typeof window !== "undefined" ? window.innerHeight : 800;
    const p0: [number, number] = [-140, H * 0.78];
    const p1: [number, number] = [W * 0.5, -H * 0.1];
    const p2: [number, number] = [W + 140, H * 0.25];
    const N = 28;
    const pts = Array.from({ length: N + 1 }, (_, i) => bezier(p0, p1, p2, i / N));
    const rot = pts.map((p, i) => {
      const q = pts[Math.min(i + 1, N)], r = pts[Math.max(i - 1, 0)];
      return (Math.atan2(q[1] - r[1], q[0] - r[0]) * 180) / Math.PI;
    });
    return { W, H, x: pts.map((p) => p[0]), y: pts.map((p) => p[1]), rot, path: `M ${p0[0]} ${p0[1]} Q ${p1[0]} ${p1[1]} ${p2[0]} ${p2[1]}` };
    // recompute per flight so a resized window is respected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flightKey]);

  const dur = 1.0;
  return (
    <AnimatePresence>
      {flying && (
        <motion.div key={flightKey} className="pointer-events-auto fixed inset-0 z-[120] overflow-hidden" aria-hidden="true"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
          {/* dim + blur the old page */}
          <motion.div className="absolute inset-0 bg-forest-950/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }} transition={{ duration: dur, times: [0, 0.2, 0.7, 1] }} />
          {/* sky + cloud wipe */}
          <motion.div className="absolute inset-0"
            style={{ background: "linear-gradient(180deg,#3d6f78 0%,#9cc3c4 55%,#f1ede4 100%)" }}
            initial={{ clipPath: "circle(0% at 15% 80%)" }}
            animate={{ clipPath: ["circle(0% at 15% 80%)", "circle(150% at 50% 50%)", "circle(150% at 50% 50%)", "circle(0% at 85% 25%)"] }}
            transition={{ duration: dur, times: [0, 0.45, 0.58, 1], ease: "easeInOut" }} />
          {[10, 35, 62, 82].map((left, i) => (
            <motion.div key={left} className="absolute h-40 w-72 rounded-full bg-white/80 blur-2xl"
              style={{ left: `${left}%`, top: `${15 + ((i * 23) % 60)}%` }}
              initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: [0, 0.9, 0.9, 0], scale: [0.6, 1.1, 1.1, 1.4] }}
              transition={{ duration: dur, times: [0, 0.4, 0.6, 1] }} />
          ))}
          {/* contrail / route line */}
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${geo.W} ${geo.H}`}>
            <motion.path d={geo.path} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }} transition={{ duration: dur, times: [0, 0.8, 1] }} />
          </svg>
          {/* plane */}
          <motion.div className="absolute left-0 top-0" style={{ marginLeft: -28, marginTop: -28 }}
            initial={{ x: geo.x[0], y: geo.y[0], rotate: geo.rot[0] }}
            animate={{ x: geo.x, y: geo.y, rotate: geo.rot }} transition={{ duration: dur, ease: [0.45, 0, 0.7, 1] }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="#f1ede4" stroke="#0d211a" strokeWidth="0.6" style={{ filter: "drop-shadow(0 6px 8px rgba(0,0,0,.35))" }}>
              <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" transform="rotate(90 12 12)" />
            </svg>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
