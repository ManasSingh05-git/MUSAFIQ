import { animate, useInView, useMotionValue, useTransform, motion } from "framer-motion";
import { AlertTriangle, Compass } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMotion } from "../lib/contexts";
import type { Destination } from "../lib/types";

export function Skeleton({ className = "h-24" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, text, action }: { title: string; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <Compass className="h-10 w-10 text-teal-muted" aria-hidden="true" />
      <h3 className="font-display text-xl">{title}</h3>
      <p className="max-w-md text-sm text-cream/70">{text}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="card flex flex-col items-center gap-3 border-coral-accent/40 px-6 py-10 text-center">
      <AlertTriangle className="h-9 w-9 text-coral-accent" aria-hidden="true" />
      <p className="max-w-md text-sm">{message}</p>
      {onRetry && <button className="btn-ghost" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Counter({ value, className = "" }: { value: number; className?: string }) {
  const { reducedMotion } = useMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toLocaleString("en-IN"));
  useEffect(() => {
    if (!inView) return;
    if (reducedMotion) { mv.set(value); return; }
    const c = animate(mv, value, { duration: 1.1, ease: "easeOut" });
    return () => c.stop();
  }, [inView, value, reducedMotion, mv]);
  return <motion.span ref={ref} className={className}>{rounded}</motion.span>;
}

export function Ring({ value, max, label, color = "#e9a24b" }: { value: number; max: number; label: string; color?: string }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-24 w-24">
        <svg viewBox="0 0 84 84" className="-rotate-90" aria-hidden="true">
          <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="9" />
          <motion.circle cx="42" cy="42" r={r} fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
            strokeDasharray={c} initial={{ strokeDashoffset: c }} animate={{ strokeDashoffset: c * (1 - pct) }}
            transition={{ duration: 1.1, ease: "easeOut" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-display text-2xl"><Counter value={value} /></div>
      </div>
      <span className="text-xs text-cream/70">{label}</span>
    </div>
  );
}

export function ConfirmDialog({ open, title, text, confirmLabel = "Delete", onConfirm, onCancel }: {
  open: boolean; title: string; text: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    btn.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onCancel(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="glass-strong w-full max-w-sm rounded-3xl p-6">
        <h3 className="font-display text-xl">{title}</h3>
        <p className="mt-2 text-sm text-cream/75">{text}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>Cancel</button>
          <button ref={btn} className="btn-danger" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/** Photo if /images/<slug>.jpg exists, otherwise a generated landscape illustration (never a broken image). */
export function DestinationImage({ dest, className = "", zoom = true }: { dest: Pick<Destination, "slug" | "name" | "categories" | "image_url">; className?: string; zoom?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [fallbackAttempted, setFallbackAttempted] = useState(false);
  const hue = [...dest.slug].reduce((a, c) => a + c.charCodeAt(0), 0) % 60;
  const mountain = dest.categories.includes("mountain");
  const beach = dest.categories.includes("beach");

  const fallbackUrl = mountain
    ? "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&auto=format&fit=crop&q=85"
    : beach
    ? "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&auto=format&fit=crop&q=85"
    : "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&auto=format&fit=crop&q=85";

  const currentSrc = !fallbackAttempted ? dest.image_url : fallbackUrl;

  const handleImgError = () => {
    if (!fallbackAttempted && dest.image_url.startsWith("/images/")) {
      setFallbackAttempted(true);
    } else {
      setFailed(true);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!failed && currentSrc ? (
        <img
          src={currentSrc}
          alt={dest.name}
          loading="lazy"
          onError={handleImgError}
          className={`h-full w-full object-cover ${zoom ? "transition duration-700 group-hover:scale-110" : ""}`}
        />
      ) : (
        <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className={`h-full w-full ${zoom ? "transition duration-700 group-hover:scale-110" : ""}`} role="img" aria-label={`${dest.name} illustration`}>
          <defs>
            <linearGradient id={`sky-${dest.slug}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={`hsl(${170 + hue} 35% 22%)`} />
              <stop offset="1" stopColor={`hsl(${30 + hue / 2} 60% 55%)`} />
            </linearGradient>
          </defs>
          <rect width="400" height="240" fill={`url(#sky-${dest.slug})`} />
          <circle cx="300" cy="70" r="26" fill="rgba(255,236,200,.85)" />
          {mountain ? (
            <>
              <path d="M0 190 L90 80 L150 150 L220 60 L330 190 Z" fill="#12302b" />
              <path d="M120 190 L230 100 L400 190 Z" fill="#0d211a" />
            </>
          ) : (
            <path d="M0 170 Q100 130 200 160 T400 150 V240 H0 Z" fill="#12302b" />
          )}
          {beach && <path d="M0 200 Q100 185 200 200 T400 195 V240 H0 Z" fill="rgba(95,143,139,.9)" />}
          <rect y="200" width="400" height="40" fill="#08140f" opacity=".55" />
        </svg>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-forest-950/80 via-transparent to-transparent" />
    </div>
  );
}

export function AttractionImage({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const fallback = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&auto=format&fit=crop&q=80";
  return (
    <div className={`relative overflow-hidden bg-forest-900 ${className}`}>
      <img
        src={(!failed && src) ? src : fallback}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition duration-500 hover:scale-105"
      />
    </div>
  );
}
